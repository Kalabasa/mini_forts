import { ActionResult } from "server/ai/action_result";
import { MinionAgent } from "server/ai/colony/minion_agent";
import { MoveTask } from "server/ai/colony/tasks/move_task";
import { Logger } from "utils/logger";

export class HealAtDenTask extends MoveTask {
  constructor(readonly position: Vector3D) {
    super([position]);
  }

  override get positionHint(): Vector3D {
    return this.position;
  }

  override execute(dt: number, agent: MinionAgent): ActionResult {
    const moveResult = super.execute(dt, agent);
    if (moveResult !== ActionResult.Done) return moveResult;

    return agent.getHealth() < agent.getMaxHealth()
      ? ActionResult.Ongoing
      : ActionResult.Done;
  }

  [Logger.Props]() {
    return {
      pos: this.position,
    };
  }
}
