import { BlockTag } from 'common/block/tag';
import { tex } from 'resource_id';
import { BlockProperties } from 'server/block/block';

const topTexture = tex('core_crystal_base.png', '^[sheet:2x1:0,0');
const nonTopTexture = tex('core_crystal_base.png', '^[sheet:2x1:1,0');

export class CoreCrystalBaseProperties extends BlockProperties {
  override physics = {
    support: BlockTag.PhysicsSupportAll,
  };

  nodeDefinition = this.defineNode({
    drawtype: 'normal',
    tiles: [
      topTexture,
      nonTopTexture,
      nonTopTexture,
      nonTopTexture,
      nonTopTexture,
      nonTopTexture,
    ],
  });
}
