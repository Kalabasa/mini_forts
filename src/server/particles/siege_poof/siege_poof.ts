import { tex } from 'resource_id';
import { ZERO_V } from 'utils/math';

export const SiegePoofParticle = {
  create,
};

const expirationTime = 0.4;

function create(position: Vector3D): ParticleDefinition {
  return {
    pos: position,
    velocity: ZERO_V,
    size: 14,
    acceleration: ZERO_V,
    expirationtime: expirationTime * (7 / 8),
    collisiondetection: false,
    collision_removal: false,
    object_collision: false,
    vertical: false,
    texture: tex('siege_poof.png'),
    animation: {
      type: 'vertical_frames',
      aspect_w: 16,
      aspect_h: 16,
      length: expirationTime,
    },
    glow: 14,
  };
}
