import { tex } from 'resource_id';
import { Animation } from 'server/entity/animation';
import { EnemyEntityProperties } from 'server/entity/enemy_entity/enemy_entity';
import { Faction } from 'server/entity/faction';
import { PassableNodes } from 'server/entity/locomotion/locomotion';
import { WalkClimbLocomotion } from 'server/entity/locomotion/walk_climb';

export class SlugProperties extends EnemyEntityProperties {
  entityName = 'slug';
  faction = Faction.Attackers;

  override health = 10;

  attackRange = Math.sqrt(2);
  attackInterval = 1;

  animations = Animation.createMap({
    stand: {
      startFrame: { x: 0, y: 0 },
      numFrames: 1,
    },
    walk: {
      startFrame: { x: 0, y: 0 },
      numFrames: 2,
      frameDuration: 0.3,
    },
    climb: {
      startFrame: { x: 3, y: 0 },
      numFrames: 2,
      frameDuration: 0.3,
    },
    fall: {
      startFrame: { x: 3, y: 0 },
      numFrames: 1,
    },
    attack: {
      startFrame: { x: 1, y: 0 },
      numFrames: 2,
      frameDuration: this.attackInterval / 2,
    },
    die: {
      startFrame: { x: 2, y: 0 },
      numFrames: 2,
      frameDuration: 0.3,
    },
  });

  locomotion = WalkClimbLocomotion.create({
    passableNodes: PassableNodes.BreakBuildings,
    walkSpeed: 1,
    climbSpeed: 1,
    animationMap: this.animations,
  });

  objectProperties: ObjectProperties = {
    visual: 'sprite',
    textures: [tex('slug.png')],
    spritediv: { x: 4, y: 2 },
    physical: true,
    collide_with_objects: false,
    collisionbox: [-0.3, -0.5, -0.3, 0.3, 0.4, 0.3],
  };
}
