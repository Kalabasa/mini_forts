import { ActionResult } from 'server/ai/colony/action_result';
import { Agent } from 'server/ai/colony/agent';
import { Task } from 'server/ai/colony/task';
import { NoopPath, Path } from 'server/ai/pathfinder/path';

type WithPosition = {
  readonly position: Vector3D;
  getDestinations(): Vector3D[];
};

// This could be a mixin
export const Tasks = {
  expectNode(task: Task & WithPosition, name: string): void {
    const node = getNodeAtPosition(task);
    if (node.name !== name) task.end();
  },

  concludeOnAction(task: Task, actionResult: ActionResult): void {
    if (actionResult === ActionResult.Done) task.end();
    if (actionResult === ActionResult.Stopped) task.unassign();
    if (actionResult === ActionResult.Impossible) task.end();
  },

  fulfillPath(task: Task, agent: Agent, path: Path): ActionResult {
    const moveResult = agent.followPath(path);

    if (moveResult === ActionResult.Stopped) {
      path.restart(agent.getVoxelPosition());
      return agent.followPath(path);
    }

    if (moveResult === ActionResult.Impossible) {
      task.end();
    }

    return moveResult;
  },

  ensureValidPath(task: Task & WithPosition, agent: Agent): Path {
    const path = getPath(task, agent);

    if (!path.exists()) {
      task.unassign();
      return new NoopPath();
    }

    return path;
  },

  getPath(task: Task & WithPosition, agent: Agent): Path {
    return getPath(task, agent);
  },
};

const nodeAtPosition = Symbol();
const pathToDestination = Symbol();

type Memory = {
  [nodeAtPosition]: Node;
  [pathToDestination]: Path;
};

function getNodeAtPosition(task: Task & WithPosition) {
  return compute(task, nodeAtPosition, () => minetest.get_node(task.position));
}

function getPath(task: Task & WithPosition, agent: Agent) {
  return compute(task, pathToDestination, () => {
    return agent.pathfinder.findAnyPath(
      agent.getVoxelPosition(),
      task.getDestinations()
    );
  });
}

function compute<T extends keyof Memory>(
  task: Task,
  key: T,
  supplier: () => Memory[T]
): Memory[T] {
  const memory = task.memory as Memory;

  if (key in memory) return memory[key];

  const value = supplier();
  memory[key] = value;
  return value;
}
