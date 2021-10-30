import { Font } from 'common/gui/font/font';
import { tex } from 'resource_id';
import { Resource, ResourceType } from 'server/game/resources';
import { Textures } from 'utils/texture_helper';

export const ResourceChangeParticle = {
  create,
};

const resourceIconTextures: Record<ResourceType, string> = {
  [ResourceType.Metal]: tex('metal_icon.png'),
  [ResourceType.Spore]: tex('spore_icon.png'),
  [ResourceType.Stone]: tex('stone_icon.png'),
  [ResourceType.Wood]: tex('wood_icon.png'),
};

const expirationTime = 1;

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

function create(resource: Resource, position: Vector3D): ParticleDefinition {
  const iconTex = resourceIconTextures[resource.type];

  const numberType = Font.createNumberCombineParts(
    Math.abs(resource.amount),
    resource.amount < 0 ? 'red' : 'default'
  );

  const width = numberType.width + 7;
  const height = width; // For some reason, Minetest only wants square textures for particles
  const y = (height - 8) * 0.5;

  const numberParts = numberType.parts
    .map((part) => `${part.x},${y + part.y}=${Textures.escape(part.texture)}`)
    .join(':');

  const texture = `\
[combine:${width}x${height}:\
${numberParts}:\
${numberType.width - 1},${y}=${iconTex}\
`;

  let velocity;
  let acceleration;

  if (resource.amount > 0) {
    velocity = { x: 0, y: 2, z: 0 };
    acceleration = { x: 0, y: -velocity.y / expirationTime, z: 0 };
  } else {
    velocity = { x: 0, y: 2 * 1.5, z: 0 };
    acceleration = { x: 0, y: -velocity.y * (1.5 / expirationTime), z: 0 };
  }

  return {
    ...baseDef,
    pos: position,
    velocity,
    acceleration,
    texture,
    size: width * 0.5,
  };
}
