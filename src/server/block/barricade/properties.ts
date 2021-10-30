import { BlockTag } from 'common/block/tag';
import { tex } from 'resource_id';
import { BlockProperties } from 'server/block/block';
import { createDamagedBlockProperties } from 'server/block/damaged_block/damaged_block';
import { GhostDefinition } from 'server/block/ghost';
import { Resource, ResourceType } from 'server/game/resources';

const texture = tex('barricade.png', '^[sheet:2x1:0,0');
const damagedTexture = tex('barricade.png', '^[sheet:2x1:1,0');
const ghostTexture = tex('barricade_ghost.png');

const baseNodeDef = {
  paramtype: 'light',
  drawtype: 'plantlike',
  visual_scale: Math.sqrt(2),
} as const;

const DamagedProperties = createDamagedBlockProperties({
  damagedNodes: [
    {
      name: 'damaged',
      maxHealth: 7,
      nodeDefinition: {
        ...baseNodeDef,
        tiles: [damagedTexture],
      },
    },
  ],
});

export class BarricadeProperties extends DamagedProperties {
  override digTime = 2;
  override health = 16;

  override physics = {
    attachment: BlockTag.PhysicsAttachmentDown,
  };

  override resource: Resource = {
    type: ResourceType.Wood,
    amount: 5,
  };

  override tags = this.defineTags({
    BreakableBuilding: BlockTag.BreakableBuildingTrue,
  });

  override ghost: GhostDefinition = {
    buildTime: 3,
    buildStyle: BlockTag.BuildStyleMulti,
    flatTexture: ghostTexture,
    inventoryImage: texture,
  };

  nodeDefinition = this.defineNodes({
    default: {
      ...baseNodeDef,
      tiles: [texture],
    },
  });
}
