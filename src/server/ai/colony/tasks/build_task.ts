import { BlockPhysics } from 'common/block/physics';
import { ActionResult } from 'server/ai/action_result';
import { MinionAgent } from 'server/ai/colony/minion_agent';
import { Tasks } from 'server/ai/colony/task_helper';
import { WorkTask } from 'server/ai/colony/tasks/work_task';
import { BlockDefinition } from 'server/block/block';
import { Logger } from 'utils/logger';

export class BuildTask extends WorkTask {
  constructor(position: Vector3D, readonly block: BlockDefinition.WithGhost) {
    super(position);
  }

  override isStrictlyImpossible(): boolean {
    if (!this.context.hasResource(this.block.properties.resource)) return true;
    if (!BlockPhysics.canSupport(this.block, this.position)) return true;
    return super.isStrictlyImpossible();
  }

  override execute(dt: number, agent: MinionAgent): ActionResult {
    const expectResult = Tasks.expectNode(this, this.block.registry.ghost.name);
    if (expectResult !== ActionResult.Done) return expectResult;
    return super.execute(dt, agent);
  }

  override executeWork(dt: number, agent: MinionAgent): ActionResult {
    return agent.workBuildable(this.position);
  }

  [Logger.Props]() {
    return {
      pos: this.position,
      block: this.block.name,
    };
  }
}
