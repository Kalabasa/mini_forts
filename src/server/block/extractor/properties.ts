import { BlockTag } from 'common/block/tag';
import { tex } from 'resource_id';
import { BlockProperties } from 'server/block/block';
import { GhostDefinition } from 'server/block/ghost';
import { Resource, ResourceType } from 'server/game/resources';
import { px16Box } from 'utils/math';

const metalExtractorPng = 'metal_extractor.png';
const sporeExtractorPng = 'spore_extractor.png';
const stoneExtractorPng = 'stone_extractor.png';
const woodExtractorPng = 'wood_extractor.png';
const ghostTexture = tex(woodExtractorPng, '^[sheet:5x4:4,0');

const unripeNodeBox: NodeBox = {
  type: 'fixed',
  fixed: [
    // conks
    px16Box([-6, -1, 1, 1, 1, 6]), // NW (N half)
    px16Box([-6, -1, -4, -1, 1, 1]), // NW (S half)
    px16Box([-1, -2, -1, 6, 0, 5]), // NE (N half)
    px16Box([1, -2, -2, 6, 0, -1]), // NE (S half)
    px16Box([-3, -3, -6, -1, -1, -1]), // SE (W half)
    px16Box([-1, -3, -6, 5, -1, 1]), // SE (E half)
    // stipe
    px16Box([-3, -8, -3, 3, -1, 3]),
  ],
};

const ripeNodeBox: NodeBox = {
  type: 'fixed',
  fixed: [
    // conks
    px16Box([-7, -1, 1, 1, 1, 7]), // NW (N half)
    px16Box([-7, -1, -5, -1, 1, 1]), // NW (S half)
    px16Box([-1, -2, -1, 7, 0, 6]), // NE (N half)
    px16Box([1, -2, -3, 7, 0, -1]), // NE (S half)
    px16Box([-4, -3, -7, -1, -1, -1]), // SE (W half)
    px16Box([-1, -3, -7, 6, -1, 1]), // SE (E half)
    // stipe
    px16Box([-3, -8, -3, 3, -1, 3]),
  ],
};

const baseNodeDef: Omit<NodeDefinition, 'tiles' | 'node_box'> = {
  collision_box: {
    type: 'fixed',
    fixed: [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5],
  },
  selection_box: {
    type: 'fixed',
    fixed: [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5],
  },
  drawtype: 'nodebox',
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
    Operable: BlockTag.OperableTrue,
    BreakableBuilding: BlockTag.BreakableBuildingTrue,
  });

  override scriptCallbacks = this.defineCallbacks({
    onTimer: true,
  });

  override ghost: GhostDefinition = {
    buildTime: 4,
    buildStyle: BlockTag.BuildStyleSingle,
    flatTexture: ghostTexture,
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
      node_box: unripeNodeBox,
      tiles: makeTileSet(metalExtractorPng),
    },
    spore: {
      ...baseNodeDef,
      node_box: unripeNodeBox,
      tiles: makeTileSet(sporeExtractorPng),
    },
    stone: {
      ...baseNodeDef,
      node_box: unripeNodeBox,
      tiles: makeTileSet(stoneExtractorPng),
    },
    wood: {
      ...baseNodeDef,
      node_box: unripeNodeBox,
      tiles: makeTileSet(woodExtractorPng),
    },
    metalRipe: {
      ...baseNodeDef,
      node_box: ripeNodeBox,
      tiles: makeTileSet(metalExtractorPng),
    },
    sporeRipe: {
      ...baseNodeDef,
      node_box: ripeNodeBox,
      tiles: makeTileSet(sporeExtractorPng),
    },
    stoneRipe: {
      ...baseNodeDef,
      node_box: ripeNodeBox,
      tiles: makeTileSet(stoneExtractorPng),
    },
    woodRipe: {
      ...baseNodeDef,
      node_box: ripeNodeBox,
      tiles: makeTileSet(woodExtractorPng),
    },
  });
}

function makeTileSet(
  png
): [
  TileDefinition,
  TileDefinition,
  TileDefinition,
  TileDefinition,
  TileDefinition,
  TileDefinition
] {
  const topAnimTexture = tex(png, '^[sheet:5x1:0,0');
  const bottomTexture = tex(png, '^[sheet:5x4:1,0', '^[transformFY');
  const frontTexture = tex(png, '^[sheet:5x4:2,0');
  const rightTexture = tex(png, '^[sheet:5x4:3,0');
  const sideTexture = tex(png, '^[sheet:5x4:4,0');

  return [
    {
      name: topAnimTexture,
      animation: {
        type: 'vertical_frames',
        aspect_w: 16,
        aspect_h: 16,
        length: 0.5,
      },
    },
    bottomTexture,
    rightTexture,
    sideTexture,
    sideTexture,
    frontTexture,
  ];
}
