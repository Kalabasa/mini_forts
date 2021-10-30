import { BlockDefinition } from 'server/block/block';
import { FertileSoilProperties } from 'server/block/fertile_soil/properties';

export const FertileSoilDef = BlockDefinition.create(
  'fertile_soil',
  FertileSoilProperties
);
