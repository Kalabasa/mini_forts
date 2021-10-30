import { Entity } from 'server/entity/entity';
import { Locomotion } from 'server/entity/locomotion/locomotion';

export const MissileLocomotion = {
  create,
};

function create({ speed }: { speed: number }): Locomotion {
  return {
    pathfinderID: '',
    adjacentNodes: [],
    moveCost: () => 0,
    update: (
      dt: number,
      entity: Entity,
      collisionInfo: CollisionInfo,
      prevCollisionInfo: CollisionInfo,
      targetLocation: Vector3D | undefined
    ): void => {
      if (!targetLocation) return;

      const dir = vector.direction(entity.objRef.get_pos(), targetLocation);

      entity.objRef.set_velocity(vector.multiply(dir, speed));
    },
  };
}
