import { ActionResult } from 'server/ai/action_result';
import { MinionAgent } from 'server/ai/colony/minion_agent';
import { Task } from 'server/ai/colony/task';
import { Tasks } from 'server/ai/colony/task_helper';
import { WorkerCapabilities } from 'server/ai/colony/worker_capabilities';
import { Path } from 'server/ai/pathfinder/path';
import { Paths } from 'server/ai/pathfinder/path_helper';
import { Locomotion } from 'server/entity/locomotion/locomotion';
import { throwError } from 'utils/error';

const pathToDestination = Symbol();

export class MoveTask extends Task {
  constructor(
    private destinations: Vector3D[],
    protected moveDestinationBias: Vector3D | undefined = undefined
  ) {
    if (destinations.length === 0) {
      throwError('Empty destinations array!');
    }
    super();
  }

  override get positionHint(): Vector3D {
    return this.destinations[0];
  }

  protected updateDestinations(destinations: Vector3D[]) {
    if (destinations.length === 0) {
      throwError('Empty destinations array!');
    }

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
    const agentPos = agent.getVoxelPosition();

    const path = Tasks.remember(this, pathToDestination, () => {
      const priorityCenter = this.moveDestinationBias;
      return priorityCenter
        ? agent.pathfinder.findPriorityPath(
            agentPos,
            this.destinations.map((pos) => ({
              pos,
              // todo: normalize so nearest dest is 0
              extraCost: 10 / (10 + vector.distance(priorityCenter, pos)),
            }))
          )
        : agent.pathfinder.findAnyPath(agentPos, this.destinations);
    });

    // if path is stale
    if (!Paths.followablePath(path, agentPos, agent.locomotion)) {
      path.restart(agentPos);
    }

    return path;
  }
}

function destinationsKey(destinations: Vector3D[]) {
  return destinations
    .map((d) => `${d.x},${d.y}${d.z}`)
    .sort()
    .join(':');
}
