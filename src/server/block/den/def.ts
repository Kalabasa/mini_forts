import { BlockDefinition } from 'server/block/block';
import { DenProperties } from 'server/block/den/properties';
import { DenScript } from 'server/block/den/script';

export const DenDef = BlockDefinition.create('den', DenProperties, DenScript);
