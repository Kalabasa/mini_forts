import { ReadonlyGameContext } from 'server/game/context';
import {
  CompleteStageLoadEvent,
  LoadMapChunkEvent,
  LoadStageHomeEvent,
  StartStageLoadEvent,
} from 'server/game/events';
import { throwError } from 'utils/error';
import { Logger } from 'utils/logger';
import { Volume } from 'utils/space';
import { BiomeType, Stage, StageData } from 'server/world/stage';
import { ForestStage } from 'server/world/stages/forest_stage';
import { Barrier } from 'server/world/barrier';

const biomeStageTypes = {
  [BiomeType.Forest]: ForestStage,
} as const;

export type WorldData = {
  stage: StageData | undefined;
  stageCount: number;
};

const tempBuffer: number[] = [];

// Loads the map and coordinates stages and mapgen
export class World {
  private context: ReadonlyGameContext;

  private activeStage: Stage | undefined = undefined;
  private stageCount: number = 0;

  private forceloads: Vector3D[] = [];
  private homeLoaded: boolean = false;
  private fullMapLoaded: boolean = false;
  private mapLoadCallbacks = new Set<{ pos: Vector3D; func: Function }>();
  private fullMapLoadCallbacks: Function[] = [];

  setContext(context: ReadonlyGameContext): void {
    this.context = context;
    this.context.events.onFor(
      LoadMapChunkEvent,
      context,
      this.onLoadMapChunk as any
    );
  }

  load(data: WorldData) {
    if (data.stage) {
      this.activeStage = Stage.create({
        data: data.stage,
        implMap: biomeStageTypes,
      });
    } else {
      this.activeStage = undefined;
    }
    this.stageCount = data.stageCount;

    if (this.activeStage) {
      this.loadStage(this.activeStage, 3);
    }
  }

  save(): WorldData {
    return {
      stage: this.activeStage?.save(),
      stageCount: this.stageCount,
    };
  }

  getStageBounds(): Volume {
    if (!this.activeStage) throwError('No active stage!');
    return this.activeStage.bounds;
  }

  getStageNumber(): number {
    if (!this.activeStage) throwError('No active stage!');
    return this.stageCount;
  }

  nextStage(): Stage {
    Logger.info('World: Next stage!');

    minetest.clear_objects({ mode: 'full' });

    for (const pos of this.forceloads) {
      minetest.forceload_free_block(pos, true);
    }
    this.forceloads = [];
    Logger.info('World: All forceloads freed');

    this.activeStage = Stage.create({
      index: this.stageCount++,
      biome: BiomeType.Forest,
      impl: ForestStage,
    });

    const bounds = this.activeStage.bounds;
    minetest.delete_area(bounds.min, bounds.max);

    this.loadStage(this.activeStage, 6);

    return this.activeStage;
  }

  private loadStage(stage: Stage, delay: number) {
    this.homeLoaded = false;
    this.fullMapLoaded = false;
    this.forceloads = [];
    this.mapLoadCallbacks.clear();
    this.fullMapLoadCallbacks = [];

    this.context.events.emit(new StartStageLoadEvent());

    const bounds = stage.bounds;

    minetest.after(delay, () => {
      if (this.activeStage !== stage) return;

      minetest.emerge_area(
        bounds.min,
        bounds.max,
        (blockPos, action, callsRemaining) =>
          minetest.after(0, () =>
            this.onEmergeBlock(stage, blockPos, action, callsRemaining)
          )
      );
    });
  }

  private onEmergeBlock(
    stage: Stage,
    blockPos: Vector3D,
    action: EmergeAreaAction,
    pendingBlocks: number
  ) {
    if (!this.activeStage || this.activeStage !== stage) return;

    const pos = vector.multiply(blockPos, 16);

    if (minetest.forceload_block(pos, true)) {
      this.forceloads.push(pos);
    } else {
      Logger.warning('World: Failed to forceload:', pos);
    }

    if (action === minetest.EMERGE_ERRORED) {
      throwError('Error loading block at pos:' + pos);
    }

    const volume = new Volume(pos, vector.add(pos, 15));

    for (const callback of this.mapLoadCallbacks) {
      if (volume.containsPoint(callback.pos)) {
        this.mapLoadCallbacks.delete(callback);
        callback.func();
      }
    }

    if (!this.homeLoaded && volume.containsPoint(this.getHomePosition())) {
      this.homeLoaded = true;
      this.context.events.emit(new LoadStageHomeEvent(this.activeStage));
    }

    if (pendingBlocks === 0) {
      for (const callback of this.fullMapLoadCallbacks) {
        callback();
      }
      this.fullMapLoadCallbacks = [];
      this.fullMapLoaded = true;
      this.context.events.emit(new CompleteStageLoadEvent(this.activeStage));
    }
  }

  /** @noSelf */
  private onLoadMapChunk = (event: LoadMapChunkEvent) => {
    if (
      this.activeStage &&
      !this.homeLoaded &&
      event.volume.containsPoint(this.getHomePosition())
    ) {
      this.homeLoaded = true;
      this.context.events.emit(new LoadStageHomeEvent(this.activeStage));
    }
  };

  waitUntilMapLoaded(callback: Function): void;
  waitUntilMapLoaded(position: Vector3D, callback: Function): void;
  waitUntilMapLoaded(
    positionOrCallback: Vector3D | Function,
    maybeCallback?: Function
  ): void {
    if (typeof positionOrCallback === 'function') {
      const callback = positionOrCallback;

      if (this.fullMapLoaded) {
        callback();
      } else {
        this.fullMapLoadCallbacks.push(callback);
      }
    } else {
      const position = positionOrCallback;
      const callback = maybeCallback!;

      const node = minetest.get_node_or_nil(position);
      if (node) {
        callback();
      } else {
        this.mapLoadCallbacks.add({ pos: position, func: callback });
      }
    }
  }

  generateMap(minp: Vector3D, maxp: Vector3D) {
    const [vm, emergeMin, emergeMax] = minetest.get_mapgen_object('voxelmanip');
    const data = vm.get_data(tempBuffer);
    const dataVolume = new Volume(emergeMin, emergeMax);

    const stageBounds = this.activeStage?.bounds;
    dataVolume.forEach((pos, i) => {
      if (
        stageBounds == undefined ||
        !stageBounds.contains(pos.x, pos.y, pos.z)
      ) {
        data[i] = Barrier.nodeID;
      }
    });

    if (this.activeStage) {
      const stageBounds = this.activeStage.bounds;
      const stageMinp = {
        x: Math.max(minp.x, stageBounds.min.x),
        y: Math.max(minp.y, stageBounds.min.y),
        z: Math.max(minp.z, stageBounds.min.z),
      };

      const stageMaxp = {
        x: Math.min(maxp.x, stageBounds.max.x),
        y: Math.min(maxp.y, stageBounds.max.y),
        z: Math.min(maxp.z, stageBounds.max.z),
      };

      if (
        stageMinp.x <= stageMaxp.x &&
        stageMinp.y <= stageMaxp.y &&
        stageMinp.z <= stageMaxp.z
      ) {
        const stageSlice = new Volume(stageMinp, stageMaxp);
        this.activeStage.generateMap({
          data,
          dataVolume,
          stageSlice,
        });
      }
    }

    vm.set_data(data);
    vm.write_to_map();
  }

  getHomePosition(): Vector3D {
    return this.activeStage
      ? this.activeStage.getHomePosition()
      : vector.new(-30000, -30000, -30000);
  }
}
