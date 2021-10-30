import { BlockDefinition } from 'server/block/block';
import { DoorProperties } from 'server/block/door/properties';
import { DoorScript } from 'server/block/door/script';

export const DoorDef = BlockDefinition.create(
  'door',
  DoorProperties,
  DoorScript
);
