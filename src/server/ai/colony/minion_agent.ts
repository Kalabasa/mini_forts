import { IsNode } from "common/block/is_node";
import { ActionResult } from "server/ai/colony/action_result";
import { Operable } from "server/ai/colony/operable";
import { Task } from "server/ai/colony/task";
import { TaskManager } from "server/ai/colony/task_manager";
import { Path } from "server/ai/pathfinder/path";
import { Pathfinder } from "server/ai/pathfinder/pathfinder";
import { Locomotion } from "server/entity/locomotion/locomotion";
import { MinionDef } from "server/entity/minion/def";
import { MinionScript, MinionAction } from "server/entity/minion/script";
import { ReadonlyGameContext } from "server/game/context";
import { Logger } from "utils/logger";
import { equalVectors } from "utils/math";
import { IntervalTimer } from "utils/timer";
import { Paths } from "server/ai/pathfinder/path_helper";

export class MinionAgent {
  readonly pathfinder: Pathfinder;
  readonly locomotion: Locomotion = MinionDef.properties.locomotion;

  readonly task: Task | undefined;
  private taskManager: TaskManager;

  private readonly idleTimer = new IntervalTimer(1);

  constructor(
    context: ReadonlyGameContext,
    private readonly minion: MinionScript
  ) {
    this.pathfinder = Pathfinder.get(context, this.locomotion);
  }

  unassignTask(): void {
    if (this.task) {
      this.taskManager.unassignAgent(this);
    }
  }

  update(dt: number): void {
    if (this.idleTimer.updateAndCheck(dt)) {
      // todo: apply this fix to general walkClimb locomotion
      // This fixes pathfinding when agent is standing at the edge
      // Stay away from edges
      if (
        !this.minion.targetLocation &&
        this.locomotion.moveCost(this.getVoxelPosition()) === Infinity &&
        this.minion.collisionInfo.touching_ground
      ) {
        this.minion.targetLocation = vector.add(
          this.getVoxelPosition(),
          vector.direction(this.getVoxelPosition(), this.getPosition())
        );
        return;
      }
    }

    if (this.task) {
      const taskResult = this.task.execute(dt, this);
      if (this.task) {
        if (taskResult === ActionResult.Done) this.task.end();
        if (taskResult === ActionResult.Stopped) this.task.unassign();
        if (taskResult === ActionResult.Impossible) this.task.end();
      }
    } else if (this.minion.action.type !== MinionAction.Move) {
      this.minion.endAction();
    }
  }

  getHealth(): number {
    return this.minion.health;
  }

  getMaxHealth(): number {
    return this.minion.maxHealth;
  }

  getPosition(): Vector3D {
    return this.minion.objRef.get_pos();
  }

  getVoxelPosition(): Vector3D {
    return this.minion.getVoxelPosition();
  }

  followPath(path: Path): ActionResult {
    return Paths.followPath(path, this.minion);
  }

  workBuildable(target: Vector3D): ActionResult {
    if (
      this.minion.action.type === MinionAction.Build &&
      equalVectors(this.minion.action.buildPos, target)
    ) {
      return ActionResult.Ongoing;
    } else {
      this.minion.startBuilding(target);
      if (this.minion.action.type === MinionAction.Build) {
        return ActionResult.Ongoing;
      } else {
        const node = minetest.get_node(target);
        return IsNode.real(node)
          ? ActionResult.Impossible
          : ActionResult.Stopped;
      }
    }
  }

  workDiggable(target: Vector3D): ActionResult {
    if (
      this.minion.action.type === MinionAction.Dig &&
      equalVectors(this.minion.action.digPos, target)
    ) {
      return ActionResult.Ongoing;
    } else {
      this.minion.startDigging(target);
      if (this.minion.action.type === MinionAction.Dig) {
        return ActionResult.Ongoing;
      } else {
        const node = minetest.get_node(target);
        return IsNode.diggable(node)
          ? ActionResult.Stopped
          : ActionResult.Impossible;
      }
    }
  }

  operateOperable(target: Operable): ActionResult {
    if (
      this.minion.action.type === MinionAction.Operate &&
      equalVectors(this.minion.action.operatePos, target.position)
    ) {
      return ActionResult.Ongoing;
    } else {
      this.minion.startOperating(target.position);
      if (this.minion.action.type === MinionAction.Operate) {
        return ActionResult.Ongoing;
      } else {
        return ActionResult.Stopped;
      }
    }
  }

  setContext(taskManager: TaskManager): void {
    this.taskManager = taskManager;
  }

  [Logger.String]() {
    return `MinionAgent('${this.minion.id}')`;
  }
}
