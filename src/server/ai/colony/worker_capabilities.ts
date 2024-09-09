import { IsNode } from 'common/block/is_node';
import { WalkClimbLocomotion } from 'server/entity/locomotion/walk_climb';

// dummy locomotion object used for node cost
const locomotion = WalkClimbLocomotion.create({
  passableNodes: WalkClimbLocomotion.PassableNodes.PassDoors,
  walkSpeed: 0,
  climbSpeed: 0,
  animationMap: undefined as any,
});

// standardizing worker capabilities allow task manager optimizations
export const WorkerCapabilities = {
  locomotion,
  inWorkRange,
  getWorkPositions,
  getOperatePositions,
};

const workRange = (() => {
  const zero = vector.new(0, 0, 0);
  return WalkClimbLocomotion.adjacentNodes.flatMap((delta) =>
    inWorkRange(zero, delta, true) ? [delta] : []
  );
})();

const operateRange = (() => {
  const zero = vector.new(0, 0, 0);
  return WalkClimbLocomotion.adjacentNodes.flatMap((delta) =>
    inOperateRange(zero, delta) ? [delta] : []
  );
})();

function getWorkPositions(target: Vector3D): Vector3D[] {
  const positions: Vector3D[] = [];
  for (const delta of workRange) {
    const workPos = vector.subtract(target, delta);
    if (inWorkRange(target, workPos)) {
      positions.push(workPos);
    }
  }
  return positions;
}

function getOperatePositions(target: Vector3D): Vector3D[] {
  const positions: Vector3D[] = [];
  for (const delta of operateRange) {
    const workPos = vector.subtract(target, delta);
    if (inOperateRange(target, workPos)) {
      positions.push(workPos);
    }
  }
  return positions;
}

function inWorkRange(
  target: Vector3D,
  workerPos: Vector3D,
  ignoreBlocks: boolean = false
): boolean {
  const dx = Math.abs(target.x - Math.round(workerPos.x));
  const dy = Math.abs(target.y - Math.round(workerPos.y));
  const dz = Math.abs(target.z - Math.round(workerPos.z));

  if (dx + dz > 1) return false;
  if (dy > 1) return false;
  if (dx === 0 && dy === 0 && dz === 0) return false;

  if (!ignoreBlocks) {
    if (IsNode.solid(minetest.get_node(workerPos))) return false;

    // check for space between
    if (dy === 1) {
      const lower = workerPos.y < target.y ? workerPos : target;
      const higher = workerPos.y < target.y ? target : workerPos;
      const betweenLow = minetest.get_node({
        x: higher.x,
        y: lower.y,
        z: higher.z,
      });
      const betweenHigh = minetest.get_node({
        x: lower.x,
        y: higher.y,
        z: lower.z,
      });
      if (IsNode.solid(betweenLow) && IsNode.solid(betweenHigh)) return false;
    }
  }

  return true;
}

function inOperateRange(target: Vector3D, workerPos: Vector3D): boolean {
  const dx = Math.abs(target.x - Math.round(workerPos.x));
  const dy = Math.abs(target.y - Math.round(workerPos.y));
  const dz = Math.abs(target.z - Math.round(workerPos.z));

  if (dx + dz > 1) return false;
  if (dy !== 0) return false;
  if (dx === 0 && dy === 0 && dz === 0) return false;

  return true;
}
