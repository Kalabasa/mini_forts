import { BlockTag } from 'common/block/tag';
import { tex } from 'resource_id';
import { BlockProperties } from 'server/block/block';
import { GhostDefinition } from 'server/block/ghost';
import { MinionDef } from 'server/entity/minion/def';
import { unreachableCase } from 'utils/error';
import { Mutable } from 'utils/immutable';
import { px16Box } from 'utils/math';

const frontTexture = tex('den.png', '^[sheet:4x2:0,0');
const leftTexture = tex('den.png', '^[sheet:4x2:1,0');
const backTexture = tex('den.png', '^[sheet:4x2:2,0');
const rightTexture = tex('den.png', '^[sheet:4x2:3,0');
const topTexture = tex('den.png', '^[sheet:4x2:0,1');
const bottomTexture = tex('den.png', '^[sheet:4x2:1,1');
const ghostTexture = tex('den_ghost.png');

const baseNodeDef = {
  paramtype: 'light',
  drawtype: 'nodebox',
  node_box: {
    type: 'fixed',
    fixed: [
      px16Box([-7, 1, -7, 7, 8, 7]),
      // roof bottom back
      px16Box([-7, -3, -7, 7, 1, -5]),
      px16Box([-8, -3, -8, 8, -1, -5]),
      // roof bottom left
      px16Box([-7, -3, -7, -5, 1, 7]),
      px16Box([-8, -3, -8, -5, -1, 8]),
      // roof bottom right
      px16Box([5, -3, -7, 7, 1, 7]),
      px16Box([5, -3, -8, 8, -1, 8]),
      // roof front arch
      px16Box([-8, -3, 6, -6, -1, 8]),
      px16Box([-6, -3, 7, -5, 3, 8]),
      px16Box([-5, 1, 7, 5, 3, 8]),
      px16Box([5, -3, 7, 6, 3, 8]),
      px16Box([6, -3, 6, 8, -1, 8]),
      // body
      px16Box([-6, -8, -6, 6, 1, 6]),
    ],
  },
  collision_box: {
    type: 'fixed',
    fixed: [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5],
  },
  selection_box: {
    type: 'fixed',
    fixed: [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5],
  },
  tiles: [
    topTexture,
    bottomTexture,
    leftTexture,
    rightTexture,
    frontTexture,
    backTexture,
  ],
  walkable: false,
} as const;

export class DenProperties extends BlockProperties {
  override digTime = 4;
  override health = 50;

  override physics = {
    attachment: BlockTag.PhysicsAttachmentDown,
  };

  override resource = MinionDef.properties.spawnRequirement;

  override tags = this.defineTags({
    Use: BlockTag.UseOpenDenMenu,
    BreakableBuilding: BlockTag.BreakableBuildingTrue,
  });

  override ghost: GhostDefinition = {
    buildTime: 4,
    buildStyle: BlockTag.BuildStyleSingle,
    flatTexture: ghostTexture,
    inventoryImage: tex('den_icon.png'),
  };

  override scriptCallbacks = this.defineCallbacks({
    onTimer: true,
  });

  readonly nodeDefinition = this.defineNodes({
    default: getRotatedNodeDef(0),
    rot1: getRotatedNodeDef(1),
    rot2: getRotatedNodeDef(2),
    rot3: getRotatedNodeDef(3),
  });
}

// Rotates the node definition's tiles and boxes in 90-degree increments around the y-axis (clockwise looking down from above)
function getRotatedNodeDef(rotation: 0 | 1 | 2 | 3): NodeDefinition {
  return {
    ...baseNodeDef,
    tiles: [
      baseNodeDef.tiles[0], // top
      baseNodeDef.tiles[1], // bottom
      baseNodeDef.tiles[[2, 4, 3, 5][rotation]],
      baseNodeDef.tiles[[3, 5, 2, 4][rotation]],
      baseNodeDef.tiles[[4, 3, 5, 2][rotation]],
      baseNodeDef.tiles[[5, 2, 4, 3][rotation]],
    ],
    node_box: {
      ...baseNodeDef.node_box,
      fixed: baseNodeDef.node_box.fixed.map((box) => rotateBox(box, rotation)),
    },
  } as Mutable<typeof baseNodeDef>;
}

function rotateBox(
  [x1, y1, z1, x2, y2, z2]: [number, number, number, number, number, number],
  rotation: 0 | 1 | 2 | 3
): [number, number, number, number, number, number] {
  if (rotation === 0) {
    return [x1, y1, z1, x2, y2, z2];
  } else if (rotation === 1) {
    return [z1, y1, -x2, z2, y2, -x1];
  } else if (rotation === 2) {
    return [-x2, y1, -z2, -x1, y2, -z1];
  } else if (rotation === 3) {
    return [-z2, y1, x1, -z1, y2, x2];
  } else {
    unreachableCase(rotation);
  }
}
