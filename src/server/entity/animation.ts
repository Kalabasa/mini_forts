import { Entity } from 'server/entity/entity';
import { throwError } from 'utils/error';

export type AnimationMap<T extends string> = { [K in T]: Animation };

export type Animation = {
  startFrame: Vector2D;
  numFrames: number;
  frameDuration?: number;
  perDirection?: boolean;
  frameSounds?: {
    [k: number]: FrameSound;
  };
};

type FrameSound = {
  sound: SimpleSoundSpec;
  params: {
    [K in keyof SoundParameters]: SoundParameters[K] extends number | undefined
      ? number | { min: number; max: number } | undefined
      : SoundParameters[K];
  };
};

export const Animation = {
  createMap: createAnimationMap,
  sequence,
  playFrameSound,
};

function createAnimationMap<T extends AnimationMap<A>, A extends string>(
  definition: T
): T {
  return definition;
}

function sequence(
  entity: Entity,
  animations: (Animation | { animation: Animation; skipLastFrames?: number })[]
): void {
  if (animations.length === 0) return;

  let animation: Animation;
  let skipLastFrames = 0;

  const next = animations[0];
  if ('animation' in next) {
    animation = next.animation;
    skipLastFrames = next.skipLastFrames ?? 0;
  } else {
    animation = next;
  }

  entity.animation = animation;
  if (animations.length > 1) {
    if (!animation.frameDuration) {
      throwError('Missing frameDuration!', animation.startFrame);
    }

    minetest.after(
      (animation.numFrames - skipLastFrames) * animation.frameDuration,
      () => sequence(entity, animations.slice(1))
    );
  }
}

function playFrameSound(frameSound: FrameSound, position: Vector3D) {
  const params = { pos: position };

  for (let [key, value] of Object.entries(frameSound.params)) {
    if (typeof value === 'object' && 'min' in value && 'max' in value) {
      value = value.min + Math.random() * (value.max - value.min);
    }
    params[key] = value;
  }

  minetest.sound_play(frameSound.sound, params, true);
}
