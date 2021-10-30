import { BlockDefinition } from 'server/block/block';
import { ExtractorProperties } from 'server/block/extractor/properties';
import { ExtractorScript } from 'server/block/extractor/script';

export const ExtractorDef = BlockDefinition.create(
  'extractor',
  ExtractorProperties,
  ExtractorScript
);
