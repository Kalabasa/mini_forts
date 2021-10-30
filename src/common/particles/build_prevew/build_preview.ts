import { Player } from 'common/player/player';
import { Immutable } from 'utils/immutable';
import { clamp, ZERO_V } from 'utils/math';

// https://github.com/minetest/minetest/issues/10593

// todo: sync with fps
export const previewTTL = 0.03334;

export const BuildPreviewParticle = {
  addBox, // todo: persistent box that can be moved, instead of having to addBox every tick
  createParticle,
};

function addBox(
  player: Player,
  base: ReturnType<typeof createParticle>,
  ttl: number,
  corner1: Vector3D,
  corner2: Vector3D
) {
  const min = {
    x: Math.min(corner1.x, corner2.x) - 0.5,
    y: Math.min(corner1.y, corner2.y) - 0.5,
    z: Math.min(corner1.z, corner2.z) - 0.5,
  };
  const max = {
    x: Math.max(corner1.x, corner2.x) + 0.5,
    y: Math.max(corner1.y, corner2.y) + 0.5,
    z: Math.max(corner1.z, corner2.z) + 0.5,
  };
  let pos = vector.new(0, 0, 0);

  pos.x = max.x;
  pos.y = max.y;
  pos.z = max.z;
  minetest.add_particle(useMarkerParticle(base, pos, ttl));

  const eyePos = player.getEyePosition();
  const lookDir = player.getLookDir();

  pos.y = min.y;
  pos.z = min.z;
  for (
    pos.x = min.x;
    pos.x <= max.x;
    pos.x += getIncrement(pos, 'x', eyePos, lookDir)
  ) {
    minetest.add_particle(useMarkerParticle(base, pos, ttl));
  }

  pos.y = max.y;
  pos.z = min.z;
  for (
    pos.x = min.x;
    pos.x <= max.x;
    pos.x += getIncrement(pos, 'x', eyePos, lookDir)
  ) {
    minetest.add_particle(useMarkerParticle(base, pos, ttl));
  }

  pos.y = min.y;
  pos.z = max.z;
  for (
    pos.x = min.x;
    pos.x <= max.x;
    pos.x += getIncrement(pos, 'x', eyePos, lookDir)
  ) {
    minetest.add_particle(useMarkerParticle(base, pos, ttl));
  }

  pos.y = max.y;
  pos.z = max.z;
  for (
    pos.x = min.x;
    pos.x <= max.x;
    pos.x += getIncrement(pos, 'x', eyePos, lookDir)
  ) {
    minetest.add_particle(useMarkerParticle(base, pos, ttl));
  }

  pos.x = min.x;
  pos.z = min.z;
  for (
    pos.y = min.y;
    pos.y <= max.y;
    pos.y += getIncrement(pos, 'y', eyePos, lookDir)
  ) {
    minetest.add_particle(useMarkerParticle(base, pos, ttl));
  }

  pos.x = max.x;
  pos.z = min.z;
  for (
    pos.y = min.y;
    pos.y <= max.y;
    pos.y += getIncrement(pos, 'y', eyePos, lookDir)
  ) {
    minetest.add_particle(useMarkerParticle(base, pos, ttl));
  }

  pos.x = min.x;
  pos.z = max.z;
  for (
    pos.y = min.y;
    pos.y <= max.y;
    pos.y += getIncrement(pos, 'y', eyePos, lookDir)
  ) {
    minetest.add_particle(useMarkerParticle(base, pos, ttl));
  }
  pos.x = max.x;
  pos.z = max.z;

  for (
    pos.y = min.y;
    pos.y <= max.y;
    pos.y += getIncrement(pos, 'y', eyePos, lookDir)
  ) {
    minetest.add_particle(useMarkerParticle(base, pos, ttl));
  }

  pos.x = min.x;
  pos.y = min.y;
  for (
    pos.z = min.z;
    pos.z <= max.z;
    pos.z += getIncrement(pos, 'z', eyePos, lookDir)
  ) {
    minetest.add_particle(useMarkerParticle(base, pos, ttl));
  }

  pos.x = max.x;
  pos.y = min.y;
  for (
    pos.z = min.z;
    pos.z <= max.z;
    pos.z += getIncrement(pos, 'z', eyePos, lookDir)
  ) {
    minetest.add_particle(useMarkerParticle(base, pos, ttl));
  }

  pos.x = min.x;
  pos.y = max.y;
  for (
    pos.z = min.z;
    pos.z <= max.z;
    pos.z += getIncrement(pos, 'z', eyePos, lookDir)
  ) {
    minetest.add_particle(useMarkerParticle(base, pos, ttl));
  }

  pos.x = max.x;
  pos.y = max.y;
  for (
    pos.z = min.z;
    pos.z <= max.z;
    pos.z += getIncrement(pos, 'z', eyePos, lookDir)
  ) {
    minetest.add_particle(useMarkerParticle(base, pos, ttl));
  }
}

function createParticle(
  texture: string
): Omit<ParticleDefinition, 'pos' | 'expirationtime'> {
  return {
    velocity: ZERO_V,
    acceleration: ZERO_V,
    texture,
    size: 1.25,
    collisiondetection: false,
    collision_removal: false,
    object_collision: false,
    vertical: false,
    glow: 14,
  };
}

function useMarkerParticle(
  base: ReturnType<typeof createParticle>,
  pos: Vector3D,
  expirationtime: number
): ParticleDefinition {
  const reuse = base as ParticleDefinition & Immutable<typeof base>;
  reuse.pos = pos;
  reuse.expirationtime = expirationtime;
  return reuse;
}

// todo: client-side to take into account fov and perspective
const baseIncrement = 1 / 16;
function getIncrement(
  pos: Vector3D,
  axis: keyof Vector3D,
  eyePos: Vector3D,
  lookDir: Vector3D
): number {
  const dir = vector.direction(eyePos, pos);
  if (vector.dot(dir, lookDir) < 0) return 1;

  const secant = 1 / (1 - Math.abs(dir[axis]));

  const dir2 = vector.rotate_around_axis(
    dir,
    vector.new(
      axis === 'z' ? 1 : 0,
      axis === 'x' ? 1 : 0,
      axis === 'y' ? 1 : 0
    ),
    0.02
  );
  const secant2 = 1 / (1 - Math.abs(dir2[axis]));

  return clamp(baseIncrement, 4, baseIncrement * Math.abs(secant2 - secant));
}
