import { getNodeDef } from 'common/block/get_node_def';
import { BlockPhysics } from 'common/block/physics';
import { BlockTag } from 'common/block/tag';
import { BlockManager } from 'server/block/block_manager';
import { unreachableCase } from 'utils/error';

const supportDirs = [
  vector.new(0, 1, 0),
  vector.new(1, 0, 0),
  vector.new(-1, 0, 0),
  vector.new(0, 0, 1),
  vector.new(0, 0, -1),
  vector.new(1, 1, 0),
  vector.new(-1, 1, 0),
  vector.new(0, 1, 1),
  vector.new(0, 1, -1),
];

export class BlockPhysicsEngine {
  constructor(private readonly blockManager: BlockManager) {}

  updateSupported(position: Vector3D): void {
    const def = getNodeDef(minetest.get_node(position).name);
    const supportsAll =
      def &&
      BlockTag.get(def, BlockTag.PhysicsSupport) === BlockTag.PhysicsSupportAll;

    // all neighbors supported, no need to do anything
    if (supportsAll) return;

    const suppPos = vector.new(0, 0, 0);
    for (const dir of supportDirs) {
      suppPos.x = position.x + dir.x;
      suppPos.y = position.y + dir.y;
      suppPos.z = position.z + dir.z;
      this.updateUnsupportedNeighbor(position, suppPos);
    }
  }

  private updateUnsupportedNeighbor(support: Vector3D, neighbor: Vector3D) {
    const neighborDef = getNodeDef(minetest.get_node(neighbor).name);
    const attachment =
      neighborDef && BlockTag.get(neighborDef, BlockTag.PhysicsAttachment);

    if (attachment === BlockTag.PhysicsAttachmentDown) {
      if (
        support.x === neighbor.x &&
        support.y + 1 === neighbor.y &&
        support.z === neighbor.z
      ) {
        this.removeUnsupportedBlock(neighbor);
      }
    } else if (attachment === BlockTag.PhysicsAttachmentDiagonalDown) {
      const dy = support.y - neighbor.y;
      const dh =
        Math.abs(support.x - neighbor.x) + Math.abs(support.z - neighbor.z);
      if (dy === -1) {
        if (dh <= 1 && !this.canSupport(neighborDef, neighbor)) {
          this.removeUnsupportedBlock(neighbor);
        }
      } else if (
        dy === 0 &&
        dh === 1 &&
        !this.canSupport(neighborDef!, neighbor)
      ) {
        this.removeUnsupportedBlock(neighbor);
      }
    } else if (attachment == undefined) {
      // neighbor is not attached, ignore
    } else {
      unreachableCase(attachment);
    }
  }

  private canSupport(
    neighborDef: Required<NodeDefinition> | undefined,
    neighbor: Vector3D
  ) {
    return BlockPhysics.canSupport(neighborDef!, neighbor);
  }

  private removeUnsupportedBlock(position: Vector3D) {
    const ref = this.blockManager.getRef(position);
    if (ref) ref.damage(Infinity);
  }
}
