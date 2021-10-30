import { BlockTag } from 'common/block/tag';
import { tex } from 'resource_id';
import { BlockProperties } from 'server/block/block';
import { MineableBlockState } from 'server/block/extractor/constants';
import { ResourceType } from 'server/game/resources';

const woodPng = 'wood.png';
const texture = tex(woodPng, '^[sheet:3x1:0,0');
const mycelialTexture = tex(woodPng, '^[sheet:3x1:1,0');
const exMycelialTexture = tex(woodPng, '^[sheet:3x1:2,0');

export class WoodProperties extends BlockProperties {
  override digTime = 4;

  override physics = {
    attachment: BlockTag.PhysicsAttachmentDiagonalDown,
    support: BlockTag.PhysicsSupportAll,
  };

  override resource = {
    type: ResourceType.Wood,
    amount: 5,
  };
  override miningResource = {
    type: ResourceType.Wood,
    amount: 300,
  };

  nodeDefinition = this.defineNodes({
    default: {
      drawtype: 'normal',
      tiles: [texture],
    },
    [MineableBlockState.MYCELIAL]: {
      drawtype: 'normal',
      tiles: [mycelialTexture, texture, texture, texture, texture, texture],
    },
    [MineableBlockState.EXMYCELIAL]: {
      drawtype: 'normal',
      tiles: [exMycelialTexture, texture, texture, texture, texture, texture],
    },
  });
}
