import { res, tex } from 'resource_id';
import { BlockEntityProperties } from 'server/block/entity_block/block_entity';
import { Animation } from 'server/entity/animation';
import { PersistentEntity } from 'server/entity/entity';
import { Faction } from 'server/entity/faction';

export class CrystalShieldProperties extends BlockEntityProperties {
  entityName = res('crystal_shield');
  faction = Faction.Defenders;

  animations = Animation.createMap({
    idle: {
      startFrame: { x: 0, y: 0 },
      numFrames: 8,
      frameDuration: 0.083,
    },
    flash: {
      startFrame: { x: 1, y: 0 },
      numFrames: 8,
      frameDuration: 0.066,
    },
    die: {
      startFrame: { x: 2, y: 0 },
      numFrames: 8,
      frameDuration: 0.066,
    },
    broken: {
      startFrame: { x: 2, y: 7 },
      numFrames: 1,
    },
  });

  objectProperties: ObjectProperties = {
    physical: false,
    collide_with_objects: false,
    collisionbox: [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5],
    pointable: false,
    visual: 'sprite',
    visual_size: { x: 2, y: 2, z: 2 },
    use_texture_alpha: true,
    textures: [tex('crystal_shield.png')],
    spritediv: { x: 3, y: 8 },
    glow: -1,
  };

  override persist(dst: PersistentEntity, src: PersistentEntity): void {
    super.persist(dst, src);
    dst['energy'] = src['energy'];
    dst['rechargeTimeCount'] = src['rechargeTimerCount'];
    dst['dead'] = src['dead'];
  }
}
