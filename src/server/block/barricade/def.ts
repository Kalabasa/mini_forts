import { BarricadeProperties } from 'server/block/barricade/properties';
import { BarricadeScript } from 'server/block/barricade/script';
import { BlockDefinition } from 'server/block/block';

export const BarricadeDef = BlockDefinition.create(
  'barricade',
  BarricadeProperties,
  BarricadeScript
);
