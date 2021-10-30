import { tex } from 'resource_id';
import { Animation } from 'server/entity/animation';
import { EnemyEntityProperties } from 'server/entity/enemy_entity/enemy_entity';
import { Faction } from 'server/entity/faction';
import { PassableNodes } from 'server/entity/locomotion/locomotion';
import { WalkClimbLocomotion } from 'server/entity/locomotion/walk_climb';

export class SnailProperties extends EnemyEntityProperties {
  entityName = 'snail';
  faction = Faction.Attackers;

  override health = 10;

  attackRange = Math.sqrt(2);
  attackInterval = 1.5;

  animations = Animation.createMap({
    stand: {
      startFrame: { x: 0, y: 0 },
      numFrames: 1,
    },
    walk: {
      startFrame: { x: 0, y: 0 },
      numFrames: 2,
      frameDuration: 0.4,
    },
    climb: {
      startFrame: { x: 3, y: 0 },
      numFrames: 2,
      frameDuration: 0.6,
    },
    fall: {
      startFrame: { x: 3, y: 1 },
      numFrames: 1,
    },
    attack: {
      startFrame: { x: 1, y: 0 },
      numFrames: 2,
      frameDuration: this.attackInterval / 2,
    },
    hide: {
      startFrame: { x: 4, y: 0 },
      numFrames: 6,
      frameDuration: 0.1,
    },
    hiding: {
      startFrame: { x: 4, y: 5 },
      numFrames: 1,
    },
    flash: {
      startFrame: { x: 5, y: 0 },
      numFrames: 6,
      frameDuration: 0.1,
    },
    die: {
      startFrame: { x: 2, y: 0 },
      numFrames: 2,
      frameDuration: 0.3,
    },
  });

  locomotion = WalkClimbLocomotion.create({
    passableNodes: PassableNodes.BreakBuildings,
    walkSpeed: 0.5,
    climbSpeed: 0.5,
    animationMap: this.animations,
  });

  objectProperties: ObjectProperties = {
    visual: 'sprite',
    textures: [tex('snail.png')],
    spritediv: { x: 6, y: 6 },
    physical: true,
    collide_with_objects: false,
    collisionbox: [-0.3, -0.5, -0.3, 0.3, 0.4, 0.3],
  };
}
