import { ActionResult } from 'server/ai/colony/action_result';
import { MinionAgent } from 'server/ai/colony/minion_agent';
import { Operable } from 'server/ai/colony/operable';
import { MoveTask } from 'server/ai/colony/tasks/move_task';
import { Logger } from 'utils/logger';

export class OperateTask extends MoveTask {
  readonly position: Vector3D;

  constructor(readonly operable: Operable) {
    super(operable.getOperatorPositions());
    this.position = operable.position;
  } 

  override isStrictlyImpossible(): boolean {
    return (
      super.isStrictlyImpossible() || this.operable.shouldOperate() == undefined
    );
  }

  override execute(dt: number, agent: MinionAgent): ActionResult {
    const moveResult = super.execute(dt, agent);
    if (moveResult !== ActionResult.Done) return moveResult;

    return agent.operateOperable(this.operable);
  }

  [Logger.Props]() {
    return {
      pos: this.position,
      operable: this.operable.blockRef,
    };
  }
}
