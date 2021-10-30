import { EntityDefinition } from 'server/entity/entity';
import { SnailProperties } from 'server/entity/snail/properties';
import { SnailScript } from 'server/entity/snail/script';

export const SnailDef = EntityDefinition.create(
  'Snail',
  SnailProperties,
  SnailScript
);
