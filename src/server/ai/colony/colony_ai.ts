import { IsNode } from 'common/block/is_node';
import { Agent } from 'server/ai/colony/agent';
import { DebugTaskManager } from 'server/ai/colony/debug_task_manager';
import { Operable } from 'server/ai/colony/operable';
import { TaskPriority } from 'server/ai/colony/task';
import { BuildTask } from 'server/ai/colony/tasks/build_task';
import { DigTask } from 'server/ai/colony/tasks/dig_task';
import { HealAtDenTask } from 'server/ai/colony/tasks/heal_at_den_task';
import { LeaveBuildSiteTask } from 'server/ai/colony/tasks/leave_build_site_task';
import { OperateTask } from 'server/ai/colony/tasks/operate_task';
import { TaskManager } from 'server/ai/colony/task_manager';
import { BlockDefinition } from 'server/block/block';
import { EnemyEntity } from 'server/entity/enemy_entity/enemy_entity';
import {
  ReadonlyGameContext,
  ReadonlyGameContextDelegate,
} from 'server/game/context';
import { CONFIG } from 'utils/config';
import { throwError } from 'utils/error';
import { ID } from 'utils/id';
import { Logger } from 'utils/logger';
import { equalVectors } from 'utils/math';
import { IntervalTimer } from 'utils/timer';

export class ColonyAI {
  private readonly contextDelegate = new ReadonlyGameContextDelegate();
  private readonly taskManager = createTaskManager(
    this.contextDelegate.asContext()
  );

  private readonly agents = new Map<ID, Agent>();
  private readonly enemies = new Map<ID, EnemyEntity>();

  private readonly dens = new Map<string, Vector3D>();
  private readonly healAtDenTasks = new Map<string, HealAtDenTask>();

  private readonly operables = new Map<string, Operable>();
  private readonly operateTasks = new Map<string, OperateTask>();

  private readonly buildTasks = new Map<string, BuildTask>();
  private readonly digTasks = new Map<string, DigTask>();

  private operableUpdateTimer = new IntervalTimer(1.0);
  private idleTimer = new IntervalTimer(1.0);

  setContext(context: ReadonlyGameContext): void {
    this.contextDelegate.setHost(context);
  }

  reset() {
    Logger.info('Resetting ColonyAI...');
    this.agents.clear();
    this.enemies.clear();
    this.dens.clear();
    this.operables.clear();
    this.buildTasks.clear();
    this.digTasks.clear();
    this.operateTasks.clear();
    this.taskManager.reset();
  }

  update(dt: number): void {
    if (this.operableUpdateTimer.updateAndCheck(dt)) {
      this.updateOperables();
    }

    this.taskManager.update(dt);

    if (this.idleTimer.updateAndCheck(dt)) {
      this.updateIdleAgents();
    }

    for (const agent of this.agents.values()) {
      this.updateAgent(agent, dt);
    }
  }

  private updateAgent(agent: Agent, dt: number) {
    this.tryHeal(agent);
    agent.coreUpdate(dt);
  }

  private tryHeal(agent: Agent) {
    const health = agent.getHealth();
    const maxHealth = agent.getMaxHealth();

    if (health >= maxHealth) return;

    const alreadyInProgress = agent.task instanceof HealAtDenTask;
    const alreadyHealing =
      agent.task instanceof HealAtDenTask &&
      equalVectors(agent.task.position, agent.getVoxelPosition());

    const ratio = health / maxHealth;
    const critical = health <= 8;

    const priority =
      critical || ratio < 0.3
        ? TaskPriority.High
        : ratio < 0.8
        ? TaskPriority.Medium
        : TaskPriority.Low;

    const override =
      (critical && !alreadyInProgress && !alreadyHealing) ||
      !agent.task ||
      (priority > agent.task.priority && !alreadyInProgress);
    if (!override) return;

    const task = this.getHealAtDenTask(agent);
    if (!task || task === agent.task) return;

    this.taskManager.unassignAgent(agent);
    this.taskManager.addTask(task, priority);
    this.taskManager.assign(agent, task);
  }

  private getHealAtDenTask(agent: Agent): HealAtDenTask | undefined {
    let best: HealAtDenTask | undefined;
    let bestCost: number = Infinity;
    for (const [key, pos] of this.dens.entries()) {
      let task = this.healAtDenTasks.get(key);
      if (!task) {
        task = new HealAtDenTask(pos);
        this.healAtDenTasks.set(key, task);
      }

      if (!task.ended && !task.agent) {
        const cost = task.estimateCost(agent);
        if (cost < bestCost) {
          best = task;
          bestCost = cost;
        }
      }
    }
    return best;
  }

  private updateIdleAgents() {
    for (const agent of this.agents.values()) {
      if (!agent.task) {
        const agentPos = agent.getVoxelPosition();
        const node = minetest.get_node(agentPos);
        if (IsNode.ghost(node)) {
          const task = new LeaveBuildSiteTask(agentPos);
          this.taskManager.addTask(task, TaskPriority.High);
          this.taskManager.assign(agent, task);
        }
      }
    }
  }

  private updateOperables(): void {
    for (const operable of this.operables.values()) {
      const shouldOperatePriority = operable.shouldOperate();

      const key = posKey(operable.position);
      const task = this.operateTasks.get(key);
      const isOperating = task != undefined && !task.ended;

      if (isOperating !== (shouldOperatePriority != undefined)) {
        if (shouldOperatePriority) {
          this.enlistOperable(operable, shouldOperatePriority);
        } else {
          this.delistOperable(operable);
        }
      }
    }
  }

  private enlistOperable(operable: Operable, priority: TaskPriority) {
    const key = posKey(operable.position);

    if (this.operateTasks.has(key)) return;

    const task = new OperateTask(operable);
    this.operateTasks.set(key, task);
    this.taskManager.addTask(task, priority);
  }

  private delistOperable(operable: Operable) {
    Logger.trace('Disengaging operable...', operable);
    this.removeOperateTask(posKey(operable.position));
  }

  addAgent(id: ID, agent: Agent): void {
    if (CONFIG.isDev) {
      if (this.agents.has(id)) {
        throwError('Duplicate ID!', id, agent);
      }
    }

    this.agents.set(id, agent);
    this.taskManager.addAgent(agent);
  }

  removeAgent(id: ID): void {
    const agent = this.agents.get(id);
    if (agent) {
      this.taskManager.removeAgent(agent);
      this.agents.delete(id);
    }
  }

  addEnemy(id: ID, enemy: EnemyEntity): void {
    if (CONFIG.isDev) {
      if (this.enemies.has(id)) {
        throwError('Duplicate ID!', id, enemy);
      }
    }

    this.enemies.set(id, enemy);
  }

  removeEnemy(id: ID): void {
    this.enemies.delete(id);
  }

  addDen(position: Vector3D): void {
    this.dens.set(posKey(position), position);
  }

  removeDen(position: Vector3D): void {
    const key = posKey(position);
    this.dens.delete(key);

    const task = this.healAtDenTasks.get(key);
    if (task) {
      task.end();
      this.healAtDenTasks.delete(key);
    }
  }

  addBuildable(position: Vector3D, block: BlockDefinition.WithGhost): void {
    const task = new BuildTask(position, block);
    this.buildTasks.set(posKey(position), task);
    this.taskManager.addTask(task, TaskPriority.Low);
  }

  removeBuildable(position: Vector3D): void {
    const key = posKey(position);
    const task = this.buildTasks.get(key);
    if (task) {
      task.end();
      this.buildTasks.delete(key);
    }
  }

  addDiggable(position: Vector3D): void {
    const task = new DigTask(position);
    this.digTasks.set(posKey(position), task);
    this.taskManager.addTask(task, TaskPriority.Low);
  }

  removeDiggable(position: Vector3D): void {
    const key = posKey(position);
    const task = this.digTasks.get(key);
    if (task) {
      task.end();
      this.digTasks.delete(key);
    }
  }

  addOperable(operable: Operable): void {
    this.operables.set(posKey(operable.position), operable);
  }

  removeOperable(position: Vector3D): void {
    const key = posKey(position);
    this.operables.delete(key);
    this.removeOperateTask(key);
  }

  private removeOperateTask(key: string) {
    const task = this.operateTasks.get(key);
    if (task) {
      Logger.trace('Ending OperateTask...', task);
      task.end();
      this.operateTasks.delete(key);
    }
  }
}

function posKey(pos: Vector3D): string {
  return `${pos.x}:${pos.y}:${pos.z}`;
}

const createTaskManager = CONFIG.isProd
  ? (...params: ConstructorParameters<typeof TaskManager>) =>
      new TaskManager(...params)
  : (...params: ConstructorParameters<typeof TaskManager>) =>
      DebugTaskManager.create(...params);
