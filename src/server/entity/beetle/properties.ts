import { tex } from 'resource_id';
import { Animation } from 'server/entity/animation';
import { EnemyEntityProperties } from 'server/entity/enemy_entity/enemy_entity';
import { Faction } from 'server/entity/faction';
import { PassableNodes } from 'server/entity/locomotion/locomotion';
import { WalkClimbLocomotion } from 'server/entity/locomotion/walk_climb';
import { defaultCollisionBox, PersistentEntity } from 'server/entity/entity';

export class BeetleProperties extends EnemyEntityProperties {
  entityName = 'beetle';
  faction = Faction.Attackers;

  override health = 10;

  attackRange = 1;
  attackInterval = 0.8;

  animations = Animation.createMap({
    stand: {
      startFrame: { x: 0, y: 0 },
      numFrames: 1,
    },
    walk: {
      startFrame: { x: 0, y: 0 },
      numFrames: 1,
    },
    climb: {
      startFrame: { x: 0, y: 0 },
      numFrames: 1,
    },
    fall: {
      startFrame: { x: 0, y: 0 },
      numFrames: 1,
    },
    attack: {
      startFrame: { x: 0, y: 0 },
      numFrames: 1,
    },
    die: {
      startFrame: { x: 0, y: 0 },
      numFrames: 1,
    },
  });

  locomotion = WalkClimbLocomotion.create({
    passableNodes: PassableNodes.BreakBuildings,
    walkSpeed: 0.8,
    climbSpeed: 0.05,
    animationMap: this.animations,
  });

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
