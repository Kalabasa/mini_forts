import { ActionResult } from 'server/ai/colony/action_result';
import { Path } from 'server/ai/pathfinder/path';
import { Entity } from 'server/entity/entity';
import { Locomotion } from 'server/entity/locomotion/locomotion';

export const Paths = {
  followablePath,
  followPath,
};

function followablePath(
  path: Path,
  from: Vector3D,
  locomotion: Locomotion
): boolean {
  return [path.getSource(), path.getStep()]
    .filter((p): p is NonNullable<typeof p> => p != null)
    .every((pathPos) => {
      return steppable(from, pathPos, locomotion);
    });
}

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
  } else {
    const pos = entity.getVoxelPosition();
    if (steppable(pos, next, entity.locomotion)) {
      entity.targetLocation = next;
      return ActionResult.Ongoing;
    } else {
      entity.targetLocation = undefined;
      return ActionResult.Stopped;
    }
  }
}

function steppable(
  entityPos: Vector3D,
  nextStep: Vector3D,
  locomotion: Locomotion
) {
  return (
    (entityPos.x === nextStep.x &&
      entityPos.z === nextStep.z &&
      entityPos.y > nextStep.y) ||
    locomotion.moveCost(nextStep, entityPos) < Infinity
  );
}
