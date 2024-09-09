import { Path } from 'server/ai/pathfinder/path';
import { Locomotion } from 'server/entity/locomotion/locomotion';

export const Paths = {
  followablePath,
};

function followablePath(
  path: Path,
  from: Vector3D,
  locomotion: Locomotion
): boolean {
  return [path.getSource(), path.getStep()]
    .filter((p): p is NonNullable<typeof p> => p != null)
    .every((pathPos) => {
      return (
        Locomotion.passableNodeCost(locomotion.nodeCost(pathPos)) &&
        locomotion.moveCost(locomotion.normalizePathSource(from), pathPos) <
          Infinity
      );
    });
}
