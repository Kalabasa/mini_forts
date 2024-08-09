import { getNodeSupport } from 'common/block/physics';
import { BlockTag } from 'common/block/tag';
import { ActionResult } from 'server/ai/action_result';
import { Path } from 'server/ai/pathfinder/path';
import { Animation } from 'server/entity/animation';
import { Entity } from 'server/entity/entity';
import { Locomotion, PassableNodes } from 'server/entity/locomotion/locomotion';
import { equalVectors, ZERO_V } from 'utils/math';
import { predicate } from 'utils/tstl';

type NodeCollision = Collision & { type: 'node' };

const adjacentNodes = [
  { x: -1, y: -1, z: 0 },
  { x: 1, y: -1, z: 0 },
  { x: 0, y: -1, z: -1 },
  { x: 0, y: -1, z: 1 },
  { x: -1, y: 0, z: 0 },
  { x: 1, y: 0, z: 0 },
  { x: 0, y: 0, z: -1 },
  { x: 0, y: 0, z: 1 },
  { x: -1, y: 1, z: 0 },
  { x: 1, y: 1, z: 0 },
  { x: 0, y: 1, z: -1 },
  { x: 0, y: 1, z: 1 },
] as const;

export const WalkClimbLocomotion = {
  create,
  adjacentNodes,
};

function create({
  passableNodes = PassableNodes.Default,
  walkSpeed,
  climbSpeed,
  animationMap,
}: {
  passableNodes?: PassableNodes;
  walkSpeed: number;
  climbSpeed: number;
  animationMap: {
    stand: Animation;
    walk: Animation;
    climb: Animation;
    fall: Animation;
  };
}): Locomotion {
  const { passableNodeCost, solidNodeCost } = Locomotion;
  const nodeCost = Locomotion.nodeCostImpl[passableNodes];

  const climbCost = 1 + Math.ceil(6 / climbSpeed);

  const moveCost = (position: Vector3D, fromOrTo?: Vector3D): number => {
    const node = minetest.get_node(position);
    const cost = nodeCost(node);

    if (!passableNodeCost(cost)) return Infinity;

    const under = minetest.get_node({
      x: position.x,
      y: position.y - 1,
      z: position.z,
    });

    // can't walk on non-solid block
    if (!solidNodeCost(nodeCost(under))) return Infinity;

    // can't walk on non-supporting block
    if (getNodeSupport(under) !== BlockTag.PhysicsSupportAll) return Infinity;

    if (!fromOrTo) return cost;

    const delta = vector.subtract(position, fromOrTo);
    const distH = Math.abs(delta.x) + Math.abs(delta.z);

    if (Math.abs(delta.x) > 1 || Math.abs(delta.z) > 1) return Infinity;
    if (distH > 1 && delta.y !== 0) return Infinity;
    if (delta.y < -1 || delta.y > 1) return Infinity;

    if (delta.y !== 0) {
      if (delta.x === 0 && delta.z === 0) return Infinity;

      const lower = fromOrTo.y < position.y ? fromOrTo : position;
      const higher = fromOrTo.y < position.y ? position : fromOrTo;

      // check top has space for climbing on
      const top = minetest.get_node(higher);
      if (solidNodeCost(nodeCost(top))) return Infinity;

      for (let y = lower.y; y < higher.y; y++) {
        // check space for climbing
        const climbPath = minetest.get_node({
          x: lower.x,
          y: y + 1,
          z: lower.z,
        });
        if (solidNodeCost(nodeCost(climbPath))) return Infinity;
      }
    }

    let costV = 0;
    if (delta.y !== 0) {
      costV = climbCost;
    }

    return cost + distH + costV;
  };

  const normalizePathSource = (position: Vector3D): Vector3D => {
    for (let i = 0; i < 100; i++) {
      const below = {
        x: position.x,
        y: position.y - i,
        z: position.z,
      };
      const belowNode = minetest.get_node(below);
      if (solidNodeCost(nodeCost(belowNode))) {
        return {
          x: below.x,
          y: below.y + 1,
          z: below.z,
        };
      }
    }
    return position;
  };

  const followPath = (entity: Entity, path: Path): ActionResult => {
    if (!path.exists()) {
      return ActionResult.Stopped;
    }

    const next = path.getStep();
    if (!next) {
      entity.targetLocation = undefined;
      return ActionResult.Done;
    }

    const box = entity.getBoundingBox();

    const reachedHorizontally =
      Math.round(box.min.x) === next.x &&
      Math.round(box.min.z) === next.z &&
      Math.round(box.max.x) === next.x &&
      Math.round(box.max.z) === next.z;

    const reachedVertically =
      Math.round(box.min.y + 1e-3) >= next.y &&
      Math.round(box.max.y) <= next.y + 1;

    if (reachedHorizontally && reachedVertically) {
      if (path.hasNext()) {
        path.advance();
        return ActionResult.Ongoing;
      } else {
        entity.targetLocation = undefined;
        return ActionResult.Done;
      }
    } else {
      const pos = normalizePathSource(entity.getVoxelPosition());
      if (
        equalVectors(pos, next) ||
        entity.locomotion.moveCost(pos) === Infinity ||
        entity.locomotion.moveCost(next, pos) < Infinity
      ) {
        entity.targetLocation = next;
        return ActionResult.Ongoing;
      } else {
        entity.targetLocation = undefined;
        return ActionResult.Stopped;
      }
    }
  };

  const update = (
    dt: number,
    entity: Entity,
    targetLocation: Vector3D | undefined
  ): void => {
    const entityPos = entity.objRef.get_pos();
    const delta = targetLocation && vector.subtract(targetLocation, entityPos);
    const deltaH = delta && { x: delta.x, y: 0, z: delta.z };

    if (!delta || !deltaH || vector.length(deltaH) < walkSpeed * dt * 0.4) {
      if (entity.collisionInfo.touching_ground) {
        if (
          entity.animation === animationMap.walk ||
          entity.animation === animationMap.climb ||
          entity.animation === animationMap.fall
        ) {
          entity.animation = animationMap.stand;
        }
        entity.objRef.set_velocity(ZERO_V);
      } else {
        entity.animation = animationMap.fall;
        entity.resetGravity();
      }
      return;
    }

    const dirH = vector.normalize(deltaH);

    let climbCollision: NodeCollision | undefined;
    if (delta.y >= -1 && entity.prevCollisionInfo.collides) {
      const forwardCollision = entity.prevCollisionInfo.collisions.find(
        predicate(
          (c: Collision): c is NodeCollision =>
            c.type === 'node' &&
            c.axis !== 'y' &&
            vector.dot(dirH, vector.direction(entityPos, c.node_pos)) > 0
        )
      );

      if (forwardCollision) {
        const obstacleNodePos = forwardCollision.node_pos;
        const obstacleTopPos = {
          x: obstacleNodePos.x,
          y: obstacleNodePos.y + 1,
          z: obstacleNodePos.z,
        };
        climbCollision =
          moveCost(obstacleTopPos, vector.round(entityPos)) < Infinity
            ? forwardCollision
            : undefined;
      }
    }

    if (climbCollision) {
      entity.animation = animationMap.climb;

      const stillHasObstacle = entity.collisionInfo.collisions.some(
        (c) => c.type === 'node' && c.axis === climbCollision!.axis
      );

      const climbSpeed0 = stillHasObstacle ? climbSpeed : 2; // final push to vault over the ledge
      const grip = vector.multiply(dirH, 2);

      entity.objRef.set_velocity({ x: grip.x, y: climbSpeed0, z: grip.z });
      entity.objRef.set_acceleration(grip);
    } else {
      entity.resetGravity();
      if (entity.collisionInfo.touching_ground) {
        entity.animation = animationMap.walk;
        entity.objRef.set_velocity(vector.multiply(dirH, walkSpeed));
      } else {
        entity.animation = animationMap.fall;
        const velocity = entity.objRef.get_velocity();
        const targetVelocity = vector.multiply(dirH, Math.min(0.3, walkSpeed));
        const deltaH = vector.subtract(targetVelocity, velocity);
        deltaH.y = 0;
        entity.objRef.set_velocity(
          vector.add(velocity, vector.multiply(deltaH, 0.4))
        );
      }
    }
  };

  return {
    pathfinderID: 'walkClimb' + PassableNodes[passableNodes],
    adjacentNodes,
    normalizePathSource,
    moveCost,
    followPath,
    update,
  };
}
