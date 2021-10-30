import { BlockDefinition } from 'server/block/block';
import { SoilProperties } from 'server/block/soil/properties';

export const SoilDef = BlockDefinition.create('soil', SoilProperties);
