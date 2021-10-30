import { tex } from 'resource_id';
import { ZERO_V } from 'utils/math';

export const SiegeDustParticle = {
  create,
};

const expirationTime = 0.8;

const baseDef: Omit<ParticleSpawnerDefinition, 'amount' | 'minpos' | 'maxpos'> =
  {
    time: 0.8,
    minacc: ZERO_V,
    maxacc: ZERO_V,
    minvel: ZERO_V,
    maxvel: ZERO_V,
    minexptime: expirationTime * (7 / 8),
    maxexptime: expirationTime * (7 / 8),
    minsize: 10,
    maxsize: 10,
    collisiondetection: false,
    collision_removal: false,
    object_collision: false,
    vertical: true,
    texture: tex('siege_dust.png'),
    animation: {
      type: 'vertical_frames',
      aspect_w: 16,
      aspect_h: 16,
      length: expirationTime,
    },
    glow: 14,
  };

function create(
  amount: number,
  p1: Vector3D,
  p2: Vector3D
): ParticleSpawnerDefinition {
  return {
    ...baseDef,
    amount,
    minpos: p1,
    maxpos: p2,
  };
}
