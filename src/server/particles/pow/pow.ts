import { tex } from 'resource_id';
import { ZERO_V } from 'utils/math';

export const PowParticle = {
  create,
  createBlocked,
};

const expirationTime = 0.2;

const baseDef: Omit<ParticleDefinition, 'pos' | 'velocity' | 'texture'> = {
  acceleration: ZERO_V,
  expirationtime: expirationTime * (7 / 8),
  size: 10,
  collisiondetection: false,
  collision_removal: false,
  object_collision: false,
  vertical: false,
  animation: {
    type: 'vertical_frames',
    aspect_w: 16,
    aspect_h: 16,
    length: expirationTime,
  },
  glow: 14,
};

function create(position: Vector3D, velocity: Vector3D): ParticleDefinition {
  return {
    ...baseDef,
    texture: tex('pow.png'),
    pos: position,
    velocity: velocity,
  };
}

function createBlocked(position: Vector3D): ParticleDefinition {
  return {
    ...baseDef,
    texture: tex('blocked_pow.png'),
    pos: position,
    velocity: ZERO_V,
  };
}
