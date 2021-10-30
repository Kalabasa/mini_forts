import { PowParticle } from 'server/particles/pow/pow';
import { SiegeDustParticle } from 'server/particles/siege_dust/siege_dust';
import { SiegePoofParticle } from 'server/particles/siege_poof/siege_poof';
import { floorDiv, randomInt, ZERO_V } from 'utils/math';

export const BlockGfx = {
  damagedFx,
  damageBlockedFx,
  destroyedFx,
};

function damagedFx(position: Vector3D, source?: Vector3D): void {
  const fxPos = getPowPos(position, source);
  minetest.add_particle(PowParticle.create(fxPos, ZERO_V));

  // todo: align dust on nodeboxes
  for (const i of $range(0, 3)) {
    const p1 = {
      x: position.x + floorDiv(i, 2) - 0.5,
      y: position.y,
      z: position.z + floorDiv(i, 2) - 0.5,
    };
    const p2 = {
      x: position.x + (i % 2) - 0.5,
      y: position.y,
      z: position.z + 0.5 - (i % 2),
    };
    minetest.add_particlespawner(
      SiegeDustParticle.create(randomInt(1, 4), p1, p2)
    );
  }
}

function damageBlockedFx(position: Vector3D, source?: Vector3D): void {
  const fxPos = getPowPos(position, source);
  minetest.add_particle(PowParticle.createBlocked(fxPos));
}

function getPowPos(position: Vector3D, source?: Vector3D): Vector3D {
  let fxPos;
  if (source) {
    const delta = vector.subtract(source, position);
    const max = Math.max(
      Math.abs(delta.x),
      Math.abs(delta.y),
      Math.abs(delta.z)
    );
    fxPos = {
      x: position.x + 0.5625 * (delta.x / max),
      y: position.y + 0.05 + 0.5625 * (delta.y / max),
      z: position.z + 0.5625 * (delta.z / max),
    };
  } else {
    fxPos = position;
  }
  return fxPos;
}

function destroyedFx(position: Vector3D): void {
  minetest.add_particle(SiegePoofParticle.create(position));
}
