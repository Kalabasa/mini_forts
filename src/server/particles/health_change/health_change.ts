import { Font } from 'common/gui/font/font';
import { tex } from 'resource_id';
import { Entity } from 'server/entity/entity';
import { Textures } from 'utils/texture_helper';

export const HealthChangeParticle = {
  create,
};

const blockTexture = tex('blocked_icon.png');
const healTexture = tex('health_icon.png');
const hurtTexture = tex('hurt_icon.png');

const expirationTime = 0.6;

const baseDef: Omit<
  ParticleDefinition,
  'pos' | 'velocity' | 'acceleration' | 'texture' | 'size'
> = {
  expirationtime: expirationTime,
  collisiondetection: false,
  collision_removal: false,
  object_collision: false,
  vertical: false,
  glow: 14,
};

function create(amount: number, entity: Entity): ParticleDefinition {
  let iconTex: string | undefined;
  if (amount > 0) iconTex = healTexture;
  // if (amount === 0) iconTex = blockTexture;
  // if (amount < 0) iconTex = hurtTexture;

  const numberType = Font.createNumberCombineParts(
    Math.abs(amount),
    amount < 0 ? 'red' : 'default'
  );

  const width = numberType.width + 2 + (iconTex ? 6 : 0);
  const height = width; // For some reason, Minetest only wants square textures for particles
  const y = (height - 8) * 0.5;

  const iconPart = iconTex ? `${numberType.width - 2},${y}=${iconTex}` : '';

  const numberParts = numberType.parts
    .map((part) => `${part.x},${y + part.y}=${Textures.escape(part.texture)}`)
    .join(':');

  const texture = `\
[combine:${width}x${height}:\
${numberParts}:\
${iconPart}\
`;

  let velocity;
  let acceleration;

  if (amount > 0) {
    velocity = { x: 0, y: 2, z: 0 };
    acceleration = { x: 0, y: -0.5, z: 0 };
  } else {
    velocity = { x: 0, y: 2 * 1.5, z: 0 };
    acceleration = { x: 0, y: -velocity.y * (1.5 / expirationTime), z: 0 };
    velocity.x += 0.5 - 1 * Math.random();
    velocity.z += 0.5 - 1 * Math.random();
  }

  velocity = vector.add(velocity, entity.objRef.get_velocity());

  return {
    ...baseDef,
    pos: entity.objRef.get_pos(),
    velocity,
    acceleration,
    texture,
    size: width * 0.5,
  };
}
