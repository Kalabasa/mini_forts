import { tex } from 'resource_id';
import { ZERO_V } from 'utils/math';

export const DustParticle = {
  create,
};

function create(
  position: Vector3D,
  expirationTime: number = 0.4,
  velocity: Vector3D = ZERO_V,
  acceleration: Vector3D = vector.multiply(velocity, -1 / expirationTime)
): ParticleDefinition {
  return {
    pos: position,
    velocity,
    acceleration,
    size: 0.6666,
    expirationtime: expirationTime,
    collisiondetection: false,
    collision_removal: false,
    object_collision: false,
    vertical: false,
    texture: tex('dust.png'),
  };
}
