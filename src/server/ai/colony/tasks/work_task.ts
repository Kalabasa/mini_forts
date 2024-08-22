import { ActionResult } from 'server/ai/action_result';
import { MinionAgent } from 'server/ai/colony/minion_agent';
import { MoveTask } from 'server/ai/colony/tasks/move_task';
import { WorkerCapabilities } from 'server/ai/colony/worker_capabilities';
import { Logger } from 'utils/logger';
import { TaskManager } from '../task_manager';
import { ReadonlyGameContext } from 'server/game/context';

export abstract class WorkTask extends MoveTask {
  constructor(readonly position: Vector3D) {
    super(WorkerCapabilities.getWorkPositions(position));
  }

  override setContext(
    taskManager: TaskManager,
    context: ReadonlyGameContext
  ): void {
    super.setContext(taskManager, context);
    this.moveDestinationBias = context.getHomePosition();
  }

  override get positionHint(): Vector3D {
    return this.position;
  }

  override isStrictlyImpossible(): boolean {
    const workPositions = WorkerCapabilities.getWorkPositions(this.position);
    if (workPositions.length === 0) return true;
    this.updateDestinations(workPositions);
    return super.isStrictlyImpossible();
  }

  override execute(dt: number, agent: MinionAgent): ActionResult {
    const moveResult = super.execute(dt, agent);
    if (moveResult !== ActionResult.Done) return moveResult;

    const workResult = this.executeWork(dt, agent);
    if (workResult === ActionResult.Stopped) {
      const workPositions = WorkerCapabilities.getWorkPositions(this.position);
      if (workPositions.length === 0) return ActionResult.Impossible;
      this.updateDestinations(workPositions);
    }
    return workResult;
  }

  abstract executeWork(dt: number, agent: MinionAgent): ActionResult;

  [Logger.Props]() {
    return {
      pos: this.position,
    };
  }
}
