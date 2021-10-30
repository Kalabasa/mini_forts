import { getNodeDef } from 'common/block/get_node_def';
import { IsNode } from 'common/block/is_node';
import { BlockTag } from 'common/block/tag';
import { Entity } from 'server/entity/entity';
import { randomInt } from 'utils/math';

export type Locomotion = {
  pathfinderID: string; // used for sharing pathfinders
  adjacentNodes: ReadonlyArray<Vector3D>;
  /**
   * Movement cost for traversing position.
   * If fromOrTo is supplied, cost to move between the positions is added.
   * @noSelf
   */
  moveCost(position: Vector3D, fromOrTo?: Vector3D): number;
  /** @noSelf */
  update(
    dt: number,
    entity: Entity,
    collisionInfo: CollisionInfo,
    prevCollisionInfo: CollisionInfo,
    targetLocation: Vector3D | undefined
  ): void;
};

export enum PassableNodes {
  Default,
  PassDoors,
  BreakBuildings,
}

export const Locomotion = {
  // Node costs: 0=air, (0,Inf)=passable solid, Inf=impassable solid
  nodeCostImpl: {
    [PassableNodes.Default]: (node: Node) =>
      IsNode.solid(node) ? Infinity : 0,
    [PassableNodes.PassDoors]: (node: Node) => {
      if (!IsNode.solid(node)) return 0;
      return isPassableDoor(node) ? 1 : Infinity;
    },
    [PassableNodes.BreakBuildings]: (node: Node) => {
      if (isBreakableBuilding(node)) return randomInt(5, 30);
      return IsNode.solid(node) ? Infinity : 0;
    },
  },
  passableNodeCost: (cost: number) => cost < Infinity,
  solidNodeCost: (cost: number) => cost > 0,
};

function isPassableDoor(node: Node) {
  const def = getNodeDef(node.name);
  if (!def) return false;
  return BlockTag.get(def, BlockTag.PassableDoor) === BlockTag.PassableDoorTrue;
}

function isBreakableBuilding(node: Node) {
  const def = getNodeDef(node.name);
  if (!def) return false;
  return (
    BlockTag.get(def, BlockTag.BreakableBuilding) ===
    BlockTag.BreakableBuildingTrue
  );
}
