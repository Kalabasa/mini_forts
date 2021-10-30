import { BlockTag } from 'common/block/tag';
import { globals } from 'common/globals';
import { tex } from 'resource_id';
import { BlockProperties } from 'server/block/block';
import { Immutable } from 'utils/immutable';
import { toColorString } from 'utils/string';

export const Ghost = {
  defineNode: defineGhostNode,
  getInventoryImage,
};

const frameTexture = tex('ghost_frame.png');
const flatSideTexture = tex('ghost_flat_side.png');
const ghostColor = '#' + toColorString(globals.colors.uiBlue);

export type GhostDefinition = Immutable<CubeGhost | FlatGhost | CustomGhost>;

type BaseGhostProperties = {
  buildTime: number;
  buildStyle: BlockTag.Code<'BuildStyle'>;
};

type CubeGhost = BaseGhostProperties & {
  texture: string;
  inventoryImage: string;
  nodeDef?: Partial<NodeDefinition>;
};

type FlatGhost = BaseGhostProperties & {
  flatTexture: string;
  inventoryImage: string;
  nodeDef?: Partial<NodeDefinition>;
};

type CustomGhost = BaseGhostProperties & {
  nodeDef?: Partial<NodeDefinition> &
    Pick<NodeDefinition, 'drawtype' | 'tiles' | 'inventory_image'>;
};

function isCube(ghostDef: GhostDefinition): ghostDef is CubeGhost {
  return 'texture' in ghostDef;
}

function isFlat(ghostDef: GhostDefinition): ghostDef is FlatGhost {
  return 'flatTexture' in ghostDef;
}

function isCustom(ghostDef: GhostDefinition): ghostDef is CustomGhost {
  return !isCube(ghostDef) && !isFlat(ghostDef);
}

function defineGhostNode<T extends GhostDefinition>(
  ghostDef: T,
  tags: BlockProperties.Tags
): NodeDefinition {
  const base: Partial<NodeDefinition> = {
    selection_box: { type: 'fixed', fixed: [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5] },
    inventory_image:
      'inventoryImage' in ghostDef ? ghostDef.inventoryImage : undefined,
    paramtype: 'light',
    use_texture_alpha: 'blend',
    sunlight_propagates: true,
    diggable: false,
    walkable: false,
    groups: BlockTag.defineGroups({
      ...tags,
      Ghost: BlockTag.GhostTrue,
      BuildStyle: ghostDef.buildStyle,
    }),
  };

  let visuals: Partial<NodeDefinition>;
  if (isCube(ghostDef)) {
    visuals = {
      drawtype: 'glasslike_framed',
      tiles: [
        frameTexture,
        `${ghostDef.texture}^[colorize:${ghostColor}:alpha^[opacity:140`,
      ],
    };
  } else if (isFlat(ghostDef)) {
    const topTexture = `${ghostDef.flatTexture}^[colorize:${ghostColor}^${frameTexture}`;
    visuals = {
      drawtype: 'nodebox',
      node_box: {
        type: 'fixed',
        fixed: [-0.5, -0.5, -0.5, 0.5, 0, 0.5],
      },
      tiles: [
        topTexture,
        topTexture,
        flatSideTexture,
        flatSideTexture,
        flatSideTexture,
        flatSideTexture,
      ],
    };
  } else {
    visuals = {};
  }

  return {
    ...base,
    ...visuals,
    ...ghostDef.nodeDef,
  } as NodeDefinition;
}

function getInventoryImage(
  ghostDef: GhostDefinition
): Readonly<NodeDefinition['inventory_image']> {
  return 'inventoryImage' in ghostDef
    ? ghostDef.inventoryImage
    : ghostDef.nodeDef
    ? ghostDef.nodeDef.inventory_image
    : globals.textures.blank;
}
