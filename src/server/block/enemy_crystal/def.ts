import { BlockDefinition } from 'server/block/block';
import { EnemyCrystalProperties } from 'server/block/enemy_crystal/properties';
import { EnemyCrystalScript } from 'server/block/enemy_crystal/script';

export const EnemyCrystalDef = BlockDefinition.create(
  'enemy_crystal',
  EnemyCrystalProperties,
  EnemyCrystalScript
);
