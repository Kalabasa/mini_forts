import { tex } from 'resource_id';

const texture = tex('dig_marker.png');

export const digMarker: LuaEntityProperties = {
  initial_properties: {
    physical: false,
    collide_with_objects: false,
    collisionbox: [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5],
    pointable: false,
    visual: 'cube',
    visual_size: { x: 17 / 16, y: 17 / 16, z: 17 / 16 },
    textures: [texture, texture, texture, texture, texture, texture],
    glow: -1,
    shaded: false,
  },
};
