import { res, tex } from 'resource_id';
import { Entity } from 'server/entity/entity';
import { ZERO_V } from 'utils/math';

const ballistaBoltPng = 'ballista_bolt.png';

const entityDef: LuaEntityProperties = {
  initial_properties: {
    physical: false,
    collide_with_objects: false,
    collisionbox: [0, 0, 0, 0, 0, 0],
    pointable: false,
    visual: 'upright_sprite',
    visual_size: { x: 0.5, y: 0.5, z: 0.5 },
    textures: [tex(ballistaBoltPng), tex(ballistaBoltPng, '^[transformFX')],
    backface_culling: false,
  },
  on_activate() {
    minetest.after(4, () => this.object.remove());
  },
  on_detach() {
    this.object.remove();
  },
};

export const BallistaBolt = {
  name: res('ballista_bolt'),
  entityDef,
  create,
};

function create(target: Entity, source: Vector3D): void {
  const dir = vector.direction(source, target.objRef.get_pos());

  // for some reason, model coordinates are scaled by 10
  const modelPosition = vector.multiply(dir, -10 / 8);
  modelPosition.x += 0.5 - 1 * Math.random();
  modelPosition.y += 0.5 - 1 * Math.random();
  modelPosition.z += 0.5 - 1 * Math.random();

  const yaw = -Math.atan2(dir.z, dir.x) + Math.PI / 4;
  const pitch = Math.asin(dir.y);
  // for some reason, bone rotations use degrees
  const rotationDeg = {
    x: 90 - pitch * (180 / Math.PI) + 3 - 6 * Math.random(),
    y: yaw * (180 / Math.PI) + 3 - 6 * Math.random(),
    z: 0,
  };

  const bolt = minetest.add_entity(ZERO_V, BallistaBolt.name) as LuaEntitySAO;
  if (!bolt) return;

  bolt.set_attach(target.objRef, '', modelPosition, rotationDeg);
}
