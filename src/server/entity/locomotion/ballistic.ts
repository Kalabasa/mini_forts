import { ActionResult } from 'server/ai/action_result';
import { Locomotion } from 'server/entity/locomotion/locomotion';

// aka noop
export const BallisticLocomotion = {
  create,
};

function create(): Locomotion {
  return {
    pathfinderID: '',
    adjacentNodes: [],
    normalizePathSource: (position) => position,
    nodeCost: () => 0,
    moveCost: () => 0,
    followPath: () => ActionResult.Impossible,
    update: (): void => {},
  };
}
