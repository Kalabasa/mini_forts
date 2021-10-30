import { BallistaProperties } from 'server/block/ballista/properties';
import { BallistaScript } from 'server/block/ballista/script';
import { BlockDefinition } from 'server/block/block';

export const BallistaDef = BlockDefinition.create(
  'ballista',
  BallistaProperties,
  BallistaScript
);
