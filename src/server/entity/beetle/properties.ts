import { tex } from 'resource_id';
import { Animation } from 'server/entity/animation';
import { EnemyEntityProperties } from 'server/entity/enemy_entity/enemy_entity';
import { Faction } from 'server/entity/faction';
import { PassableNodes } from 'server/entity/locomotion/locomotion';
import { WalkClimbLocomotion } from 'server/entity/locomotion/walk_climb';
import { defaultCollisionBox, PersistentEntity } from 'server/entity/entity';

const unburdenedMoveAnimation = {
  startFrame: { x: 2, y: 0 },
  numFrames: 2,
  frameDuration: 0.2,
};

const deathAnimation = {
  startFrame: { x: 3, y: 0 },
  numFrames: 1,
};

export class BeetleProperties extends EnemyEntityProperties {
  entityName = 'beetle';
  faction = Faction.Attackers;

  override health = 10;

  attackRange = 1.2;
  attackInterval = 1.4;

  carryingAnimations = Animation.createMap({
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
      startFrame: { x: 1, y: 0 },
      numFrames: 2,
      frameDuration: 0.9,
    },
    fall: {
      startFrame: { x: 0, y: 0 },
      numFrames: 2,
      frameDuration: 0.2,
    },
    // unused
    attack: {
      startFrame: { x: 0, y: 0 },
      numFrames: 1,
    },
    die: deathAnimation,
  });

  unburdenedAnimations = Animation.createMap({
    stand: unburdenedMoveAnimation,
    walk: unburdenedMoveAnimation,
    climb: unburdenedMoveAnimation,
    fall: unburdenedMoveAnimation,
    attack: {
      startFrame: { x: 4, y: 0 },
      numFrames: 2,
      frameDuration: this.attackInterval / 2,
    },
    die: deathAnimation,
  });

  animations = this.carryingAnimations;

  carryingLocomotion = WalkClimbLocomotion.create({
    passableNodes: PassableNodes.BreakBuildings,
    walkSpeed: 0.8,
    climbSpeed: 0.1,
    animationMap: this.carryingAnimations,
  });

  unburdenedLocomotion = WalkClimbLocomotion.create({
    passableNodes: PassableNodes.BreakBuildings,
    walkSpeed: 1.5,
    climbSpeed: 0.8,
    animationMap: this.unburdenedAnimations,
  });

  locomotion = this.carryingLocomotion;

  objectProperties: ObjectProperties = {
    visual: 'sprite',
    textures: [tex('beetle.png')],
    spritediv: { x: 5, y: 2 },
    physical: true,
    collide_with_objects: false,
    collisionbox: defaultCollisionBox,
  };

  override persist(dst: PersistentEntity, src: PersistentEntity) {
    super.persist(dst, src);
    dst['carrying'] = src['carrying'];
  }
}
