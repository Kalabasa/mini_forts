import { ActionResult } from 'server/ai/colony/action_result';
import { MinionAgent } from 'server/ai/colony/minion_agent';
import { Task } from 'server/ai/colony/task';
import { Tasks } from 'server/ai/colony/task_helper';
import { WorkerCapabilities } from 'server/ai/colony/worker_capabilities';
import { Path } from 'server/ai/pathfinder/path';
import { Locomotion } from 'server/entity/locomotion/locomotion';

const pathToDestination = Symbol();

export class MoveTask extends Task {
  constructor(
    public destinations: Vector3D[],
    readonly priorityCenter: Vector3D | undefined = undefined
  ) {
    super();
  }

  protected updateDestinations(destinations: Vector3D[]) {
    if (destinationsKey(this.destinations) !== destinationsKey(destinations)) {
      this.destinations = destinations;
      delete this.memory[pathToDestination];
    }
  }

  override isStrictlyImpossible(): boolean {
    return this.destinations.every(
      (p) =>
        !Locomotion.passableNodeCost(WorkerCapabilities.locomotion.moveCost(p))
    );
  }

  override estimateCost(agent: MinionAgent): number {
    if (this.isStrictlyImpossible()) {
      return Infinity;
    }

    const path = this.getPath(agent);
    return path.estimateCost();
  }

  override execute(dt: number, agent: MinionAgent): ActionResult {
    const path = this.getPath(agent);

    if (!path.exists()) {
      return ActionResult.Stopped;
    }

    const moveResult = agent.followPath(path);

    if (moveResult === ActionResult.Stopped) {
      path.restart(agent.getVoxelPosition());
      return agent.followPath(path);
    }

    return moveResult;
  }

  getPath(agent: MinionAgent): Path {
    return Tasks.remember(this, pathToDestination, () => {
      const agentPos = agent.getVoxelPosition();
      return this.priorityCenter
        ? agent.pathfinder.findPriorityPath(
            agentPos,
            this.destinations.map((pos) => ({
              pos,
              // todo: normalize so nearest dest is 0
              extraCost: 1 / (1 + vector.distance(agentPos, pos)),
            }))
          )
        : agent.pathfinder.findAnyPath(agentPos, this.destinations);
    });
  }
}

function destinationsKey(destinations: Vector3D[]) {
  return destinations
    .map((d) => `${d.x},${d.y}${d.z}`)
    .sort()
    .join(':');
}
