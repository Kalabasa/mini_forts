import { ActionResult } from 'server/ai/colony/action_result';
import { Operable } from 'server/ai/colony/operable';
import { Task } from 'server/ai/colony/task';
import { TaskManager } from 'server/ai/colony/task_manager';
import { Path } from 'server/ai/pathfinder/path';
import { Pathfinder } from 'server/ai/pathfinder/pathfinder';
import { Locomotion } from 'server/entity/locomotion/locomotion';

export abstract class Agent {
  abstract readonly pathfinder: Pathfinder;
  abstract readonly locomotion: Locomotion;

  readonly task: Task | undefined;
  private taskManager: TaskManager;

  coreUpdate(dt: number): void {
    this.update(dt);
  }

  unassignTask(): void {
    if (this.task) {
      this.taskManager.unassignAgent(this);
    }
  }

  protected update(dt: number): void {
    // For override
  }

  abstract getHealth(): number;
  abstract getMaxHealth(): number;
  abstract getPosition(): Vector3D;
  abstract getVoxelPosition(): Vector3D;

  abstract followPath(path: Path): ActionResult;
  abstract workBuildable(target: Vector3D): ActionResult;
  abstract workDiggable(target: Vector3D): ActionResult;
  abstract operateOperable(target: Operable): ActionResult;

  setContext(taskManager: TaskManager): void {
    this.taskManager = taskManager;
  }
}
