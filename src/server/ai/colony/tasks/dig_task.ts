import { ActionResult } from "server/ai/action_result";
import { MinionAgent } from "server/ai/colony/minion_agent";
import { MoveTask } from "server/ai/colony/tasks/move_task";
import { WorkerCapabilities } from "server/ai/colony/worker_capabilities";
import { Logger } from "utils/logger";

export class DigTask extends MoveTask {
  constructor(readonly position: Vector3D) {
    super(WorkerCapabilities.getWorkPositions(position));
  }

  override execute(dt: number, agent: MinionAgent): ActionResult {
    const moveResult = super.execute(dt, agent);
    if (moveResult !== ActionResult.Done) return moveResult;

    return agent.workDiggable(this.position);
  }

  [Logger.Props]() {
    return {
      pos: this.position,
    };
  }
}
