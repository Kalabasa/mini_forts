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
    super();
  }

  override get positionHint(): Vector3D {
    if (this.destinations.length === 0) {
      return super.positionHint;
    }
    return this.destinations[0];
  }

  protected updateDestinations(destinations: Vector3D[]) {
    if (destinationsKey(this.destinations) !== destinationsKey(destinations)) {
      this.destinations = destinations;
      delete this.memory[pathToDestination];
    }
  }

  override isStrictlyImpossible(): boolean {
    if (this.destinations.length === 0) return true;

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
    if (this.destinations.length === 0) {
      return ActionResult.Impossible;
    }

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
    const destinations = this.destinations;
    if (destinations.length === 0) {
      throwError('Cannot initialize move task path. Zero destinations!');
    }

    const agentPos = agent.getVoxelPosition();

    const path = Tasks.remember(this, pathToDestination, () => {
      const priorityCenter = this.moveDestinationBias;
      if (priorityCenter) {
        const rankedDestinations = destinations.map((pos) => ({
          pos,
          extraCost: 10 / (2 + vector.distance(priorityCenter, pos)),
        }));
        return agent.pathfinder.findPriorityPath(agentPos, rankedDestinations);
      } else {
        return agent.pathfinder.findAnyPath(agentPos, destinations);
      }
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
