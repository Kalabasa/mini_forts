import { getNodeDef } from 'common/block/get_node_def';
import { BlockTag } from 'common/block/tag';
import { BlockDefinition } from 'server/block/block';
import { unreachableCase } from 'utils/error';

export const BlockPhysics = {
  canSupport,
};

type AnyBlockDefinition = BlockDefinition | ItemDefinition | NodeDefinition;

const sideVectors = [
  vector.new(1, 0, 0),
  vector.new(-1, 0, 0),
  vector.new(0, 0, 1),
  vector.new(0, 0, -1),
];

function canSupport(
  def: AnyBlockDefinition,
  position: Vector3D,
  includeGhosts: boolean = false
): boolean {
  let groupsDef: { groups?: Record<string, number> };
  if (def instanceof BlockDefinition) {
    groupsDef = { groups: def.registry.groups };
  } else {
    groupsDef = def;
  }

  const attachment = BlockTag.get(groupsDef, BlockTag.PhysicsAttachment);

  if (!attachment) {
    return true;
  } else if (attachment === BlockTag.PhysicsAttachmentDown) {
    const down = {
      x: position.x,
      y: position.y - 1,
      z: position.z,
    };
    const support = getNodeSupport(
      minetest.get_node_or_nil(down),
      includeGhosts
    );
    return support === BlockTag.PhysicsSupportAll;
  } else if (attachment === BlockTag.PhysicsAttachmentDiagonalDown) {
    const down = {
      x: position.x,
      y: position.y - 1,
      z: position.z,
    };
    const supportDown = getNodeSupport(
      minetest.get_node_or_nil(down),
      includeGhosts
    );
    if (supportDown === BlockTag.PhysicsSupportAll) {
      return true;
    }

    return sideVectors.some((sideVec) => {
      const sidePos = vector.add(position, sideVec);
      const sideSupport = getNodeSupport(
        minetest.get_node_or_nil(sidePos),
        includeGhosts
      );
      if (sideSupport !== BlockTag.PhysicsSupportAll) return false;

      const sideDown = {
        x: sidePos.x,
        y: sidePos.y - 1,
        z: sidePos.z,
      };
      const supportSideDown = getNodeSupport(
        minetest.get_node_or_nil(sideDown),
        includeGhosts
      );
      return supportSideDown === BlockTag.PhysicsSupportAll;
    });
  } else {
    unreachableCase(attachment);
  }
}

function getNodeSupport(
  node: Node | undefined,
  includeGhosts: boolean
): BlockTag.Code<'PhysicsSupport'> | undefined {
  if (!node) return undefined;

  const def = getNodeDef(node.name);
  if (!def) return undefined;

  if (
    !includeGhosts &&
    BlockTag.get(def, BlockTag.Ghost) === BlockTag.GhostTrue
  ) {
    return undefined;
  }

  return BlockTag.get(def, BlockTag.PhysicsSupport);
}
