import { getNodeDef } from 'common/block/get_node_def';
import { BlockTag } from 'common/block/tag';
import { globals } from 'common/globals';

export const IsNode = {
  real: isReal,
  ghost: isGhost,
  operable: isOperable,
  diggable: isDiggable,
  solid: isSolid,
  ignoreish: isIgnoreish,
  air: isAir,
  useable: isUseable,
};

type NodeName = Pick<Node, 'name'>;

function isReal(node: NodeName | undefined): boolean {
  return (
    node != undefined && !isIgnoreish(node) && !isAir(node) && !isGhost(node)
  );
}

function isGhost(node: NodeName | undefined): boolean {
  if (node == undefined) return false;
  const nodeDef = getNodeDef(node.name);
  return (
    nodeDef != undefined &&
    BlockTag.get(nodeDef, BlockTag.Ghost) === BlockTag.GhostTrue
  );
}

function isOperable(node: NodeName | undefined): boolean {
  if (node == undefined) return false;
  const nodeDef = getNodeDef(node.name);
  return (
    nodeDef != undefined &&
    BlockTag.get(nodeDef, BlockTag.Operable) === BlockTag.OperableTrue
  );
}

function isDiggable(node: NodeName | undefined): boolean {
  if (node == undefined) return false;
  const nodeDef = getNodeDef(node.name);
  return nodeDef != undefined && nodeDef.diggable;
}

function isSolid(node: NodeName | undefined): boolean {
  if (node == undefined) return false;
  const nodeDef = getNodeDef(node.name);
  return nodeDef != undefined && nodeDef.walkable;
}

function isIgnoreish(node: NodeName | undefined): boolean {
  return (
    node == undefined ||
    node.name === 'ignore' ||
    node.name === globals.nodes.barrier
  );
}

function isAir(node: NodeName | undefined): boolean {
  return node != undefined && node.name === 'air';
}

function isUseable(node: NodeName | undefined): boolean {
  if (node == undefined) return false;
  const nodeDef = getNodeDef(node.name);
  return (
    nodeDef != undefined && BlockTag.get(nodeDef, BlockTag.Use) != undefined
  );
}
