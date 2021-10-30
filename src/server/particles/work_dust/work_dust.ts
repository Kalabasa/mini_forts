import { tex } from 'resource_id';
import { ZERO_V } from 'utils/math';

export const WorkDustParticle = {
  create,
  createSmall,
};

const expirationTime = 0.4;

const baseDef: Omit<ParticleDefinition, 'pos' | 'velocity' | 'size'> = {
  acceleration: ZERO_V,
  expirationtime: expirationTime * (7 / 8),
  collisiondetection: false,
  collision_removal: false,
  object_collision: false,
  vertical: false,
  texture: tex('work_dust.png'),
  animation: {
    type: 'vertical_frames',
    aspect_w: 16,
    aspect_h: 16,
    length: expirationTime,
  },
  glow: 10,
};

function create(position: Vector3D): ParticleDefinition {
  return {
    ...baseDef,
    pos: position,
    velocity: ZERO_V,
    size: 12,
  };
}

function createSmall(
  position: Vector3D,
  velocity: Vector3D
): ParticleDefinition {
  return {
    ...baseDef,
    pos: position,
    velocity: velocity,
    size: 8,
  };
}
