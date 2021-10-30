import { Agent } from 'server/ai/colony/agent';
import { Task, TaskPriority } from 'server/ai/colony/task';
import { ReadonlyGameContext } from 'server/game/context';
import { throwError } from 'utils/error';
import { Logger } from 'utils/logger';
import { IntervalTimer } from 'utils/timer';

// In order of priority
const priorities = [TaskPriority.High, TaskPriority.Medium, TaskPriority.Low];
const buildupLimit = 20;

type ManagedAgent = {
  -readonly [K in keyof Agent]: Agent[K] extends Task | undefined
    ? ManagedTask | undefined
    : Agent[K];
};

type ManagedTask = {
  -readonly [K in keyof Task]: Task[K] extends Agent | undefined
    ? ManagedAgent | undefined
    : Task[K];
};

export class TaskManager {
  protected readonly freeAgents = new Set<ManagedAgent>();
  protected readonly busyAgents = new Set<ManagedAgent>();

  protected readonly backlogTasks: Record<TaskPriority, Set<ManagedTask>>;
  protected readonly unassignedTasks: Record<TaskPriority, Set<ManagedTask>>;
  protected readonly assignedTasks = new Set<ManagedTask>();

  private schedulingTimer = new IntervalTimer(0.8);

  private buffer: number[] = [];
  private bufferStride: number;

  constructor(private readonly context: ReadonlyGameContext) {
    this.unassignedTasks = createPrioritySets<ManagedTask>();
    this.backlogTasks = createPrioritySets<ManagedTask>();
  }

  reset() {
    Logger.info('Resetting TaskManager...');
    this.freeAgents.clear();
    this.busyAgents.clear();
    this.assignedTasks.clear();
    for (const priority of priorities) {
      this.backlogTasks[priority].clear();
      this.unassignedTasks[priority].clear();
    }
  }

  addAgent(agent: ManagedAgent): void {
    Logger.trace('addAgent', agent);
    agent.setContext(this);
    this.freeAgents.add(agent);
  }

  removeAgent(agent: ManagedAgent): void {
    Logger.trace('removeAgent', agent);
    if (agent.task) {
      this.moveTaskToUnassigned(agent.task);
      agent.task.agent = undefined;
      agent.task.memory = {};
    }
    this.freeAgents.delete(agent);
    this.busyAgents.delete(agent);
    agent.task = undefined;
  }

  addTask(task: ManagedTask, priority: TaskPriority): void {
    Logger.trace('addTask', task);
    task.setContext(this, this.context);
    task.priority = priority;
    this.moveTaskToUnassigned(task);
  }

  removeTask(task: ManagedTask): void {
    Logger.trace('removeTask', task);
    if (task.agent) {
      this.moveAgentToFree(task.agent);
      task.agent.task = undefined;
    }
    this.assignedTasks.delete(task);
    this.backlogTasks[task.priority].delete(task);
    this.unassignedTasks[task.priority].delete(task);
    task.agent = undefined;
    task.memory = {};
  }

  unassignAgent(agent: ManagedAgent) {
    Logger.trace('unassignAgent', agent);
    if (agent.task) {
      if (!agent.task.reassignable) {
        this.removeTask(agent.task);
        return;
      }
      this.moveTaskToUnassigned(agent.task);
      agent.task.agent = undefined;
      agent.task.memory = {};
    }
    this.moveAgentToFree(agent);
    agent.task = undefined;
  }

  unassignTask(task: ManagedTask) {
    Logger.trace('unassignTask', task);
    if (!task.reassignable) {
      this.removeTask(task);
      return;
    }

    if (task.agent) {
      this.moveAgentToFree(task.agent);
      task.agent.task = undefined;
    }
    this.moveTaskToUnassigned(task);
    task.agent = undefined;
    task.memory = {};
  }

  assign(agent: ManagedAgent, task: ManagedTask) {
    Logger.trace('assign', agent, task);
    agent.task = task;
    task.agent = agent;
    task.memory = {};
    this.moveAgentToBusy(agent);
    this.moveTaskToAssigned(task);
  }

  changeTaskPriority(task: ManagedTask, priority: number): void {
    throwError('Not yet implemented!');
  }

  update(dt: number): void {
    for (const task of this.assignedTasks) {
      if (task.ended) {
        this.removeTask(task);
      }
    }

    if (this.schedulingTimer.updateAndCheck(dt)) {
      this.assignTasks();
    }
  }

  private moveTaskToBacklog(task: ManagedTask) {
    this.assignedTasks.delete(task);
    this.unassignedTasks[task.priority].delete(task);
    this.backlogTasks[task.priority].add(task);
  }

  private moveTaskToUnassigned(task: ManagedTask) {
    this.assignedTasks.delete(task);
    const list = this.unassignedTasks[task.priority];
    if (list.size < buildupLimit) {
      list.add(task);
    } else {
      Logger.trace('Backlogging', task);
      this.backlogTasks[task.priority].add(task);
    }
  }

  private moveTaskToAssigned(task: ManagedTask) {
    this.backlogTasks[task.priority].delete(task);
    this.unassignedTasks[task.priority].delete(task);
    this.assignedTasks.add(task);
  }

  private moveAgentToBusy(agent: ManagedAgent) {
    this.freeAgents.delete(agent);
    this.busyAgents.add(agent);
  }

  private moveAgentToFree(agent: ManagedAgent) {
    this.busyAgents.delete(agent);
    this.freeAgents.add(agent);
  }

  private assignTasks() {
    for (const priority of priorities) {
      if (this.freeAgents.size === 0) {
        break;
      }

      const agents = [...this.freeAgents];
      const unassignedTasks = this.unassignedTasks[priority];

      if (unassignedTasks.size < buildupLimit) {
        const backlogTasks = this.backlogTasks[priority];
        const backlogIterator = backlogTasks.values();

        for (
          let i = backlogIterator.next();
          !i.done;
          i = backlogIterator.next()
        ) {
          const next: ManagedTask = i.value;

          if (!next.isStrictlyImpossible()) {
            Logger.trace('Unbacklogging', next);
            backlogTasks.delete(next);
            unassignedTasks.add(next);

            if (unassignedTasks.size >= buildupLimit) break;
          }
        }
      }

      if (unassignedTasks.size > 0) {
        const feasibleTasks: ManagedTask[] = [];

        for (const task of unassignedTasks) {
          if (task.isStrictlyImpossible()) {
            this.moveTaskToBacklog(task);
          } else {
            feasibleTasks.push(task);
          }
        }

        this.distributeTasks(agents, feasibleTasks);
      }
    }
  }

  protected distributeTasks(agents: ManagedAgent[], tasks: ManagedTask[]) {
    Logger.trace('distributeTasks', agents.length, tasks.length);

    // make a matrix of agents ⨉ tasks for costs, with extra row and column for maximums
    const agentsLen = agents.length;
    const tasksLen = tasks.length;
    this.initBuffer(agentsLen + 1, tasksLen + 1);

    const stride = this.bufferStride;

    for (let j = 0; j < tasksLen; j++) {
      const task = tasks[j];
      const rowMaxIndex = agentsLen + j * stride;
      for (let i = 0; i < agentsLen; i++) {
        const agent = agents[i];

        const cost = task.estimateCost(agent as Agent);

        // place costs in the matrix
        const index = i + j * stride;
        this.buffer[index] = cost;

        // place sums on the extra row and column
        if (cost < Infinity) {
          const colMaxIndex = i + tasksLen * stride;
          this.buffer[colMaxIndex] = Math.max(this.buffer[colMaxIndex], cost);
          this.buffer[rowMaxIndex] = Math.max(this.buffer[rowMaxIndex], cost);
        }
      }
    }

    // DP: Each cell will become a score
    // In the resulting matrix, the higher cell score would be the better agent-task combination
    for (let j = 0; j < tasksLen; j++) {
      const rowMaxIndex = agentsLen + j * stride;
      for (let i = 0; i < agentsLen; i++) {
        const colMaxIndex = i + tasksLen * stride;
        const index = i + j * stride;
        this.buffer[index] =
          Math.max(this.buffer[colMaxIndex], this.buffer[rowMaxIndex]) -
          this.buffer[index];
      }
    }

    // find best agent-task combinations
    // the sum row and column will become a "marker" for spent agents or tasks
    const assignments = Math.min(agentsLen, tasksLen);
    for (let k = 0; k < assignments; k++) {
      let bestScore = -Infinity;
      let bestAgentIndex = 0;
      let bestTaskIndex = 0;

      for (let j = 0; j < tasksLen; j++) {
        const rowMarkerIndex = agentsLen + j * stride;
        if (this.buffer[rowMarkerIndex] >= 0) {
          for (let i = 0; i < agentsLen; i++) {
            const colMarkerIndex = i + tasksLen * stride;
            if (this.buffer[colMarkerIndex] >= 0) {
              const index = i + j * stride;
              const score = this.buffer[index];
              if (score < Infinity) {
                if (score > bestScore) {
                  bestScore = score;
                  bestAgentIndex = i;
                  bestTaskIndex = j;
                }
              } else {
                // move impossible tasks to the backlog while we're at it
                this.moveTaskToBacklog(tasks[j]);
              }
            }
          }
        }
      }

      if (bestScore === -Infinity) {
        // no more feasible tasks
        break;
      }

      // mark the agent and task as spent
      const colMarkerIndex = bestAgentIndex + tasksLen * stride;
      const rowMarkerIndex = agentsLen + bestTaskIndex * stride;
      this.buffer[colMarkerIndex] = -1;
      this.buffer[rowMarkerIndex] = -1;

      // finally, assign the agent the task
      const bestAgent = agents[bestAgentIndex];
      const bestTask = tasks[bestTaskIndex];
      this.assign(bestAgent, bestTask);
    }

    Logger.trace('TaskManager: Task matrix');
    const blank = { [Logger.String]: () => '_' };
    for (let j = 0; j < tasksLen; j++) {
      const row: any[] = [];
      for (let i = 0; i < agentsLen; i++) {
        const score = this.buffer[i + j * stride];
        row.push(Number.isFinite(score) ? score : blank);
      }
      Logger.trace('  ', row);
    }
    Logger.trace('Task distribution end.');
  }

  private initBuffer(width: number, height: number) {
    const length = width * height;
    if (this.buffer.length < length) {
      this.buffer.length = length;
      this.bufferStride = width;
    }
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        this.buffer[i + j * this.bufferStride] = 0;
      }
    }
  }
}

function createPrioritySets<T>(): Record<TaskPriority, Set<T>> {
  const obj = {};
  for (const priority of priorities) {
    obj[priority] = new Set<T>();
  }
  return obj as Record<TaskPriority, Set<T>>;
}
