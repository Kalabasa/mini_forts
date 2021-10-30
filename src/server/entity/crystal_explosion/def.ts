import { CrystalExplosionProperties } from 'server/entity/crystal_explosion/properties';
import { CrystalExplosionScript } from 'server/entity/crystal_explosion/script';
import { EntityDefinition } from 'server/entity/entity';

export const CrystalExplosionDef = EntityDefinition.create(
  'CrystalExplosion',
  CrystalExplosionProperties,
  CrystalExplosionScript
);
