import { IsNode } from 'common/block/is_node';
import { PassableNodes } from 'server/entity/locomotion/locomotion';
import { WalkClimbLocomotion } from 'server/entity/locomotion/walk_climb';

// dummy locomotion object used for node cost
const locomotion = WalkClimbLocomotion.create({
  passableNodes: PassableNodes.PassDoors,
  walkSpeed: 0,
  climbSpeed: 0,
  animationMap: undefined as any,
});

// standardizing worker capabilities allow task manager optimizations
export const WorkerCapabilities = {
  locomotion,
  inWorkRange,
  inOperateRange,
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

  if (!ignoreBlocks && dy === 1) {
    if (workerPos.y > target.y) {
      if (
        IsNode.solid(
          minetest.get_node({
            x: target.x,
            y: workerPos.y,
            z: target.z,
          })
        )
      ) {
        return false;
      }
    } else {
      if (
        IsNode.solid(
          minetest.get_node({
            x: target.x,
            y: workerPos.y,
            z: target.z,
          })
        ) &&
        IsNode.solid(
          minetest.get_node({
            x: workerPos.x,
            y: target.y,
            z: workerPos.z,
          })
        )
      ) {
        return false;
      }
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
