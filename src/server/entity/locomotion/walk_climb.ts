import { getNodeDef } from 'common/block/get_node_def';
import { IsNode } from 'common/block/is_node';
import { getNodeSupport } from 'common/block/physics';
import { BlockTag } from 'common/block/tag';
import { ActionResult } from 'server/ai/action_result';
import { Path } from 'server/ai/pathfinder/path';
import { Animation } from 'server/entity/animation';
import { Entity } from 'server/entity/entity';
import { Locomotion } from 'server/entity/locomotion/locomotion';
import { equalVectors, randomInt, ZERO_V } from 'utils/math';
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

// todo: just use string keys?
enum PassableNodes {
  Default,
  PassDoors,
  BreakBuildings,
}

export const WalkClimbLocomotion = {
  create,
  adjacentNodes,
  PassableNodes,
};

const nodePassCostImpl = {
  [PassableNodes.Default]: (node: Node) => (IsNode.solid(node) ? Infinity : 0),
  [PassableNodes.PassDoors]: (node: Node) => {
    if (!IsNode.solid(node)) return 0;
    return isPassableDoor(node) ? 1 : Infinity;
  },
  [PassableNodes.BreakBuildings]: (node: Node) => {
    if (IsNode.breakableBuilding(node)) return randomInt(20, 40);
    return IsNode.solid(node) ? Infinity : 0;
  },
};

function isPassableDoor(node: Node) {
  const def = getNodeDef(node.name);
  if (!def) return false;
  return BlockTag.get(def, BlockTag.PassableDoor) === BlockTag.PassableDoorTrue;
}

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
  const { passableNodeCost } = Locomotion;
  const nodePassCost = nodePassCostImpl[passableNodes];
  const climbCost = 1 + Math.ceil(6 / climbSpeed);

  const nodeCost = (position: Vector3D): number => {
    const cost = nodePassCost(minetest.get_node(position));

    if (!passableNodeCost(cost)) return Infinity;

    const under = minetest.get_node({
      x: position.x,
      y: position.y - 1,
      z: position.z,
    });

    // can't walk on non-solid block
    if (!IsNode.solid(under)) return Infinity;

    // can't walk on non-supporting block
    if (getNodeSupport(under) !== BlockTag.PhysicsSupportAll) return Infinity;

    return cost;
  };

  const moveCost = (
    from: Vector3D,
    to: Vector3D,
    reversible = false
  ): number => {
    const delta = vector.subtract(to, from);
    const absDeltaX = Math.abs(delta.x);
    const absDeltaZ = Math.abs(delta.z);
    // allow diagonals
    if (absDeltaX > 1 || absDeltaZ > 1) return Infinity;

    const deltaY = reversible ? Math.abs(delta.y) : delta.y;
    if (deltaY > 1) return Infinity;

    const distH = absDeltaX + absDeltaZ;
    if (distH > 1 && deltaY !== 0) return Infinity;

    if (deltaY !== 0) {
      if (delta.x === 0 && delta.z === 0) return Infinity;
      const climb = reversible || delta.y > 0;

      const lower = from.y < to.y ? from : to;
      const higher = from.y < to.y ? to : from;

      if (climb) {
        // check top has space for climbing on
        const top = minetest.get_node(higher);
        if (IsNode.solid(top)) return Infinity;
      }

      for (let y = lower.y; y < higher.y; y++) {
        if (climb) {
          // check wall for climbing
          const wallPos = minetest.get_node({
            x: higher.x,
            y,
            z: higher.z,
          });
          if (!IsNode.solid(wallPos)) return Infinity;
        }

        // check space for ascending/descending
        const climbPath = minetest.get_node({
          x: lower.x,
          y: y + 1,
          z: lower.z,
        });
        if (IsNode.solid(climbPath)) return Infinity;
      }
    }

    const costV = deltaY > 0 ? deltaY * climbCost : deltaY;
    return distH + costV;
  };

  const normalizePathSource = (position: Vector3D): Vector3D => {
    for (let i = 0; i < 100; i++) {
      const below = {
        x: position.x,
        y: position.y - i,
        z: position.z,
      };
      const belowNode = minetest.get_node(below);
      if (IsNode.solid(belowNode)) {
        return {
          x: below.x,
          y: below.y + 1,
          z: below.z,
        };
      }
    }
    return position;
  };

  const advancePath = (path: Path) => {
    path.advance();

    // check if we can cut corners by going diagonal
    const cur = path.getStep(-1);
    const next = path.getStep();
    const next2 = path.getStep(+1);
    if (cur && next && next2) {
      if (
        cur.y === next2.y &&
        next.y === next2.y &&
        Math.abs(next2.x - cur.x) === 1 &&
        Math.abs(next2.z - cur.z) === 1
      ) {
        const costX = nodeCost({
          x: next2.x,
          y: next2.y,
          z: cur.z,
        });
        const costZ = nodeCost({
          x: cur.x,
          y: next2.y,
          z: next2.z,
        });
        if (costX <= 0 && costZ <= 0) {
          path.advance();
        }
      }
    }
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
        advancePath(path);
        return ActionResult.Ongoing;
      } else {
        entity.targetLocation = undefined;
        return ActionResult.Done;
      }
    } else {
      const pos = normalizePathSource(entity.getVoxelPosition());
      if (
        equalVectors(pos, next) ||
        passableNodeCost(nodeCost(pos)) ||
        moveCost(pos, next) < Infinity
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
    const entityVoxelPos = vector.round(entityPos);

    const delta = targetLocation && vector.subtract(targetLocation, entityPos);
    const deltaH = delta && { x: delta.x, y: 0, z: delta.z };

    // slide off unpathable
    if (entity.collisionInfo.touching_ground) {
      const below = vector.offset(entityVoxelPos, 0, -1, 0);
      const belowNode = minetest.get_node(below);
      if (
        IsNode.solid(belowNode) &&
        getNodeSupport(belowNode) !== BlockTag.PhysicsSupportAll
      ) {
        entity.animation = animationMap.fall;
        const dirH = vector.direction(
          vector.offset(
            entityVoxelPos,
            Math.random() * 0.01,
            0,
            Math.random() * 0.01
          ),
          targetLocation ?? entityPos
        );
        dirH.y = 0;
        entity.objRef.set_velocity(vector.multiply(dirH, walkSpeed));
        return;
      }
    }

    // stop if reached target
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
        const velocity = entity.objRef.get_velocity();
        const deltaH = {
          x: -velocity.x,
          y: 0,
          z: -velocity.z,
        };
        entity.objRef.set_velocity(
          vector.add(velocity, vector.multiply(deltaH, 0.6))
        );
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
          moveCost(vector.round(entityPos), obstacleTopPos) < Infinity
            ? forwardCollision
            : undefined;
      }
    }

    if (climbCollision) {
      entity.animation = animationMap.climb;

      const stillHasObstacle = entity.collisionInfo.collisions.some(
        (c) => c.type === 'node' && c.axis === climbCollision!.axis
      );

      const climbSpeed0 = stillHasObstacle ? climbSpeed : 1; // final push to vault over the ledge
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
        const targetVelocity = vector.multiply(dirH, Math.min(0.2, walkSpeed));
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
    nodeCost,
    moveCost,
    followPath,
    update,
  };
}
