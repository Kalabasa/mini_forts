import { Agent } from 'server/ai/colony/agent';
import { ActionResult } from 'server/ai/colony/action_result';
import { Task } from 'server/ai/colony/task';
import { Tasks } from 'server/ai/colony/task_helper';
import { BlockDefinition } from 'server/block/block';
import { Logger } from 'utils/logger';
import { Locomotion } from 'server/entity/locomotion/locomotion';
import { BlockPhysics } from 'common/block/physics';
import { WorkerCapabilities } from 'server/ai/colony/worker_capabilities';

export class BuildTask extends Task {
  constructor(
    readonly position: Vector3D,
    readonly block: BlockDefinition.WithGhost
  ) {
    super();
  }

  getDestinations(): Vector3D[] {
    return WorkerCapabilities.getWorkPositions(this.position);
  }

  isStrictlyImpossible(): boolean {
    if (!this.context.hasResource(this.block.properties.resource)) return true;
    if (!BlockPhysics.canSupport(this.block, this.position)) return true;

    return WorkerCapabilities.getWorkPositions(this.position).every(
      (p) =>
        !Locomotion.passableNodeCost(WorkerCapabilities.locomotion.moveCost(p))
    );
  }

  estimateCost(agent: Agent): number {
    if (this.isStrictlyImpossible()) {
      return Infinity;
    }

    const path = agent.pathfinder.findAnyPath(
      agent.getVoxelPosition(),
      this.getDestinations()
    );
    return path.estimateCost();
  }

  execute(dt: number, agent: Agent): void {
    Tasks.expectNode(this, this.block.registry.ghost.name);
    if (!this.isActive()) return;

    const path = Tasks.ensureValidPath(this, agent);
    if (!this.isActive()) return;

    const pathResult = Tasks.fulfillPath(this, agent, path);
    if (!this.isActive()) return;

    if (pathResult === ActionResult.Done) {
      Tasks.concludeOnAction(this, agent.workBuildable(this.position));
    }
  }

  [Logger.Props]() {
    return {
      pos: this.position,
      block: this.block.name,
    };
  }
}
