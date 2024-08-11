import { ActionResult } from "server/ai/action_result";
import { Task } from "server/ai/colony/task";
import { Path } from "server/ai/pathfinder/path";
import { MinionAgent } from "server/ai/colony/minion_agent";

type WithPosition = {
  readonly position: Vector3D;
};

// This could be a mixin
export const Tasks = {
  remember<T>(task: Task, key: string | symbol, supplier: () => T): T {
    const memory = task.memory as object;

    if (key in memory) return memory[key];

    const value = supplier();
    memory[key] = value;
    return value;
  },

  expectNode(task: Task & WithPosition, name: string): ActionResult {
    const node = getNodeAtPosition(task);
    return node.name === name ? ActionResult.Done : ActionResult.Impossible;
  },

  /** @deprecated inherit MoveTask */
  fulfillPath(task: Task, agent: MinionAgent, path: Path): ActionResult {
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
