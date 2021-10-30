import { BlockTag } from 'common/block/tag';
import { tex } from 'resource_id';
import { BlockProperties } from 'server/block/block';
import { MineableBlockState } from 'server/block/extractor/constants';
import { ResourceType } from 'server/game/resources';

const rockPng = 'rock.png';
const grassyTopTexture = tex(rockPng, '^[sheet:4x1:0,0');
const texture = tex(rockPng, '^[sheet:4x1:1,0');
const mycelialTexture = tex(rockPng, '^[sheet:4x1:2,0');
const exMycelialTexture = tex(rockPng, '^[sheet:4x1:3,0');

export class RockProperties extends BlockProperties {
  override digTime = 6;

  override physics = {
    support: BlockTag.PhysicsSupportAll,
  };

  override resource = {
    type: ResourceType.Stone,
    amount: 5,
  };
  override miningResource = {
    type: ResourceType.Stone,
    amount: 600,
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
