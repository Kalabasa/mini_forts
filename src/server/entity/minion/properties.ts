import { snd, tex } from 'resource_id';
import { Animation } from 'server/entity/animation';
import { EntityProperties, PersistentEntity } from 'server/entity/entity';
import { Faction } from 'server/entity/faction';
import { PassableNodes } from 'server/entity/locomotion/locomotion';
import { WalkClimbLocomotion } from 'server/entity/locomotion/walk_climb';
import { Resource, ResourceType } from 'server/game/resources';

const stepSound = {
  sound: snd('minion_step'),
  params: {
    gain: 0.04,
    pitch: { min: 0.9, max: 1.11 },
  },
};

export class MinionProperties extends EntityProperties {
  faction = Faction.Defenders;
  override health = 30;
  override decayTime = 4;

  readonly spawnRequirement: Resource = {
    type: ResourceType.Spore,
    amount: 80,
  };

  animations = Animation.createMap({
    stand: {
      startFrame: { x: 0, y: 0 },
      numFrames: 1,
    },
    walk: {
      startFrame: { x: 0, y: 0 },
      numFrames: 2,
      frameDuration: 0.2,
      frameSounds: {
        0: stepSound,
      },
    },
    climb: {
      startFrame: { x: 1, y: 0 },
      numFrames: 2,
      frameDuration: 0.3,
      frameSounds: {
        0: stepSound,
        1: stepSound,
      },
    },
    fall: {
      startFrame: { x: 1, y: 1 },
      numFrames: 1,
    },
    build: {
      startFrame: { x: 2, y: 0 },
      numFrames: 2,
      frameDuration: 0.4,
    },
    dig: {
      startFrame: { x: 2, y: 0 },
      numFrames: 2,
      frameDuration: 0.3,
    },
    operate: {
      startFrame: { x: 4, y: 0 },
      numFrames: 2,
      frameDuration: 0.8,
    },
    die: {
      startFrame: { x: 3, y: 0 },
      numFrames: 1,
    },
  });

  locomotion = WalkClimbLocomotion.create({
    passableNodes: PassableNodes.PassDoors,
    walkSpeed: 3,
    climbSpeed: 1.5,
    animationMap: this.animations,
  });

  objectProperties: ObjectProperties = {
    visual: 'sprite',
    textures: [tex('minion.png')],
    spritediv: { x: 5, y: 2 },
    physical: true,
    collide_with_objects: false,
    collisionbox: [-0.3, -0.45, -0.3, 0.3, 0.45, 0.3],
  };

  override persist(dst: PersistentEntity, src: PersistentEntity) {
    super.persist(dst, src);
    dst['serializedAction'] = src['serializedAction'];
  }
}
