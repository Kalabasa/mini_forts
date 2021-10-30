import { snd, tex } from 'resource_id';
import { BlockEntityProperties } from 'server/block/entity_block/block_entity';
import { Animation } from 'server/entity/animation';
import { PersistentEntity } from 'server/entity/entity';
import { Faction } from 'server/entity/faction';
import { Resource, ResourceType } from 'server/game/resources';

export class BallistaHeadProperties extends BlockEntityProperties {
  readonly chargeTime = 1.0;
  readonly holdTime = 0.2;
  readonly releaseTime = 0.4;
  readonly cooldownTime = 0.2;

  readonly shotRange = 10;
  readonly shotDamage = 1;
  readonly ammunition: Resource = {
    type: ResourceType.Metal,
    amount: 1,
  };

  name = 'ballista_head';
  faction = Faction.Defenders;
  animations = Animation.createMap({
    idle: {
      startFrame: { x: 0, y: 0 },
      numFrames: 1,
    },
    charge: {
      startFrame: { x: 1, y: 0 },
      numFrames: 8,
      frameDuration: this.chargeTime / 4,
      frameSounds: {
        0: {
          sound: snd('ballista_charge'),
          params: {
            gain: { min: 0.01, max: 0.03 },
            pitch: { min: 0.8, max: 1.25 },
          },
        },
      },
    },
    hold: {
      startFrame: { x: 1, y: 3 },
      numFrames: 1,
      frameDuration: this.holdTime,
    },
    release: {
      startFrame: { x: 2, y: 0 },
      numFrames: 8,
      frameDuration: this.releaseTime / 4,
      frameSounds: {
        0: {
          sound: snd('ballista_fire'),
          params: {
            gain: 1,
            pitch: { min: 0.8, max: 1.25 },
          },
        },
      },
    },
    die: {
      startFrame: { x: 0, y: 0 },
      numFrames: 1,
    },
  });

  objectProperties: ObjectProperties = {
    physical: false,
    collide_with_objects: false,
    collisionbox: [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5],
    pointable: false,
    visual: 'upright_sprite',
    visual_size: { x: 1, y: 1, z: 1 },
    textures: [tex('ballista_head.png'), tex('ballista_head_back.png')],
    spritediv: { x: 3, y: 8 },
    backface_culling: false,
  };

  override persist(dst: PersistentEntity, src: PersistentEntity): void {
    super.persist(dst, src);
    dst['operational'] = src['operational'];
  }
}
