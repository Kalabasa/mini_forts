import { ActionResult } from 'server/ai/action_result';
import { Tasks } from 'server/ai/colony/task_helper';
import { BlockDefinition } from 'server/block/block';
import { Logger } from 'utils/logger';
import { BlockPhysics } from 'common/block/physics';
import { WorkerCapabilities } from 'server/ai/colony/worker_capabilities';
import { MinionAgent } from 'server/ai/colony/minion_agent';
import { MoveTask } from 'server/ai/colony/tasks/move_task';
import { ReadonlyGameContext } from 'server/game/context';
import { TaskManager } from '../task_manager';

export class BuildTask extends MoveTask {
  constructor(
    readonly position: Vector3D,
    readonly block: BlockDefinition.WithGhost
  ) {
    super(WorkerCapabilities.getWorkPositions(position));
  }

  override setContext(taskManager: TaskManager, context: ReadonlyGameContext): void {
    super.setContext(taskManager, context);
    this.moveDestinationBias = context.getHomePosition();
  }

  override get positionHint(): Vector3D {
    return this.position;
  }

  override isStrictlyImpossible(): boolean {
    if (!this.context.hasResource(this.block.properties.resource)) return true;
    if (!BlockPhysics.canSupport(this.block, this.position)) return true;
    return super.isStrictlyImpossible();
  }

  override execute(dt: number, agent: MinionAgent): ActionResult {
    const expectResult = Tasks.expectNode(this, this.block.registry.ghost.name);
    if (expectResult !== ActionResult.Done) return expectResult;

    const moveResult = super.execute(dt, agent);
    if (moveResult !== ActionResult.Done) return moveResult;

    return agent.workBuildable(this.position);
  }

  [Logger.Props]() {
    return {
      pos: this.position,
      block: this.block.name,
    };
  }
}
