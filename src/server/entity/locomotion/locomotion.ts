import { getNodeDef } from 'common/block/get_node_def';
import { IsNode } from 'common/block/is_node';
import { BlockTag } from 'common/block/tag';
import { ActionResult } from 'server/ai/action_result';
import { Path } from 'server/ai/pathfinder/path';
import { Entity } from 'server/entity/entity';
import { randomInt } from 'utils/math';

export type Locomotion = {
  pathfinderID: string; // used for sharing pathfinders
  adjacentNodes: ReadonlyArray<Vector3D>;
  /** @noSelf */
  normalizePathSource(position: Vector3D): Vector3D;
  /**
   * Cost of entering a position.
   *   0=air, (0,Inf)=passable solid, Inf=impassable solid
   * @noSelf
   */
  nodeCost(position: Vector3D): number;
  /**
   * Cost of moving from one valid position to an adjacent valid position.
   * @noSelf
   */
  moveCost(from: Vector3D, to: Vector3D, reversible?: boolean): number;
  /**
   * Updates an entity's targetLocation while advancing the specified path.
   * @noSelf
   */
  followPath(entity: Entity, path: Path): ActionResult;
  /** @noSelf */
  update(
    dt: number,
    entity: Entity,
    targetLocation: Vector3D | undefined
  ): void;
};

export const Locomotion = {
  /** @deprecated use locomotion.nodeCost() */
  nodeCostImpl: {
    [/* Default */ 0]: (node: Node) => (IsNode.solid(node) ? Infinity : 0),
    [/* PassDoors */ 1]: (node: Node) => {
      if (!IsNode.solid(node)) return 0;
      return isPassableDoor(node) ? 1 : Infinity;
    },
    [/* BreakBuildings */ 2]: (node: Node) => {
      if (IsNode.breakableBuilding(node)) return randomInt(20, 40);
      return IsNode.solid(node) ? Infinity : 0;
    },
  },
  passableNodeCost: (cost: number) => cost < Infinity,
  /** @deprecated use IsNode.isSolid() */
  solidNodeCost: (cost: number) => cost > 0,
};

function isPassableDoor(node: Node) {
  const def = getNodeDef(node.name);
  if (!def) return false;
  return BlockTag.get(def, BlockTag.PassableDoor) === BlockTag.PassableDoorTrue;
}
