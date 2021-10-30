import { BlockDefinition } from 'server/block/block';
import { CoreCrystalProperties } from 'server/block/core_crystal/properties';
import { CoreCrystalScript } from 'server/block/core_crystal/script';

export const CoreCrystalDef = BlockDefinition.create(
  'core_crystal',
  CoreCrystalProperties,
  CoreCrystalScript
);
