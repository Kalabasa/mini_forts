import { IsNode } from 'common/block/is_node';
import { ActionResult } from 'server/ai/colony/action_result';
import { Agent } from 'server/ai/colony/agent';
import { Task } from 'server/ai/colony/task';
import { Tasks } from 'server/ai/colony/task_helper';
import { Locomotion } from 'server/entity/locomotion/locomotion';
import { throwError } from 'utils/error';
import { Logger } from 'utils/logger';
import { Queue } from 'utils/queue';

const escapePathMemKey = Symbol();

export class LeaveBuildSiteTask extends Task {
  override readonly reassignable = false;

  constructor(readonly buildSite: Vector3D) {
    super();
  }

  isStrictlyImpossible(): boolean {
    throwError('Not implemented!');
  }

  estimateCost(): number {
    throwError('Not implemented!');
  }

  execute(dt: number, agent: Agent): void {
    if (!this.ensurePath(agent)) return;

    const path = this.memory[escapePathMemKey];

    const pathResult = Tasks.fulfillPath(this, agent, path);
    if (!this.isActive()) return;

    if (pathResult !== ActionResult.Ongoing) {
      this.end();
    }
  }

  private ensurePath(agent: Agent): boolean {
    const agentPos = agent.getVoxelPosition();

    let path = this.memory[escapePathMemKey];

    if (!path) {
      let escapeLocation: Vector3D | undefined;

      // flood fill until non-ghost
      const visited = new Set<string>();
      const open = new Queue<Vector3D>();
      open.push(agentPos);
      while (open.size > 0) {
        const cur = open.pop()!;

        const node = minetest.get_node(cur);
        if (!IsNode.ghost(node)) {
          escapeLocation = cur;
          break;
        }

        const key = voxelKey(cur);
        visited.add(key);

        for (const delta of agent.locomotion.adjacentNodes) {
          const next = vector.add(cur, delta);
          const nextKey = voxelKey(next);
          if (
            !visited.has(nextKey) &&
            Locomotion.passableNodeCost(agent.locomotion.moveCost(next, cur))
          ) {
            open.push(next);
            visited.add(nextKey); // preemptive
          }
        }
      }

      if (!escapeLocation) {
        return false;
      }

      path = agent.pathfinder.findPath(agentPos, escapeLocation);
    }

    if (!path.exists()) {
      this.end();
      return false;
    }

    this.memory[escapePathMemKey] = path;
    return true;
  }

  [Logger.Props]() {
    return {
      buildSite: this.buildSite,
    };
  }
}

function voxelKey(pos: Vector3D): string {
  return `${pos.x}:${pos.y}:${pos.z}`;
}
