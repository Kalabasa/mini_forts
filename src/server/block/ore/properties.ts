import { BlockTag } from 'common/block/tag';
import { tex } from 'resource_id';
import { BlockProperties } from 'server/block/block';
import { MineableBlockState } from 'server/block/extractor/constants';
import { ResourceType } from 'server/game/resources';

const orePng = 'ore.png';
const grassyTopTexture = tex(orePng, '^[sheet:4x1:0,0');
const texture = tex(orePng, '^[sheet:4x1:1,0');
const mycelialTexture = tex(orePng, '^[sheet:4x1:2,0');
const exMycelialTexture = tex(orePng, '^[sheet:4x1:3,0');

export class OreProperties extends BlockProperties {
  override digTime = 6;

  override physics = {
    support: BlockTag.PhysicsSupportAll,
  };

  override resource = {
    type: ResourceType.Stone,
    amount: 10,
  };
  override miningResource = {
    type: ResourceType.Metal,
    amount: 200,
  };

  nodeDefinition = this.defineNodes({
    default: {
      drawtype: 'normal',
      tiles: [texture],
    },
    grassy: {
      drawtype: 'normal',
      tiles: [grassyTopTexture, texture, texture, texture, texture, texture],
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
