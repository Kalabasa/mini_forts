import { TaskPriority } from 'server/ai/colony/task';
import { BlockDefinition, BlockRefInstance } from 'server/block/block';
import { GameContext } from 'server/game/context';
import { WorkerCapabilities } from 'server/ai/colony/worker_capabilities';

export abstract class Operable<D extends BlockDefinition = BlockDefinition> {
  constructor(
    readonly blockRef: BlockRefInstance<D>,
    readonly position: Readonly<Vector3D>,
    protected readonly context: GameContext
  ) {}

  abstract shouldOperate(): TaskPriority | undefined;
  getOperatorPositions(): Vector3D[] {
    return WorkerCapabilities.getOperatePositions(this.position);
  }
}
