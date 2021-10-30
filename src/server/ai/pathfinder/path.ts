import { NavComponent, NavMap } from 'server/ai/pathfinder/nav_map';
import { Locomotion } from 'server/entity/locomotion/locomotion';
import { throwError } from 'utils/error';
import { Logger } from 'utils/logger';
import { equalVectors, lerpVector, sqDist } from 'utils/math';
import { PriorityQueue } from 'utils/priority_queue';

export type PathNode = {
  position: Vector3D;
  component: NavComponent;
  from: PathNode | undefined;
  costFromSource: number;
  value: number;
};

export type CoarsePathNode = {
  component: NavComponent;
  to: CoarsePathNode | undefined;
  costToDestination: number;
  value: number;
};

export interface Path {
  exists(): boolean;
  estimateCost(): number;
  hasNext(): boolean;
  getStep(): Vector3D | undefined;
  advance(): void;
  restart(source: Vector3D): void;
}

export class NoopPath {
  constructor() {}
  exists(): boolean {
    return false;
  }
  estimateCost(): number {
    return 0;
  }
  hasNext(): boolean {
    return false;
  }
  getStep(): Vector3D | undefined {
    return undefined;
  }
  advance(): void {}
  restart(source: Vector3D): void {}
}

export class FindPath implements Path {
  protected computed = false;

  protected coarsePath: CoarsePathNode[] | undefined;
  protected partialPath: PathNode[] | undefined;
  protected coarsePathIndex: number;
  protected partialPathIndex: number;

  constructor(
    protected source: Vector3D,
    protected destinations: Vector3D[],
    readonly locomotion: Locomotion,
    readonly navMap: NavMap
  ) {}

  exists(): this is this & {
    coarsePath: CoarsePathNode[];
    partialPath: PathNode[];
  } {
    if (this.source && this.destinations && !this.computed) {
      const srcComp = this.navMap.findComponent(this.source);
      if (srcComp) {
        let reachable: boolean | undefined;
        for (const dst of this.destinations) {
          const dstComp = this.navMap.findComponent(dst);
          if (dstComp && dstComp.partition && srcComp.partition) {
            reachable = dstComp.partition === srcComp.partition;
            if (reachable) break;
          }
        }
        if (reachable != undefined) return reachable;
      }

      this.restart(this.source);
    }
    return this.coarsePath != undefined && this.partialPath != undefined;
  }

  private ensureComputed() {
    if (this.source && this.destinations && !this.computed) {
      this.restart(this.source);
    }
  }

  estimateCost(): number {
    if (!this.exists()) return Infinity;

    let cost = Infinity;
    for (const dst of this.destinations) {
      let c = sqDist(this.source, dst);
      if (c < cost) {
        cost = c;
      }
    }

    return Math.sqrt(cost) * Math.PI * 0.5;
  }

  hasNext(): boolean {
    this.ensureComputed();
    if (!this.exists()) return false;

    return (
      this.coarsePathIndex < this.coarsePath.length ||
      this.partialPathIndex < this.partialPath.length - 1
    );
  }

  getStep(): Vector3D | undefined {
    this.ensureComputed();
    if (!this.exists()) return undefined;

    const pathNode = this.partialPath[this.partialPathIndex];
    return pathNode?.position;
  }

  advance(): void {
    this.ensureComputed();
    if (!this.exists()) return;

    if (this.partialPathIndex < this.partialPath.length - 1) {
      this.partialPathIndex++;

      // check if we can cut corners by going diagonal
      if (this.partialPathIndex < this.partialPath.length - 1) {
        const prev = this.partialPath[this.partialPathIndex - 1];
        const cur = this.partialPath[this.partialPathIndex];
        const next = this.partialPath[this.partialPathIndex + 1];
        if (
          prev.position.y === next.position.y &&
          cur.position.y === next.position.y &&
          Math.abs(next.position.x - prev.position.x) === 1 &&
          Math.abs(next.position.z - prev.position.z) === 1
        ) {
          const costX = this.locomotion.moveCost({
            x: next.position.x,
            y: next.position.y,
            z: prev.position.z,
          });
          const costZ = this.locomotion.moveCost({
            x: prev.position.x,
            y: next.position.y,
            z: next.position.z,
          });
          if (
            !Locomotion.solidNodeCost(costX) &&
            !Locomotion.solidNodeCost(costZ)
          ) {
            this.partialPathIndex++;
          }
        }
      }
    } else if (this.coarsePathIndex < this.coarsePath.length) {
      const currentCoarseNode = this.coarsePath[this.coarsePathIndex];
      this.coarsePathIndex++;
      const nextCoarseNode = this.coarsePath[this.coarsePathIndex];

      (this as this).partialPath = this.searchVoxelPath(
        this.getStep()!,
        this.destinations,
        currentCoarseNode,
        nextCoarseNode
      );
      this.partialPathIndex = 0;
    } else {
      throwError('Pathfinder: No more steps!');
    }
  }

  restart(source: Vector3D): void {
    this.source = source;
    this.coarsePath = this.searchCoarsePath(source, this.destinations);

    if (this.coarsePath) {
      // The rest of the partialPath will be computed in advance()
      this.partialPath = [
        {
          position: source,
          component: this.coarsePath[0].component,
          from: undefined,
          costFromSource: 0,
          value: 0,
        },
      ];
      this.partialPathIndex = 0;
      this.coarsePathIndex = 0;
    } else {
      this.partialPath = undefined;
    }

    this.computed = true;
  }

  protected searchCoarsePath(source: Vector3D, destinations: Vector3D[]) {
    if (destinations.length === 0) {
      throwError('Pathfinder: Empty destinations array!');
    }

    const srcComp = this.navMap.findComponent(source);
    if (!srcComp) return undefined;

    if (!srcComp.partition) {
      this.navMap.populatePartitions(source);
    }

    const dstComps: NavComponent[] = [];
    for (const dst of destinations) {
      const dstComp = this.navMap.findComponent(dst);
      if (dstComp) {
        if (!dstComp.partition) {
          this.navMap.populatePartitions(dst);
        }
        if (
          dstComp.partition === srcComp.partition &&
          !dstComps.some((c) => c.cell === dstComp.cell && c.id === dstComp.id)
        ) {
          dstComps.push(dstComp);
        }
      }
    }

    if (dstComps.length === 0) {
      return undefined;
    }

    const visited = new Map<string, CoarsePathNode>();
    const open = new PriorityQueue<CoarsePathNode>({
      property: 'value',
      ascending: true,
    });

    // We search backwards
    for (const dstComp of dstComps) {
      open.add({
        component: dstComp,
        to: undefined,
        costToDestination: 0,
        value: this.estimateCoarseCost(srcComp, dstComp),
      });
    }

    while (open.size > 0) {
      if (open.size > 700) {
        Logger.error(
          'Pathfinder: Too many nodes! (coarse)',
          source,
          destinations
        );
        return undefined;
      }

      const current = open.pop();

      // Found path
      if (
        current.component.cell === srcComp.cell &&
        current.component.id === srcComp.id
      ) {
        const partition = srcComp.partition || current.component.partition;

        const path: CoarsePathNode[] = [];
        let cursor: CoarsePathNode | undefined = current;
        do {
          cursor.component.partition = partition;

          path.push(cursor);
          cursor = cursor.to;
        } while (cursor);

        return path;
      }

      // `do { ... } while (false)`, because Lua5.1 doesn't have `continue`
      do {
        // Is somewhere unreachable from source
        if (
          srcComp.partition &&
          current.component.partition &&
          srcComp.partition !== current.component.partition
        ) {
          break; // continue
        }

        const currentKey = componentKey(current.component);
        const visitedCurrent = visited.get(currentKey);

        // Check that a better path hasn't reached this position yet
        if (
          visitedCurrent != undefined &&
          visitedCurrent.costToDestination <= current.costToDestination
        ) {
          break; // continue
        }

        visited.set(currentKey, current);

        // Branch out
        const nextComps = this.navMap.findAdjacentComponents(current.component);

        for (const nextComp of nextComps) {
          const nextKey = componentKey(nextComp);
          const visitedNext = visited.get(nextKey);

          const nextCost =
            current.costToDestination +
            this.estimateCoarseCost(current.component, nextComp);

          // Same check as on visit - optimization to limit the size of the open set.
          if (
            visitedNext == undefined ||
            visitedNext.costToDestination > nextCost
          ) {
            const nextNode = {
              component: nextComp,
              to: current,
              costToDestination: nextCost,
              value: nextCost + this.estimateCoarseCost(nextComp, srcComp) * 4,
            };
            open.add(nextNode);
          }
        }
      } while (false);
    }

    return undefined;
  }

  protected searchVoxelPath(
    source: Vector3D,
    destinations: Vector3D[],
    coarseSource?: CoarsePathNode,
    coarseDestination?: CoarsePathNode
  ): PathNode[] | undefined {
    if (destinations.length === 0 && !coarseDestination) {
      throwError('Pathfinder: Empty destinations array!');
    }

    const srcComp =
      coarseSource?.component ?? this.navMap.findComponent(source);
    if (!srcComp) return undefined;

    const sourceNode: PathNode = {
      position: source,
      component: srcComp,
      from: undefined,
      costFromSource: 0,
      value: this.estimateVoxelCost(source, destinations),
    };

    // Determine goal position (not the actual destination; only used for A* priority)
    let goalPos: Vector3D[] | undefined = destinations;
    if (coarseDestination?.to) {
      const cellVolume = coarseDestination.component.cell.volume;
      const nextCellVolume = coarseDestination.to.component.cell.volume;
      const goalPos0 = lerpVector(cellVolume.min, nextCellVolume.max, 0.5);
      goalPos = [goalPos0];
    } else {
      let average = vector.new(0, 0, 0);
      for (const dst of destinations) {
        average.x += dst.x;
        average.y += dst.y;
        average.z += dst.z;
      }
      average.x /= destinations.length;
      average.y /= destinations.length;
      average.z /= destinations.length;

      let deviation = 0;
      for (const dst of destinations) {
        deviation += sqDist(average, dst);
      }
      deviation = Math.sqrt(deviation / destinations.length);

      if (deviation < 7) {
        goalPos = [vector.round(average)];
      }
    }

    const limit = coarseSource?.component.cell.volume;

    const visited = new Map<string, PathNode>();
    const open = new PriorityQueue<PathNode>({
      property: 'value',
      ascending: true,
    });
    open.add(sourceNode);

    while (open.size > 0) {
      if (open.size > 300) {
        Logger.error(
          'Pathfinder: Too many nodes! (voxel)',
          source,
          destinations
        );
        return undefined;
      }

      const current = open.pop();

      // Check if destination reached
      let reached = false;
      if (coarseDestination) {
        const dstComp = coarseDestination.component;
        if (dstComp.cell.volume.containsPoint(current.position)) {
          let curComp = current.from?.component;

          if (
            !curComp ||
            !curComp.cell.volume.containsPoint(current.position)
          ) {
            curComp = this.navMap.findComponent(current.position);
          }

          if (curComp && curComp.id === dstComp.id) {
            reached = true;
          }
        }
      } else {
        for (const destination of destinations) {
          if (equalVectors(current.position, destination)) {
            reached = true;
            break;
          }
        }
      }

      if (reached) {
        const path: PathNode[] = [];
        let cursor: PathNode | undefined = current;
        do {
          path.unshift(cursor);
          cursor = cursor.from;
        } while (cursor);
        return path;
      }

      // `do { ... } while (false)`, because Lua5.1 doesn't have `continue`
      do {
        if (limit && !limit.containsPoint(current.position)) break; // continue

        const currentKey = nodeKey(current.position);
        const visitedCurrent = visited.get(currentKey);

        // Check that a better path hasn't reached this position yet
        if (
          visitedCurrent != undefined &&
          visitedCurrent.costFromSource <= current.costFromSource
        ) {
          break; // continue
        }

        visited.set(currentKey, current);

        // Branch out
        for (const delta of this.locomotion.adjacentNodes) {
          const nextPos = vector.add(current.position, delta);

          if (
            current.from == undefined ||
            !equalVectors(current.from.position, nextPos)
          ) {
            const nextKey = nodeKey(nextPos);
            const visitedNext = visited.get(nextKey);

            const cost = this.locomotion.moveCost(nextPos, current.position);
            if (cost < Infinity) {
              const nextCost = current.costFromSource + cost;

              // Same check as on visit - optimization to limit the size of the open set.
              if (
                visitedNext == undefined ||
                visitedNext.costFromSource > nextCost
              ) {
                let nextComp = current.component;

                if (!nextComp || !nextComp.cell.volume.containsPoint(nextPos)) {
                  // since nextPos is reached in a valid way - there must be a component here
                  nextComp = this.navMap.findComponent(nextPos)!;
                }

                const nextNode = {
                  position: nextPos,
                  component: nextComp,
                  from: current,
                  costFromSource: nextCost,
                  value:
                    nextCost + this.estimateVoxelCost(nextPos, goalPos) * 2,
                };
                open.add(nextNode);
              }
            }
          }
        }
      } while (false);
    }

    return undefined;
  }

  private estimateVoxelCost(
    position: Vector3D,
    destinations: Vector3D[]
  ): number {
    let minDist2 = Infinity;
    for (const destination of destinations) {
      const dist2 = sqDist(position, destination);
      if (dist2 < minDist2) minDist2 = dist2;
    }
    return Math.sqrt(minDist2);
  }

  private estimateCoarseCost(a: NavComponent, b: NavComponent): number {
    return vector.distance(a.cell.volume.min, b.cell.volume.min);
  }
}

function componentKey(component: NavComponent): string {
  const pos = component.cell.volume.min;
  return `${pos.x}:${pos.y}:${pos.z}:${component.id}`;
}

function nodeKey(position: Vector3D): string {
  return `${position.x}:${position.y}:${position.z}`;
}
