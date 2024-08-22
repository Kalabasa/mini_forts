import { ActionResult } from 'server/ai/action_result';
import { MinionAgent } from 'server/ai/colony/minion_agent';
import { WorkTask } from 'server/ai/colony/tasks/work_task';

export class DigTask extends WorkTask {
  constructor(position: Vector3D) {
    super(position);
  }

  override executeWork(dt: number, agent: MinionAgent): ActionResult {
    return agent.workDiggable(this.position);
  }
}
