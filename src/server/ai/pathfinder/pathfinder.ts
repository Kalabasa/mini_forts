import { DebugNavMap } from 'server/ai/pathfinder/debug_nav_map';
import { DebugPath } from 'server/ai/pathfinder/debug_path';
import { NavMap } from 'server/ai/pathfinder/nav_map';
import { FindPath, NoopPath, Path } from 'server/ai/pathfinder/path';
import { Locomotion } from 'server/entity/locomotion/locomotion';
import { ReadonlyGameContext } from 'server/game/context';
import {
  AddBlockEvent,
  CompleteStageLoadEvent,
  LoadMapChunkEvent,
  RemoveBlockEvent,
  StartStageLoadEvent,
} from 'server/game/events';
import { CONFIG } from 'utils/config';
import { Logger } from 'utils/logger';

// Actual pathfinder algorithm is in Path class

export class Pathfinder {
  private readonly navMap: NavMap;

  private constructor(
    context: ReadonlyGameContext,
    readonly locomotion: Locomotion
  ) {
    this.navMap = createNavMap(locomotion);

    context.events.onFor(StartStageLoadEvent, this, () => {
      this.navMap.reset();
    });

    context.events.onFor(LoadMapChunkEvent, this, (event) => {
      this.navMap.invalidateRegion(event.volume.min, event.volume.max);
    });

    context.events.onFor(AddBlockEvent, this, (event) => {
      this.navMap.invalidateRegion(
        vector.subtract(event.position, 1),
        vector.add(event.position, 1)
      );
    });

    context.events.onFor(RemoveBlockEvent, this, (event) => {
      this.navMap.invalidateRegion(
        vector.subtract(event.position, 1),
        vector.add(event.position, 1)
      );
    });
  }

  findPath(source: Vector3D, destination: Vector3D): Path {
    return createPath(source, [destination], this.locomotion, this.navMap);
  }

  findAnyPath(source: Vector3D, destinations: Vector3D[]): Path {
    return createPath(source, destinations, this.locomotion, this.navMap);
  }

  private static instances = new Map<string, Pathfinder>();

  static get(context: ReadonlyGameContext, locomotion: Locomotion): Pathfinder {
    const id = locomotion.pathfinderID;

    const instance = this.instances.get(id);
    if (instance) return instance;

    const newInstance = new Pathfinder(context, locomotion);
    this.instances.set(id, newInstance);
    return newInstance;
  }
}

const createNavMap = CONFIG.isProd
  ? (...params: ConstructorParameters<typeof NavMap>) => new NavMap(...params)
  : (...params: ConstructorParameters<typeof NavMap>) =>
      DebugNavMap.create(params[0].pathfinderID, ...params);

const createPath = CONFIG.isProd
  ? (...params: ConstructorParameters<typeof FindPath>) =>
      new FindPath(...params)
  : (...params: ConstructorParameters<typeof FindPath>) =>
      DebugPath.create(params[2].pathfinderID, ...params);
