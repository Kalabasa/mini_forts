import { AutotileBlockScript } from 'server/block/autotile_block/autotile_block';
import { BlockDefinition } from 'server/block/block';
import { createDamagedBlockScript } from 'server/block/damaged_block/damaged_block';
import { WallProperties } from 'server/block/wall/properties';

const WallScript = createDamagedBlockScript({
  base: AutotileBlockScript.asClass2<WallProperties>(),
});

export const WallDef = BlockDefinition.create(
  'wall',
  WallProperties,
  WallScript
);
