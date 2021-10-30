import { BlockTag } from 'common/block/tag';
import { tex } from 'resource_id';
import { BlockProperties } from 'server/block/block';
import { GhostDefinition } from 'server/block/ghost';
import { Resource, ResourceType } from 'server/game/resources';
import { px16Box } from 'utils/math';

const metalExtractorPng = 'metal_extractor.png';
const metalTopTexture = tex(metalExtractorPng, '^[sheet:3x1:0,0');
const metalBottomTexture = tex(metalExtractorPng, '^[sheet:3x1:1,0');
const metalSideTexture = tex(metalExtractorPng, '^[sheet:3x1:2,0');

const sporeExtractorPng = 'spore_extractor.png';
const sporeTopTexture = tex(sporeExtractorPng, '^[sheet:3x1:0,0');
const sporeBottomTexture = tex(sporeExtractorPng, '^[sheet:3x1:1,0');
const sporeSideTexture = tex(sporeExtractorPng, '^[sheet:3x1:2,0');

const stoneExtractorPng = 'stone_extractor.png';
const stoneTopTexture = tex(stoneExtractorPng, '^[sheet:3x1:0,0');
const stoneBottomTexture = tex(stoneExtractorPng, '^[sheet:3x1:1,0');
const stoneSideTexture = tex(stoneExtractorPng, '^[sheet:3x1:2,0');

const woodExtractorPng = 'wood_extractor.png';
const woodTopTexture = tex(woodExtractorPng, '^[sheet:5x1:0,0');
const woodBottomTexture = tex(
  woodExtractorPng,
  '^[sheet:5x1:1,0',
  '^[transformFY'
);
const woodFrontTexture = tex(woodExtractorPng, '^[sheet:5x1:2,0');
const woodRightTexture = tex(woodExtractorPng, '^[sheet:5x1:3,0');
const woodSideTexture = tex(woodExtractorPng, '^[sheet:5x1:4,0');

const baseNodeDef: Omit<NodeDefinition, 'drawtype' | 'tiles'> = {
  collision_box: {
    type: 'fixed',
    fixed: [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5],
  },
  selection_box: {
    type: 'fixed',
    fixed: [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5],
  },
  paramtype: 'light',
};

export class ExtractorProperties extends BlockProperties {
  override digTime = 4;
  override health = 100;

  override physics = {
    attachment: BlockTag.PhysicsAttachmentDown,
  };

  override resource: Resource = {
    type: ResourceType.Spore,
    amount: 40,
  };

  override tags = this.defineTags({
    BreakableBuilding: BlockTag.BreakableBuildingTrue,
  });

  override scriptCallbacks = this.defineCallbacks({
    onTimer: true,
  });

  override ghost: GhostDefinition = {
    buildTime: 4,
    buildStyle: BlockTag.BuildStyleSingle,
    flatTexture: sporeSideTexture,
    inventoryImage: tex('extractor_icon.png'),
  };

  nodeDefinition = this.defineNodes({
    default: {
      ...baseNodeDef,
      drawtype: 'normal',
      tiles: [''],
    },
    metal: {
      ...baseNodeDef,
      selection_box: {
        type: 'fixed',
        fixed: [-0.5, -0.5, -0.5, 0.5, 0, 0.5],
      },
      drawtype: 'nodebox',
      node_box: {
        type: 'fixed',
        fixed: [
          // body 1
          px16Box([-4, -8, -2, -3, -4, -3]),
          // body 2
          px16Box([-2, -8, -1, 2, -3, -5]),
          // body 3
          px16Box([-4, -8, 2, -1, -1, -1]),
          // body 4
          px16Box([-1, -8, 5, 4, -2, 0]),
          // thallus
          px16Box([-8, -7.0002, -8, 8, -7, 8]),
        ],
      },
      tiles: [
        metalTopTexture,
        metalBottomTexture,
        metalSideTexture,
        metalSideTexture,
        metalSideTexture,
        metalSideTexture,
      ],
    },
    spore: {
      ...baseNodeDef,
      drawtype: 'nodebox',
      node_box: {
        type: 'fixed',
        fixed: [
          // cap
          px16Box([-4, 1, -4, 4, 8, 4]),
          // stipe
          px16Box([-1, -8, -1, 1, 1, 1]),
        ],
      },
      tiles: [
        sporeTopTexture,
        sporeBottomTexture,
        sporeSideTexture,
        sporeSideTexture,
        sporeSideTexture,
        sporeSideTexture,
      ],
    },
    stone: {
      ...baseNodeDef,
      selection_box: {
        type: 'fixed',
        fixed: [-0.5, -0.5, -0.5, 0.5, 0, 0.5],
      },
      drawtype: 'nodebox',
      node_box: {
        type: 'fixed',
        fixed: [
          // body 1
          px16Box([-4, -8, 2, -3, -4, 3]),
          // body 2
          px16Box([-2, -8, 1, 2, -3, 5]),
          // body 3
          px16Box([-4, -8, -2, -1, -1, 1]),
          // body 4
          px16Box([-1, -8, -5, 4, -2, 0]),
          // thallus
          px16Box([-8, -7.0002, -8, 8, -7, 8]),
        ],
      },
      tiles: [
        stoneTopTexture,
        stoneBottomTexture,
        stoneSideTexture,
        stoneSideTexture,
        stoneSideTexture,
        stoneSideTexture,
      ],
    },
    wood: {
      ...baseNodeDef,
      selection_box: {
        type: 'fixed',
        fixed: [-0.5, -0.5, -0.5, 0.5, 0, 0.5],
      },
      drawtype: 'nodebox',
      node_box: {
        type: 'fixed',
        fixed: [
          // conks
          px16Box([-7, -3, 1, 1, -1, 7]), // NW (N half)
          px16Box([-7, -3, -5, -1, -1, 1]), // NW (S half)
          px16Box([-1, -4, -1, 7, -2, 6]), // NE (N half)
          px16Box([2, -4, -3, 7, -2, -1]), // NE (S half)
          px16Box([-4, -5, -7, -1, -3, -1]), // SE (W half)
          px16Box([-1, -5, -7, 6, -3, 1]), // SE (E half)
          // stipe
          px16Box([-2, -8, -2, 2, -3, 2]),
        ],
      },
      tiles: [
        woodTopTexture,
        woodBottomTexture,
        woodRightTexture,
        woodSideTexture,
        woodSideTexture,
        woodFrontTexture,
      ],
    },
  });
}
