import { ActionResult } from 'server/ai/colony/action_result';
import { Task } from 'server/ai/colony/task';
import { Tasks } from 'server/ai/colony/task_helper';
import { Logger } from 'utils/logger';
import { MinionAgent } from 'server/ai/colony/minion_agent';

export class HealAtDenTask extends Task {
  constructor(readonly position: Vector3D) {
    super();
  }

  getDestinations(): Vector3D[] {
    return [this.position];
  }

  isStrictlyImpossible(): boolean {
    return false;
  }

  estimateCost(agent: MinionAgent): number {
    const path = agent.pathfinder.findAnyPath(
      agent.getVoxelPosition(),
      this.getDestinations()
    );
    return path.estimateCost();
  }

  execute(dt: number, agent: MinionAgent): void {
    const path = Tasks.ensureValidPath(this, agent);
    if (!this.isActive()) return;

    const pathResult = Tasks.fulfillPath(this, agent, path);
    if (!this.isActive()) return;

    if (pathResult === ActionResult.Done) {
      if (agent.getHealth() >= agent.getMaxHealth()) {
        this.end();
      }
    }
  }

  [Logger.Props]() {
    return {
      pos: this.position,
    };
  }
}
