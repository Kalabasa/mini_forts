import { BlockTag } from 'common/block/tag';
import { tex } from 'resource_id';
import { createAutotileBlockProperties } from 'server/block/autotile_block/autotile_block';
import { ColumnAutotile } from 'server/block/autotile_block/column';
import { createDamagedBlockProperties } from 'server/block/damaged_block/damaged_block';
import { GhostDefinition } from 'server/block/ghost';
import { ResourceType } from 'server/game/resources';

const autotileTexture = tex('wall_tiles.png');
const ghostTexture = tex('wall_ghost.png');

const damagedSheet = 'sheet:3x2';

const wallDamagedPng = 'wall_damaged.png';
const damaged1TopTexture = tex(wallDamagedPng, `^[${damagedSheet}:1,0`);
const damaged1SideTexture = tex(wallDamagedPng, `^[${damagedSheet}:0,0`);
const damaged1BottomTexture = tex(wallDamagedPng, `^[${damagedSheet}:2,0`);
const damaged2TopTexture = tex(wallDamagedPng, `^[${damagedSheet}:1,1`);
const damaged2SideTexture = tex(wallDamagedPng, `^[${damagedSheet}:0,1`);
const damaged2BottomTexture = tex(wallDamagedPng, `^[${damagedSheet}:2,1`);

const AutotileProperties = createAutotileBlockProperties({
  autotile: new ColumnAutotile(autotileTexture),
});

const DamagedAutotileProperties = createDamagedBlockProperties({
  base: AutotileProperties,
  damagedNodes: [
    {
      name: 'damaged',
      maxHealth: 70,
      nodeDefinition: {
        drawtype: 'normal',
        tiles: [
          damaged1TopTexture,
          damaged1BottomTexture,
          damaged1SideTexture,
          damaged1SideTexture,
          damaged1SideTexture,
          damaged1SideTexture,
        ],
      },
    },
    {
      name: 'damaged2',
      maxHealth: 40,
      nodeDefinition: {
        drawtype: 'normal',
        tiles: [
          damaged2TopTexture,
          damaged2BottomTexture,
          damaged2SideTexture,
          damaged2SideTexture,
          damaged2SideTexture,
          damaged2SideTexture,
        ],
      },
    },
  ],
});

export class WallProperties extends DamagedAutotileProperties {
  override health = 100;
  override digTime = 4;

  override physics = {
    attachment: BlockTag.PhysicsAttachmentDiagonalDown,
    support: BlockTag.PhysicsSupportAll,
  };

  override resource = {
    type: ResourceType.Stone,
    amount: 15,
  };

  override tags = this.defineTags({
    BreakableBuilding: BlockTag.BreakableBuildingTrue,
  });

  override ghost: GhostDefinition = {
    buildTime: 4,
    buildStyle: BlockTag.BuildStyleMulti,
    texture: ghostTexture,
    inventoryImage: tex('wall_icon.png'),
  };

  override damagedStatesOverride = [...this.autotileTiles.keys()];
}
