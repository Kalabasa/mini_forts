import { Profiling } from "common/debug/profiling";
import { Task, TaskPriority } from "server/ai/colony/task";
import { TaskManager } from "server/ai/colony/task_manager";
import { DebugMarker } from "server/debug/debug_marker";
import { CONFIG } from "utils/config";
import { Logger } from "utils/logger";
import { IntervalTimer } from "utils/timer";

if (CONFIG.isDev) {
  minetest.register_chatcommand("debug_taskmanager", {
    params: "<mode>",
    func: (playerName, param) => {
      if (!instance) return $multi(false, "No instance");

      const modeParam = param.trim();
      let mode: DebugTaskManager["debugMode"] = null;
      if (modeParam.length === 0) {
        mode = instance.debugMode == null ? "continuous" : null;
      } else {
        if (modeParam === "step" || modeParam === "continuous") {
          mode = modeParam;
        } else {
          return $multi(false, `Invalid mode parameter.`);
        }
      }

      instance.debugMode = mode;
      if (instance.debugMode) {
        instance.dump();
        return $multi(true, `TaskManager debug on (${instance.debugMode})`);
      } else {
        return $multi(true, "TaskManager debug off");
      }
    },
  });
  minetest.register_chatcommand("taskmanager_step", {
    func: (playerName, param) => {
      if (!instance) return $multi(false, "No instance");
      instance.stepFlag = true;
      return $multi(true);
    },
  });
}

let instance: DebugTaskManager | undefined;

const priorities = [TaskPriority.Low, TaskPriority.Medium, TaskPriority.High];

const debugMarkerDuration = 0.5;
const taskDebugMarkerSize = vector.new(1.0625, 1.0625, 1.0625);

export class DebugTaskManager extends TaskManager {
  static create(...params: ConstructorParameters<typeof TaskManager>) {
    return (instance = new DebugTaskManager(...params));
  }

  debugMode: "step" | "continuous" | null = null;
  stepFlag = false;
  private debugTimer = new IntervalTimer(debugMarkerDuration);

  override distributeTasks(
    ...args: Parameters<TaskManager["distributeTasks"]>
  ) {
    if (this.debugMode === "step") {
      if (this.stepFlag) {
        this.stepFlag = false;
      } else {
        return;
      }
    }

    Profiling.startTimer("distributeTasks");
    const result = super.distributeTasks(...args);
    Profiling.endTimer("distributeTasks");
    return result;
  }

  dump() {
    Logger.trace("TaskManager dump");
    Logger.trace("----------------");

    Logger.trace(`Free agents (${this.freeAgents.size}):`);
    for (const agent of this.freeAgents) {
      Logger.trace(" ", agent, agent.getVoxelPosition());
    }

    Logger.trace(`Busy agents (${this.busyAgents.size}):`);
    for (const agent of this.busyAgents) {
      Logger.trace(" ", agent, agent.getVoxelPosition());
    }

    for (const priority of priorities) {
      const backlogTasks = this.backlogTasks[priority] as Set<DebugTask>;
      Logger.trace(
        `Backlog tasks [priority:${TaskPriority[priority]}] (${backlogTasks.size}):`
      );
      for (const task of backlogTasks) {
        Logger.trace(" ", task);
      }
    }

    for (const priority of priorities) {
      const unassignedTasks = this.unassignedTasks[priority] as Set<DebugTask>;
      Logger.trace(
        `Unassigned tasks [priority:${TaskPriority[priority]}] (${unassignedTasks.size}):`
      );
      for (const task of unassignedTasks) {
        Logger.trace(" ", task);
      }
    }

    Logger.trace(`Assigned tasks(${this.assignedTasks.size}):`);
    for (const task of this.assignedTasks) {
      Logger.trace(" ", task);
    }
  }

  override update(
    ...params: Parameters<TaskManager["update"]>
  ): ReturnType<TaskManager["update"]> {
    if (this.debugTimer.updateAndCheck(params[0]) && this.debugMode) {
      for (const agent of this.freeAgents) {
        DebugMarker.mark(agent.getVoxelPosition(), {
          type: DebugMarker.Point.Cyan,
          nametag: "Free",
          duration: debugMarkerDuration,
        });
      }

      for (const agent of this.busyAgents) {
        const task = agent.task as DebugTask | undefined;

        DebugMarker.mark(agent.getVoxelPosition(), {
          type: DebugMarker.Point.Blue,
          nametag: task ? taskName(task) : "Busy",
          duration: debugMarkerDuration,
        });

        if (task && "position" in task) {
          const { position } = task;
          drawLine(agent.getPosition(), position, DebugMarker.Point.Blue);
        }
      }

      for (const priority of priorities) {
        const backlogTasks = this.backlogTasks[priority] as Set<DebugTask>;
        debugTasks(backlogTasks, "B", "Red");
      }

      for (const priority of priorities) {
        const unassignedTasks = this.unassignedTasks[
          priority
        ] as Set<DebugTask>;
        debugTasks(unassignedTasks, "U", "Yellow");
      }

      debugTasks(this.assignedTasks as Set<DebugTask>, "A", "Green");
    }

    return super.update(...params);
  }
}

type DebugTask = Task &
  (
    | {}
    | {
        position: Vector3D;
      }
  );

function taskName(task: DebugTask): string | undefined {
  const name = task.constructor.name;
  if (name.length > "Task".length && name.endsWith("Task")) {
    return name.slice(0, -"Task".length);
  }
  return name;
}

function prioritySuffix(priority: TaskPriority) {
  let n = "";
  for (const _ of $range(1, priority)) {
    n += "*";
  }
  return n;
}

function debugTasks(
  tasks: Set<DebugTask>,
  prefix: string,
  markerName: keyof (typeof DebugMarker)["Point" | "Volume"]
) {
  for (const task of tasks) {
    const nametag = prefix + prioritySuffix(task.priority);
    if ("position" in task) {
      DebugMarker.mark(task.position, {
        type: DebugMarker.Volume[markerName],
        nametag,
        size: taskDebugMarkerSize,
        duration: debugMarkerDuration,
      });
    } else if (task.agent) {
      DebugMarker.mark(task.agent.getVoxelPosition(), {
        type: DebugMarker.Point[markerName],
        nametag,
        size: vector.multiply(taskDebugMarkerSize, 0.5),
        duration: debugMarkerDuration,
      });
    }
  }
}

function drawLine(
  start: Vector3D,
  end: Vector3D,
  markerType: (typeof DebugMarker.Point)[keyof typeof DebugMarker.Point]
) {
  let distance = 0;
  const stepSize = 0.3;
  const maxDistance = vector.distance(start, end);
  const step = vector.multiply(
    vector.subtract(end, start),
    stepSize / maxDistance
  );

  const p = vector.new(start);
  while (distance < maxDistance) {
    DebugMarker.mark(p, {
      type: markerType,
      duration: debugMarkerDuration,
    });

    p.x += step.x;
    p.y += step.y;
    p.z += step.z;
    distance += stepSize;
  }
}
