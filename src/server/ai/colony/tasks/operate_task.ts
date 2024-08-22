import { ActionResult } from 'server/ai/action_result';
import { MinionAgent } from 'server/ai/colony/minion_agent';
import { MoveTask } from 'server/ai/colony/tasks/move_task';
import { Logger } from 'utils/logger';
import { OperableBlockRef } from '../operable';

export class OperateTask extends MoveTask {
  readonly position: Vector3D;

  constructor(readonly operable: OperableBlockRef) {
    super(operable.getOperatePositions());
    this.position = operable.position;
  }

  override get positionHint(): Vector3D {
    return this.position;
  }

  override isStrictlyImpossible(): boolean {
    return (
      super.isStrictlyImpossible() || this.operable.shouldOperate() == null
    );
  }

  override execute(dt: number, agent: MinionAgent): ActionResult {
    const moveResult = super.execute(dt, agent);
    if (moveResult !== ActionResult.Done) return moveResult;

    const operateResult = agent.operateOperable(this.operable);
    if (operateResult === ActionResult.Stopped) {
      const operatePositions = this.operable.getOperatePositions();
      if (operatePositions.length === 0) return ActionResult.Impossible;
      this.updateDestinations(operatePositions);
    }
    return operateResult;
  }

  [Logger.Props]() {
    return {
      pos: this.position,
      operable: this.operable,
    };
  }
}
