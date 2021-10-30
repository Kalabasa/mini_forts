import { CrystalShieldProperties } from 'server/block/core_crystal/crystal_shield/properties';
import { CrystalShieldScript } from 'server/block/core_crystal/crystal_shield/script';
import { EntityDefinition } from 'server/entity/entity';

export const CrystalShieldDef = EntityDefinition.create(
  'CrystalShield',
  CrystalShieldProperties,
  CrystalShieldScript
);
