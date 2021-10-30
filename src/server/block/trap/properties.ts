import { BlockTag } from 'common/block/tag';
import { tex } from 'resource_id';
import { BlockProperties } from 'server/block/block';
import { GhostDefinition } from 'server/block/ghost';
import { Resource, ResourceType } from 'server/game/resources';
import { px16Box } from 'utils/math';

const sideTexture = tex('trap.png', '^[sheet:3x1:0,0');
const frontTexture = tex('trap.png', '^[sheet:3x1:1,0');
const topTexture = tex('trap.png', '^[sheet:3x1:2,0');

export class TrapProperties extends BlockProperties {
  override digTime = 4;
  override health = 60;

  override physics = {
    attachment: BlockTag.PhysicsAttachmentDown,
  };

  override resource: Resource = {
    type: ResourceType.Metal,
    amount: 40,
  };

  override tags = this.defineTags({
    BreakableBuilding: BlockTag.BreakableBuildingTrue,
  });

  override ghost: GhostDefinition = {
    buildTime: 4,
    buildStyle: BlockTag.BuildStyleSingle,
    flatTexture: sideTexture,
    inventoryImage: 'tmp',
  };

  nodeDefinition = this.defineNodes({
    default: {
      paramtype: 'light',
      drawtype: 'nodebox',
      node_box: {
        type: 'fixed',
        fixed: [px16Box([-7, -8, -7, 7, -2, 7])],
      },
      tiles: [
        topTexture,
        topTexture,
        frontTexture,
        frontTexture,
        sideTexture,
        sideTexture,
      ],
    },
  });
}
