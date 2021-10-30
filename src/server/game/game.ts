import { ColonyAI } from 'server/ai/colony/colony_ai';
import {
  BlockDefinition,
  BlockProperties,
  BlockRefInstance,
} from 'server/block/block';
import { BlockManager } from 'server/block/block_manager';
import { BlockPhysicsEngine } from 'server/block/block_physics_engine';
import { CoreCrystalDef } from 'server/block/core_crystal/def';
import {
  EntityDefinition,
  EntityInstance,
  LuaEntityCustomProperties,
} from 'server/entity/entity';
import { EntityStore } from 'server/entity/entity_store';
import { GameContext } from 'server/game/context';
import { Director } from 'server/game/director';
import {
  AddPlayerEvent,
  LoadStageHomeEvent,
  RemovePlayerEvent,
  UpdateResourcesEvent,
} from 'server/game/events';
import { Resource, ResourceType } from 'server/game/resources';
import { ResourceChangeParticle } from 'server/particles/resource_change/resource_change';
import { RemotePlayer } from 'server/player/remote_player';
import { Stage } from 'server/world/stage';
import { World, WorldData } from 'server/world/world';
import { throwError } from 'utils/error';
import { EventBus } from 'utils/event_bus';
import { Logger } from 'utils/logger';
import { Volume } from 'utils/space';
import { IntervalTimer } from 'utils/timer';

export type GameData = {
  gameInitialized: boolean;
  stageInitialized: boolean;
  world: WorldData;
  resources: Record<ResourceType, number>;
};

/**
 * Coordinates game elements together.
 */
export class Game implements GameContext {
  readonly events = new EventBus();

  readonly players = new Set<RemotePlayer>();
  readonly blockPhysics: BlockPhysicsEngine;

  private readonly director = new Director(this);

  resources: Record<ResourceType, number> = {
    [ResourceType.Wood]: 0,
    [ResourceType.Stone]: 0,
    [ResourceType.Metal]: 0,
    [ResourceType.Spore]: 0,
  };

  private gameInitialized: boolean = false;
  private stageInitialized: boolean = false;

  private endConditionTimer = new IntervalTimer(1);

  constructor(
    readonly world: World,
    readonly blockManager: BlockManager,
    readonly entityStore: EntityStore,
    private readonly colonyAI: ColonyAI
  ) {
    this.blockPhysics = new BlockPhysicsEngine(blockManager);

    this.events.onFor(LoadStageHomeEvent, this, (event) => {
      if (!this.stageInitialized) {
        this.initStage(event.stage);
        this.stageInitialized = true;
      }
    });
  }

  onInit() {
    if (!this.gameInitialized) {
      this.gameInitialized = true;
      Logger.info('Game start!');
      this.nextStage();
    }
  }

  getDirector(): Director {
    return this.director;
  }

  getStageNumber(): number {
    return this.world.getStageNumber();
  }

  getStageBounds(): Volume {
    return this.world.getStageBounds();
  }

  nextStage() {
    this.stageInitialized = false;
    this.entityStore.clear();
    this.director.reset();
    this.world.nextStage();
    minetest.chat_send_all('Loading next stage!');
  }

  private initStage(stage: Stage) {
    const spawnPos = this.getSpawnPosition();

    for (const player of this.players) {
      if (!stage.bounds.containsPoint(player.playerObj.get_pos())) {
        player.playerObj.set_pos(spawnPos);
      }
    }

    this.director.init();
  }

  getHomePosition(): Vector3D {
    return this.world.getHomePosition();
  }

  getSpawnPosition(): Vector3D {
    return vector.add(this.getHomePosition(), { x: 0, y: 1, z: 0 });
  }

  load(data: GameData) {
    this.gameInitialized = data.gameInitialized;
    this.stageInitialized = data.stageInitialized;

    this.world.load(data.world);
    this.resources = data.resources;

    this.events.emit(new UpdateResourcesEvent(this.resources));
  }

  save(): GameData {
    return {
      gameInitialized: this.gameInitialized,
      stageInitialized: this.stageInitialized,
      world: this.world.save(),
      resources: this.resources,
    };
  }

  update(dt: number) {
    this.entityStore.onStep(dt);
    this.director.update(dt);
    this.colonyAI.update(dt);

    if (this.endConditionTimer.updateAndCheck(dt)) {
      this.checkEndCondition();
    }
  }

  private checkEndCondition() {
    if (!this.stageInitialized) return;

    const homePos = this.getHomePosition();
    const { name: homeNodeName } = minetest.get_node(homePos);

    if (
      homeNodeName !== 'ignore' &&
      this.blockManager.getDefByNodeName(homeNodeName) !== CoreCrystalDef
    ) {
      Logger.info('Game over!');
      minetest.chat_send_all('Crystal destroyed! Game over!');
      this.nextStage();
    }
  }

  addResource(resource: Resource, source?: Vector3D): void {
    this.resources[resource.type] += resource.amount;
    this.events.emit(new UpdateResourcesEvent(this.resources));
    if (source) {
      minetest.add_particle(ResourceChangeParticle.create(resource, source));
    }
  }

  subtractResource(resource: Resource, source?: Vector3D): void {
    this.addResource(
      {
        type: resource.type,
        amount: -resource.amount,
      },
      source
    );
  }

  setResources(resources: Record<ResourceType, number>): void {
    Object.assign(this.resources, resources);
    this.events.emit(new UpdateResourcesEvent(this.resources));
  }

  getResource(type: ResourceType): number {
    return this.resources[type];
  }

  hasResource(resource: Resource): boolean {
    return this.resources[resource.type] >= resource.amount;
  }

  setBlock<D extends BlockDefinition<BlockProperties>>(
    definition: D,
    pos: Vector3D
  ): BlockRefInstance<D> {
    const oldRef = this.blockManager.getRef(pos);
    oldRef?.remove();

    const ref = this.blockManager.createRef(definition, pos);
    ref.initializeNode();
    ref.coreActivate();

    return ref as BlockRefInstance<D>;
  }

  createEntity<D extends EntityDefinition>(
    definition: D,
    pos: Vector3D
  ): EntityInstance<D> {
    const objRef = minetest.add_entity(
      pos,
      definition.registeredName
    ) as LuaEntitySAO<LuaEntityCustomProperties<EntityInstance<D>>>;
    const entity = objRef.get_luaentity()._entity;
    Logger.trace('Created entity', definition.name, pos, entity);
    if (entity === 'unset') {
      throwError('Missing Entity instance!');
    }
    return entity;
  }

  addPlayer(player: RemotePlayer, newPlayer: boolean) {
    this.players.add(player);

    const spawnPos = this.getSpawnPosition();
    const bounds = this.world.getStageBounds();
    if (
      newPlayer ||
      (bounds && !bounds.containsPoint(player.playerObj.get_pos()))
    ) {
      player.playerObj.set_pos(spawnPos);
    }

    this.events.emit(new AddPlayerEvent(player));
  }

  removePlayer(player: RemotePlayer) {
    this.players.delete(player);

    this.events.emit(new RemovePlayerEvent(player));
  }

  findPlayerByName(name: string): RemotePlayer | undefined {
    for (const player of this.players) {
      if (player.name === name) return player;
    }
    return undefined;
  }

  findPlayerByObjRef(objRef: ObjectRef): RemotePlayer | undefined {
    for (const player of this.players) {
      if (player.playerObj === objRef) return player;
    }
    return undefined;
  }

  waitUntilMapLoaded(...args: any[]): void {
    return this.world.waitUntilMapLoaded(
      ...(args as Parameters<World['waitUntilMapLoaded']>)
    );
  }
}
