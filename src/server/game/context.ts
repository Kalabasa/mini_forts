import { BlockDefinition, BlockRefInstance } from 'server/block/block';
import { BlockManager } from 'server/block/block_manager';
import { BlockPhysicsEngine } from 'server/block/block_physics_engine';
import { EntityDefinition, EntityInstance } from 'server/entity/entity';
import { EntityStore } from 'server/entity/entity_store';
import { Director } from 'server/game/director';
import { Resource, ResourceType } from 'server/game/resources';
import { EventBus } from 'utils/event_bus';
import { Volume } from 'utils/space';

export interface GameContext extends ReadonlyGameContext {
  readonly entityStore: EntityStore;
  readonly blockManager: BlockManager;
  readonly blockPhysics: BlockPhysicsEngine;
  getDirector(): Director;
  addResource(resource: Resource, source?: Vector3D): void;
  subtractResource(resource: Resource, source?: Vector3D): void;
  setBlock<D extends BlockDefinition>(
    definition: D,
    pos: Vector3D
  ): BlockRefInstance<D>;
  createEntity<D extends EntityDefinition>(
    definition: D,
    pos: Vector3D
  ): EntityInstance<D>;
  // createAlert<T extends Alert>(type: { new (): T }, pos: Vector3D): T;
}

export interface ReadonlyGameContext {
  readonly events: EventBus;
  getStageNumber(): number;
  getStageBounds(): Volume;
  getHomePosition(): Vector3D;
  getResource(type: ResourceType): number;
  hasResource(resource: Resource): boolean;
  waitUntilMapLoaded(position: Vector3D, callback: Function): void;
  waitUntilMapLoaded(callback: Function): void;
}

export class ReadonlyGameContextDelegate {
  private host: ReadonlyGameContext;
  setHost(context: ReadonlyGameContext): void {
    this.host = context;

    for (const prop of Object.keys(context.constructor.prototype)) {
      (this as any)[prop] = function (this: any, ...args: any[]): any {
        return (context as any)[prop](...args);
      };
    }
  }

  asContext(): ReadonlyGameContext {
    return this as unknown as ReadonlyGameContext;
  }

  get events(): EventBus {
    return this.host.events;
  }
}
