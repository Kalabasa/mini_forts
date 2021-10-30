import { tex } from 'resource_id';
import { Animation } from 'server/entity/animation';
import { EntityProperties, PersistentEntity } from 'server/entity/entity';
import { Faction } from 'server/entity/faction';
import { BallisticLocomotion } from 'server/entity/locomotion/ballistic';

export class CrystalExplosionProperties extends EntityProperties {
  faction = Faction.Defenders;
  override floats = true;

  readonly texture = tex('crystal_explosion.png');

  animations = Animation.createMap({
    explode: {
      startFrame: { x: 0, y: 0 },
      numFrames: 8,
      frameDuration: 0.06,
    },
    die: {
      startFrame: { x: 0, y: 0 },
      numFrames: 1,
    },
  });
  locomotion = BallisticLocomotion.create();

  readonly explodeRadius = 3.5;
  readonly explodeTime =
    (this.animations.explode.numFrames - 0.5) *
    this.animations.explode.frameDuration;

  objectProperties: ObjectProperties = {
    visual: 'upright_sprite',
    textures: [this.texture],
    spritediv: { x: 1, y: 8 },
    physical: false,
    collide_with_objects: false,
    collisionbox: [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5],
    visual_size: {
      x: this.explodeRadius * 2,
      y: this.explodeRadius * 2,
      z: this.explodeRadius * 2,
    },
    pointable: false,
    glow: -1,
  };

  override persist(dst: PersistentEntity, src: PersistentEntity) {
    super.persist(dst, src);
    dst['explodeTimerCount'] = src['explodeTimerCount'];
  }
}
