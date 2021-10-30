import { Entity, EntityProperties, EntityScript } from 'server/entity/entity';
import { BallisticLocomotion } from 'server/entity/locomotion/ballistic';

export type ProjectileHit = {
  velocity: Vector3D;
  entity?: Entity;
  nodePosition?: Vector3D;
};

export abstract class ProjectileEntityProperties extends EntityProperties {
  override readonly locomotion = BallisticLocomotion.create();
}

export type ProjectileEntity = ProjectileEntityScript;

export abstract class ProjectileEntityScript<
  P extends ProjectileEntityProperties = ProjectileEntityProperties
> extends EntityScript<P> {
  override coreUpdate(dt: number, moveResult: CollisionInfo) {
    super.coreUpdate(dt, moveResult);

    if (moveResult.collides) {
      for (const collision of moveResult.collisions) {
        const velocity = collision.old_velocity;
        if (collision.type === 'object') {
          const entity = EntityScript.fromObjRef(collision.object);
          if (entity) {
            if (this.onHit({ entity, velocity })) break;
          }
        } else {
          if (this.onHit({ nodePosition: collision.node_pos, velocity })) break;
        }
      }
    }
  }

  // return true to stop further collision processing
  abstract onHit(hit: ProjectileHit): boolean;
}
