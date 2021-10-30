import { Agent } from 'server/ai/colony/agent';
import { TaskManager } from 'server/ai/colony/task_manager';
import { ReadonlyGameContext } from 'server/game/context';

export enum TaskPriority {
  Low = 0,
  Medium = 1,
  High = 2,
}

export abstract class Task {
  readonly memory: object = {};
  readonly priority: TaskPriority;
  readonly agent: Agent | undefined;

  readonly reassignable: boolean = true;

  private _ended: boolean = false;
  private _context: ReadonlyGameContext;
  private taskManager: TaskManager;

  abstract execute(dt: number, agent: Agent): void;
  abstract isStrictlyImpossible(): boolean;
  abstract estimateCost(agent: Agent): number;

  get context(): ReadonlyGameContext {
    return this._context;
  }

  get ended(): boolean {
    return this._ended;
  }

  unassign(): void {
    if (this.agent) {
      this.taskManager.unassignTask(this);
    }
  }

  end(): void {
    if (!this._ended) {
      this.taskManager.removeTask(this);
    }
    this._ended = true;
  }

  isActive(): boolean {
    return !this._ended && this.agent != undefined;
  }

  setContext(taskManager: TaskManager, context: ReadonlyGameContext): void {
    this.taskManager = taskManager;
    this._context = context;
  }
}
