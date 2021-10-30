import { BlockTag } from 'common/block/tag';
import { tex } from 'resource_id';
import { BlockProperties } from 'server/block/block';
import { GhostDefinition } from 'server/block/ghost';
import { Resource, ResourceType } from 'server/game/resources';

const flatTexture = tex('door.png', '^[sheet:3x1:2,0');
const closedSideTexture = tex('door.png', '^[sheet:3x1:0,0');
const openSideTexture = tex('door.png', '^[sheet:3x1:1,0');
const ghostTexture = tex('door_ghost.png');

export class DoorProperties extends BlockProperties {
  override digTime = 4;
  override health = 100;

  override physics = {
    attachment: BlockTag.PhysicsAttachmentDiagonalDown,
    support: BlockTag.PhysicsSupportAll,
  };

  override resource: Resource = {
    type: ResourceType.Wood,
    amount: 15,
  };

  override tags = this.defineTags({
    Use: BlockTag.UseScript,
    BreakableBuilding: BlockTag.BreakableBuildingTrue,
    PassableDoor: BlockTag.PassableDoorTrue,
  });

  override ghost: GhostDefinition = {
    buildTime: 4,
    buildStyle: BlockTag.BuildStyleMulti,
    texture: ghostTexture,
    inventoryImage: closedSideTexture,
  };

  nodeDefinition = this.defineNodes({
    default: {
      drawtype: 'normal',
      tiles: [
        flatTexture,
        flatTexture,
        closedSideTexture,
        closedSideTexture,
        closedSideTexture,
        closedSideTexture,
      ],
    },
    open: {
      walkable: false,
      paramtype: 'light',
      drawtype: 'nodebox',
      node_box: {
        type: 'fixed',
        fixed: [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5],
      },
      use_texture_alpha: 'clip',
      tiles: [
        flatTexture,
        flatTexture,
        openSideTexture,
        openSideTexture,
        openSideTexture,
        openSideTexture,
      ],
    },
  });
}
