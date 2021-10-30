import { BlockTag } from 'common/block/tag';
import { tex } from 'resource_id';
import { BlockProperties } from 'server/block/block';

const texture = tex('bedrock.png');

export class BedrockProperties extends BlockProperties {
  override physics = {
    support: BlockTag.PhysicsSupportAll,
  };

  nodeDefinition = this.defineNode({
    drawtype: 'normal',
    tiles: [texture],
  });
}
