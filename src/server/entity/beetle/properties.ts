import { tex } from 'resource_id';
import { Animation } from 'server/entity/animation';
import { EnemyEntityProperties } from 'server/entity/enemy_entity/enemy_entity';
import { Faction } from 'server/entity/faction';
import { PassableNodes } from 'server/entity/locomotion/locomotion';
import { WalkClimbLocomotion } from 'server/entity/locomotion/walk_climb';
import { defaultCollisionBox, PersistentEntity } from 'server/entity/entity';

const carryingMoveAnimation: Animation = {
  startFrame: { x: 0, y: 0 },
  numFrames: 1,
};

const unburdenedMoveAnimation: Animation = {
  startFrame: { x: 1, y: 0 },
  numFrames: 1,
};

export class BeetleProperties extends EnemyEntityProperties {
  entityName = 'beetle';
  faction = Faction.Attackers;

  override health = 10;

  attackRange = 1.2;
  attackInterval = 0.9;

  carryingAnimations = Animation.createMap({
    stand: carryingMoveAnimation,
    walk: carryingMoveAnimation,
    climb: carryingMoveAnimation,
    fall: carryingMoveAnimation,
    attack: {
      startFrame: { x: 0, y: 0 },
      numFrames: 1,
    },
    die: {
      startFrame: { x: 1, y: 0 },
      numFrames: 1,
    },
  });

  unburdenedAnimations = Animation.createMap({
    stand: unburdenedMoveAnimation,
    walk: unburdenedMoveAnimation,
    climb: unburdenedMoveAnimation,
    fall: unburdenedMoveAnimation,
    attack: {
      startFrame: { x: 1, y: 0 },
      numFrames: 1,
    },
    die: {
      startFrame: { x: 1, y: 0 },
      numFrames: 1,
    },
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
    spritediv: { x: 2, y: 1 },
    physical: true,
    collide_with_objects: false,
    collisionbox: defaultCollisionBox,
  };

  override persist(dst: PersistentEntity, src: PersistentEntity) {
    super.persist(dst, src);
    dst['carrying'] = src['carrying'];
  }
}
