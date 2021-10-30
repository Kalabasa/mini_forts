import { EntityDefinition } from 'server/entity/entity';
import { MinionProperties } from 'server/entity/minion/properties';
import { MinionScript } from 'server/entity/minion/script';

export const MinionDef = EntityDefinition.create(
  'Minion',
  MinionProperties,
  MinionScript
);
