import { BlockTag } from 'common/block/tag';
import { tex } from 'resource_id';
import { BlockProperties } from 'server/block/block';
import { MineableBlockState } from 'server/block/extractor/constants';
import { ResourceType } from 'server/game/resources';

const fertileSoilPng = 'fertile_soil.png';
const grassyTopTexture = tex(fertileSoilPng, '^[sheet:5x1:0,0');
const grassySideTexture = tex(fertileSoilPng, '^[sheet:5x1:1,0');
const texture = tex(fertileSoilPng, '^[sheet:5x1:2,0');
const mycelialTexture = tex(fertileSoilPng, '^[sheet:5x1:3,0');
const exMycelialTexture = tex(fertileSoilPng, '^[sheet:5x1:4,0');

export class FertileSoilProperties extends BlockProperties {
  override digTime = 4;

  override physics = {
    attachment: BlockTag.PhysicsAttachmentDown,
    support: BlockTag.PhysicsSupportAll,
  };

  override miningResource = {
    type: ResourceType.Spore,
    amount: 200,
  };

  nodeDefinition = this.defineNodes({
    default: {
      drawtype: 'normal',
      tiles: [texture],
    },
    grassy: {
      drawtype: 'normal',
      tiles: [
        grassyTopTexture,
        texture,
        grassySideTexture,
        grassySideTexture,
        grassySideTexture,
        grassySideTexture,
      ],
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
