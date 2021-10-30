import { Entity } from 'server/entity/entity';
import { Locomotion } from 'server/entity/locomotion/locomotion';

// aka noop
export const BallisticLocomotion = {
  create,
};

function create(): Locomotion {
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
    ): void => {},
  };
}
