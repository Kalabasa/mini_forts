import { Agent } from 'server/ai/colony/agent';
import { ActionResult } from 'server/ai/colony/action_result';
import { Task } from 'server/ai/colony/task';
import { Tasks } from 'server/ai/colony/task_helper';
import { Logger } from 'utils/logger';
import { Locomotion } from 'server/entity/locomotion/locomotion';
import { Operable } from 'server/ai/colony/operable';
import { WorkerCapabilities } from 'server/ai/colony/worker_capabilities';

export class OperateTask extends Task {
  readonly position: Vector3D;

  constructor(readonly operable: Operable) {
    super();
    this.position = operable.position;
  }

  getDestinations(): Vector3D[] {
    return WorkerCapabilities.getOperatePositions(this.position);
  }

  isStrictlyImpossible(): boolean {
    // todo: Check ammo for weapon

    return WorkerCapabilities.getOperatePositions(this.position).every(
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
      Tasks.concludeOnAction(this, agent.operateOperable(this.operable));
    }
  }

  [Logger.Props]() {
    return {
      pos: this.position,
      operable: this.operable.blockRef,
    };
  }
}
