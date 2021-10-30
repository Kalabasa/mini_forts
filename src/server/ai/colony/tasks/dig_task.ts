import { ActionResult } from 'server/ai/colony/action_result';
import { Agent } from 'server/ai/colony/agent';
import { Task } from 'server/ai/colony/task';
import { Tasks } from 'server/ai/colony/task_helper';
import { WorkerCapabilities } from 'server/ai/colony/worker_capabilities';
import { Locomotion } from 'server/entity/locomotion/locomotion';
import { Logger } from 'utils/logger';

export class DigTask extends Task {
  constructor(readonly position: Vector3D) {
    super();
  }

  getDestinations(): Vector3D[] {
    return WorkerCapabilities.getWorkPositions(this.position);
  }

  isStrictlyImpossible(): boolean {
    return WorkerCapabilities.getWorkPositions(this.position).every(
      (p) =>
        !Locomotion.passableNodeCost(WorkerCapabilities.locomotion.moveCost(p))
    );
  }

  estimateCost(agent: Agent): number {
    const path = agent.pathfinder.findAnyPath(
      agent.getVoxelPosition(),
      this.getDestinations()
    );
    return path.estimateCost();
  }

  execute(dt: number, agent: Agent): void {
    const path = Tasks.ensureValidPath(this, agent);
    if (!this.isActive()) return;

    const pathResult = Tasks.fulfillPath(this, agent, path);
    if (!this.isActive()) return;

    if (pathResult === ActionResult.Done) {
      Tasks.concludeOnAction(this, agent.workDiggable(this.position));
    }
  }

  [Logger.Props]() {
    return {
      pos: this.position,
    };
  }
}
