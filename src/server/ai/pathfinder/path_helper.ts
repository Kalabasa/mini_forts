import { ActionResult } from 'server/ai/colony/action_result';
import { Path } from 'server/ai/pathfinder/path';
import { Entity } from 'server/entity/entity';

export const Paths = {
  followPath,
};

function followPath(path: Path, entity: Entity): ActionResult {
  if (!path.exists()) {
    return ActionResult.Stopped;
  }

  const next = path.getStep();
  const box = entity.getBoundingBox();

  if (
    !next ||
    (Math.round(box.min.x) === next.x &&
      Math.round(box.min.y + 1e-2) === next.y &&
      Math.round(box.min.z) === next.z &&
      Math.round(box.max.x) === next.x &&
      Math.round(box.max.y) === next.y &&
      Math.round(box.max.z) === next.z)
  ) {
    if (path.hasNext()) {
      path.advance();
      return ActionResult.Ongoing;
    } else {
      entity.targetLocation = undefined;
      return ActionResult.Done;
    }
  } else if (
    entity.locomotion.moveCost(next, entity.getVoxelPosition()) < Infinity
  ) {
    entity.targetLocation = next;
    return ActionResult.Ongoing;
  } else {
    entity.targetLocation = undefined;
    return ActionResult.Stopped;
  }
}
