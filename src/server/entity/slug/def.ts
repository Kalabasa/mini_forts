import { EntityDefinition } from 'server/entity/entity';
import { SlugProperties } from 'server/entity/slug/properties';
import { SlugScript } from 'server/entity/slug/script';

export const SlugDef = EntityDefinition.create(
  'Slug',
  SlugProperties,
  SlugScript
);
