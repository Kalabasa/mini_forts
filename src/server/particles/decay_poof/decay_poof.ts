import { tex } from 'resource_id';

export const DecayPoofParticle = {
  create,
  createForEnemy,
};

const expirationTime = 0.6;

const baseDef: Omit<ParticleDefinition, 'pos' | 'velocity' | 'texture'> = {
  acceleration: { x: 0, y: 1, z: 0 },
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
    texture: tex('decay_poof.png'),
    pos: position,
    velocity: velocity,
  };
}

function createForEnemy(
  position: Vector3D,
  velocity: Vector3D
): ParticleDefinition {
  return {
    ...baseDef,
    texture: tex('enemy_decay_poof.png'),
    pos: position,
    velocity: velocity,
  };
}
