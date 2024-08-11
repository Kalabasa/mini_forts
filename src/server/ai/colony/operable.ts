import {
  BlockDefinition,
  BlockProperties,
  BlockRefInstance,
} from 'server/block/block';

export type OperableBlockRef = BlockRefInstance<
  BlockDefinition<BlockProperties.WithTag<'Operable', 'True'>>
>;
