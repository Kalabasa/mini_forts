import { TaskPriority } from 'server/ai/colony/task';
import {
  BlockDefinition,
  BlockRef,
  BlockRefInstance,
} from 'server/block/block';
import { GameContext } from 'server/game/context';

export abstract class Operable<D extends BlockDefinition = BlockDefinition> {
  constructor(
    readonly blockRef: BlockRefInstance<D>,
    readonly position: Readonly<Vector3D>,
    protected readonly context: GameContext
  ) {}

  abstract shouldOperate(): TaskPriority | undefined;
  abstract startOperation(): void;
  abstract endOperation(): void;
}
