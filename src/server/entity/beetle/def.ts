import { BeetleProperties } from 'server/entity/beetle/properties';
import { BeetleScript } from 'server/entity/beetle/script';
import { EntityDefinition } from 'server/entity/entity';

export const BeetleDef = EntityDefinition.create(
  'Beetle',
  BeetleProperties,
  BeetleScript
);
