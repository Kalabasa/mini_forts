import { BlockTag } from 'common/block/tag';
import { tex } from 'resource_id';
import { BlockProperties } from 'server/block/block';

const grassTopTexture = tex('soil.png', '^[sheet:3x1:0,0');
const grassSideTexture = tex('soil.png', '^[sheet:3x1:1,0');
const soilTexture = tex('soil.png', '^[sheet:3x1:2,0');

export class SoilProperties extends BlockProperties {
  override digTime = 4;

  override physics = {
    attachment: BlockTag.PhysicsAttachmentDown,
    support: BlockTag.PhysicsSupportAll,
  };

  nodeDefinition = this.defineNodes({
    default: {
      drawtype: 'normal',
      tiles: [soilTexture],
    },
    grassy: {
      drawtype: 'normal',
      tiles: [
        grassTopTexture,
        soilTexture,
        grassSideTexture,
        grassSideTexture,
        grassSideTexture,
        grassSideTexture,
      ],
    },
  });
}
