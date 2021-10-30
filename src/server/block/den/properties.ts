import { BlockTag } from 'common/block/tag';
import { tex } from 'resource_id';
import { BlockProperties } from 'server/block/block';
import { GhostDefinition } from 'server/block/ghost';
import { MinionDef } from 'server/entity/minion/def';

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
    texture: 'tmp',
    inventoryImage: tex('den_icon.png'),
  };

  override scriptCallbacks = this.defineCallbacks({
    onTimer: true,
  });

  readonly nodeDefinition = this.defineNode({
    paramtype: 'light',
    drawtype: 'normal',
    tiles: ['tmp'],
    walkable: false,
  });
}
