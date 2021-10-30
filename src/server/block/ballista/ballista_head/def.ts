import { BallistaBolt } from 'server/block/ballista/ballista_head/ballista_bolt';
import { BallistaHeadProperties } from 'server/block/ballista/ballista_head/properties';
import { BallistaHeadScript } from 'server/block/ballista/ballista_head/script';
import { EntityDefinition } from 'server/entity/entity';

export const BallistaHeadDef = EntityDefinition.create(
  'BallistaHead',
  BallistaHeadProperties,
  BallistaHeadScript,
  () => minetest.register_entity(BallistaBolt.name, BallistaBolt.entityDef)
);
