import { BlockTag } from 'common/block/tag';
import { tex } from 'resource_id';
import { BallistaHeadDef } from 'server/block/ballista/ballista_head/def';
import { EntityBlockProperties } from 'server/block/entity_block/enity_block';
import { GhostDefinition } from 'server/block/ghost';
import { ResourceType } from 'server/game/resources';
import { px16Box } from 'utils/math';

const ballistaStandPng = 'ballista_stand.png';
const standTopTexture = tex(ballistaStandPng, '^[sheet:2x1:1,0');
const standSideTexture = tex(ballistaStandPng, '^[sheet:2x1:0,0');

const ballistaGhostTexture = tex('ballista_ghost.png');

export class BallistaProperties extends EntityBlockProperties(BallistaHeadDef) {
  override digTime = 4;
  override health = 20;

  override physics = {
    attachment: BlockTag.PhysicsAttachmentDown,
  };

  override resource = {
    type: ResourceType.Wood,
    amount: 40,
  };

  override tags = this.defineTags({
    Use: BlockTag.UseOpenBallistaMenu,
    Operable: BlockTag.OperableTrue,
    BreakableBuilding: BlockTag.BreakableBuildingTrue,
  });

  override ghost: GhostDefinition = {
    buildTime: 4,
    buildStyle: BlockTag.BuildStyleSingle,
    flatTexture: ballistaGhostTexture,
    inventoryImage: tex('ballista_head.png', `^[sheet:3x8:0,0`),
  };

  nodeDefinition = this.defineNode({
    collision_box: { type: 'fixed', fixed: [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5] },
    selection_box: { type: 'fixed', fixed: [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5] },
    paramtype: 'light',
    drawtype: 'nodebox',
    node_box: {
      type: 'fixed',
      fixed: [
        px16Box([-1, -8, -1, 1, -0.01, 1]),
        px16Box([-8, -8, -1, 8, -6, 1]),
        px16Box([-1, -8, -8, 1, -6, 8]),
      ],
    },
    tiles: [
      standTopTexture,
      standTopTexture,
      standSideTexture,
      standSideTexture,
      standSideTexture,
      standSideTexture,
    ],
  });
}
