import { Locomotion } from 'server/entity/locomotion/locomotion';
import { createArray } from 'utils/array';
import { throwError } from 'utils/error';
import { Logger } from 'utils/logger';
import { equalVectors, floorDiv, vectorFloorDiv } from 'utils/math';
import { Queue } from 'utils/queue';
import { Volume } from 'utils/space';

const cellSize = 8;

type ComponentID = number;
type Direction = number;

// component is a volume in a cell where positions are reachable from each other within the cell
export type NavComponent = {
  cell: NavCell;
  id: number;
  sample: Vector3D;
  // partition is a global number indicating components that are reachable from each other within the world
  // `undefined` if not determined yet
  partition: number | undefined;
  links: Record<Direction, ComponentLink>;
};

type ComponentLink = {
  cachedComps: NavComponent[] | undefined;
  // todo: memory optimization - only keep one sample position per contiguous portal
  // use bfs to find other portal positions
  portals: Vector3D[];
};

export class NavMap {
  private readonly cells = new Map<ReturnType<typeof cellKey>, NavCell>();

  // cells relative to an origin cell that can contain a node adjacent to a node in the origin cell
  // set per direction
  // used to find adjacent nodes from a cell in a given direction
  readonly adjacentCellDeltas: Record<Direction, Vector3D[]>;

  private nextPartition = 0;

  constructor(readonly locomotion: Locomotion) {
    this.adjacentCellDeltas = {};
    for (const [dir, delta] of this.locomotion.adjacentNodes.entries()) {
      this.adjacentCellDeltas[dir] = getNextCellDeltas(delta);
    }
  }

  reset() {
    Logger.info('Resetting NavMap...', this.locomotion.pathfinderID);
    this.cells.clear();
  }

  findComponent(position: Vector3D): NavComponent | undefined {
    const cell = this.getCellByVoxel(position);
    return cell.findComponent(position);
  }

  *findAdjacentComponents(
    component: NavComponent,
    autoCreate: boolean = true
  ): Iterable<NavComponent> {
    const adjacentNodes = this.locomotion.adjacentNodes;

    const cell = component.cell;
    const cellPos = cell.getCellPos();
    const comp = cell.getComponent(component.id);
    if (!comp) return;

    for (let dir = 0; dir < adjacentNodes.length; dir++) {
      if (comp.links[dir].portals.length > 0) {
        const nextCells = this.adjacentCellDeltas[dir]
          .map((d) => this.getCell(vector.add(cellPos, d), autoCreate))
          .filter((c): c is NavCell => c != undefined);

        const components = cell.findAdjacentComponents(
          component.id,
          nextCells,
          dir
        );

        for (const comp of components) {
          yield comp;
        }
      }
    }
  }

  invalidateRegion(minPos: Vector3D, maxPos: Vector3D) {
    const minCell = vectorFloorDiv(minPos, cellSize);
    const maxCell = {
      x: Math.ceil(maxPos.x / cellSize),
      y: Math.ceil(maxPos.y / cellSize),
      z: Math.ceil(maxPos.z / cellSize),
    };

    const { adjacentNodes } = this.locomotion;

    for (const z of $range(minCell.z, maxCell.z)) {
      for (const y of $range(minCell.y, maxCell.y)) {
        for (const x of $range(minCell.x, maxCell.x)) {
          const cell = this.cells.get(cellKey(x, y, z));
          if (cell) {
            cell.invalidate();

            // invalidate adjacent cells linking to this cell
            for (let dir = 0; dir < adjacentNodes.length; dir++) {
              const oppositeDir = findOppositeDirection(dir, adjacentNodes);
              if (oppositeDir) {
                for (const cellDelta of this.adjacentCellDeltas[dir]) {
                  const nextCellPos = vector.add(cell.getCellPos(), cellDelta);
                  if (
                    nextCellPos.x > maxCell.x ||
                    nextCellPos.x < minCell.x ||
                    nextCellPos.y > maxCell.y ||
                    nextCellPos.y < minCell.y ||
                    nextCellPos.z > maxCell.z ||
                    nextCellPos.z < minCell.z
                  ) {
                    const nextCell = this.getCell(nextCellPos, false);
                    if (nextCell) {
                      nextCell.invalidatePortals(oppositeDir);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  populatePartitions(start: Vector3D): void {
    const comp = this.findComponent(start);
    if (!comp || comp.partition) return;
    this.computePartitions([comp], true);
  }

  private computePartitions(
    components: Iterable<NavComponent>,
    autoCreate: boolean
  ) {
    // key: partition number
    const frontiers: Record<number, { active: boolean; count: number }> = {};
    let activeFrontiers = 0;
    const queue = new Queue<{ comp: NavComponent; partition: number }>();

    for (const comp of components) {
      const partition = this.nextPartition++;
      queue.push({ comp, partition });
      frontiers[partition] = { active: true, count: 1 };
      activeFrontiers++;

      Logger.trace('seed ', comp.cell, comp.id, partition);
    }

    Logger.trace('Frontiers (init):', activeFrontiers, frontiers);

    // flood fill to set the new partition numbers
    while (queue.size > 0) {
      const current = queue.pop()!;

      // check if this frontier is still active
      if (frontiers[current.partition]?.active) {
        frontiers[current.partition].count--;

        const comp = current.comp;
        if (comp.partition !== current.partition) {
          // resolve frontier intersections
          if (comp.partition) {
            if (frontiers[comp.partition]) {
              // frontier intersection, only one should remain
              if (frontiers[comp.partition].active) {
                Logger.trace('discard partition', comp.partition);
                frontiers[comp.partition].active = false;
                activeFrontiers--;
              }
            } else if (activeFrontiers === 1) {
              // intersection with external partition, just merge if this is the last frontier
              Logger.trace('merge with external partition', comp.partition);
              frontiers[current.partition].active = false;
              current.partition = comp.partition;
              frontiers[comp.partition] = { active: true, count: 0 };
            }
          }

          comp.partition = current.partition;

          Logger.trace(
            'set partition (branch)',
            comp.cell,
            comp.id,
            comp.partition
          );

          // branch out
          const nextComps = this.findAdjacentComponents(
            current.comp,
            autoCreate
          );
          for (const nextComp of nextComps) {
            if (nextComp.partition !== current.partition) {
              queue.push({ comp: nextComp, partition: current.partition });
              frontiers[current.partition].count++;
            }
          }
        }

        if (frontiers[current.partition].count === 0) {
          frontiers[current.partition].active = false;
          activeFrontiers--;
        }
      }
    }

    Logger.trace('Frontiers (end):', activeFrontiers, frontiers);
  }

  protected getCellByVoxel<T extends boolean>(
    voxelPosition: Vector3D,
    autoCreate: T
  ): T extends false ? NavCell | undefined : NavCell;
  protected getCellByVoxel(voxelPosition: Vector3D): NavCell;
  protected getCellByVoxel(
    voxelPosition: Vector3D,
    autoCreate: boolean = true
  ): NavCell | undefined {
    return this.getCell(vectorFloorDiv(voxelPosition, cellSize), autoCreate);
  }

  protected getCell<T extends boolean>(
    cellPosition: Vector3D,
    autoCreate: T
  ): T extends false ? NavCell | undefined : NavCell;
  protected getCell(cellPosition: Vector3D): NavCell;
  protected getCell(
    cellPosition: Vector3D,
    autoCreate: boolean = true
  ): NavCell | undefined {
    const key = cellKey(cellPosition.x, cellPosition.y, cellPosition.z);
    const cell = this.cells.get(key);

    if (cell || !autoCreate) return cell;

    const newCell = new NavCell(
      new Volume(
        {
          x: cellPosition.x * cellSize,
          y: cellPosition.y * cellSize,
          z: cellPosition.z * cellSize,
        },
        {
          x: cellPosition.x * cellSize + cellSize - 1,
          y: cellPosition.y * cellSize + cellSize - 1,
          z: cellPosition.z * cellSize + cellSize - 1,
        }
      ),
      this
    );
    this.cells.set(key, newCell);
    return newCell;
  }
}

export class NavCell {
  private scanned = false;
  private readonly components = new Map<ComponentID, NavComponent>();

  constructor(readonly volume: Volume, private readonly map: NavMap) {}

  getCellPos(): Vector3D {
    return vectorFloorDiv(this.volume.min, cellSize);
  }

  invalidate() {
    // Logger.trace('NavCell: Invalidate', this.volume);
    this.scanned = false;
    this.components.clear();
  }

  invalidatePortals(direction: Direction) {
    for (const component of this.components.values()) {
      const link = component.links[direction];
      link.cachedComps = undefined;
    }
  }

  getComponent(id: number): NavComponent | undefined {
    if (!this.scanned) {
      this.scan();
    }
    return this.components.get(id);
  }

  findComponent(position: Vector3D): NavComponent | undefined {
    if (!this.scanned) {
      const ids = this.scan();
      const id = ids[this.volume.index(position.x, position.y, position.z)];
      return id ? this.components.get(id) : undefined;
    }

    const { locomotion } = this.map;
    const { adjacentNodes, moveCost } = locomotion;

    if (!Locomotion.passableNodeCost(moveCost(position))) {
      return undefined;
    }

    const compSamples = [...this.iterateCompSamples()];

    // bfs to reach any of compSamples
    const visited = new Set<string>();
    const open = new Queue<Vector3D>();

    open.push(position);
    visited.add(voxelKey(position));

    while (open.size > 0) {
      const cur = open.pop()!;

      const sample = compSamples.find((o) => equalVectors(o.voxel, cur));
      if (sample) return sample.component;

      for (const delta of adjacentNodes) {
        const next = vector.add(cur, delta);
        const nextKey = voxelKey(next);
        if (
          !visited.has(nextKey) &&
          Locomotion.passableNodeCost(moveCost(next, cur))
        ) {
          open.push(next);
          visited.add(nextKey);
        }
      }
    }

    return undefined;
  }

  *findAdjacentComponents(
    componentID: ComponentID,
    nextCells: NavCell[],
    direction: Direction
  ): Iterable<NavComponent> {
    const { locomotion } = this.map;
    const { adjacentNodes, moveCost } = locomotion;

    const oppositeDir = findOppositeDirection(direction, adjacentNodes);
    if (!oppositeDir) return;

    if (!this.scanned) {
      this.scan();
    }

    const component = this.components.get(componentID);
    if (!component) return;

    const link = component.links[direction];

    if (link.cachedComps) {
      for (const comp of link.cachedComps) {
        yield comp;
      }
      return;
    }

    link.cachedComps = [];

    for (const nextCell of nextCells) {
      if (!nextCell.scanned) {
        nextCell.scan();
      }

      for (const nextComp of nextCell.components.values()) {
        const nextLink = nextComp.links[oppositeDir];

        let foundConnectingPortals = false;

        for (const portal of link.portals) {
          for (const nextPortal of nextLink.portals) {
            if (
              adjacentNodes.some(
                (d) =>
                  d.x === nextPortal.x - portal.x &&
                  d.y === nextPortal.y - portal.y &&
                  d.z === nextPortal.z - portal.z
              ) &&
              Locomotion.passableNodeCost(moveCost(nextPortal, portal))
            ) {
              // fixme: allow usage in invalidatePartitions without throwing
              // spread partition numbers
              // if (component.partition) {
              //   if (
              //     nextComp.partition &&
              //     nextComp.partition !== component.partition
              //   ) {
              //     throwError(
              //       'NavMap: Different partitions found connected!',
              //       component.cell,
              //       component.partition,
              //       nextComp.cell,
              //       nextComp.partition
              //     );
              //   }
              //   nextComp.partition = component.partition;
              // }

              link.cachedComps.push(nextComp);
              yield nextComp;

              foundConnectingPortals = true;
              break;
            }
          }
          if (foundConnectingPortals) break;
        }
      }
    }
  }

  // todo: use VoxelManip
  scan() {
    this.scanned = true;
    this.components.clear();

    const { locomotion, adjacentCellDeltas } = this.map;
    const { adjacentNodes, moveCost } = locomotion;

    const cellPos = this.getCellPos();
    const extent = this.volume.getExtent();

    // disjoint-set forest
    // initially all voxels are in its own set
    const set: (number | undefined)[] = createArray(
      extent.x * extent.y * extent.z,
      (i) => i
    );

    // record any portal found, indexed by volume index
    const portals: Record<number, Record<Direction, boolean>> = {};

    this.volume.forEach((pos, index) => {
      if (!Locomotion.passableNodeCost(moveCost(pos))) {
        set[index] = undefined;
        return;
      }

      let root = set[index]!;
      while (root !== set[root]) {
        root = set[root]!;
      }

      for (const [dir, delta] of adjacentNodes.entries()) {
        const nextPos = vector.add(pos, delta);

        if (this.volume.containsPoint(nextPos)) {
          let nextIndex = this.volume.index(nextPos.x, nextPos.y, nextPos.z);
          if (
            nextIndex < index &&
            Locomotion.passableNodeCost(moveCost(nextPos, pos))
          ) {
            // merge sets
            let nextRoot = set[nextIndex]!;
            while (nextRoot !== set[nextRoot]) {
              nextRoot = set[nextRoot]!;
            }
            if (root !== nextRoot) {
              set[root] = nextRoot;
              root = nextRoot;
            }
          }
        } else {
          // next position is in the next cell, a portal will be recorded
          const nextCellPosX = floorDiv(nextPos.x, cellSize);
          const nextCellPosY = floorDiv(nextPos.y, cellSize);
          const nextCelLPosZ = floorDiv(nextPos.z, cellSize);
          // check if adjacent cell matches direction to reduce redundant portals
          for (const cellDelta of adjacentCellDeltas[dir]) {
            const checkNextCellPos = vector.add(cellPos, cellDelta);
            if (
              checkNextCellPos.x === nextCellPosX &&
              checkNextCellPos.y === nextCellPosY &&
              checkNextCellPos.z === nextCelLPosZ
            ) {
              portals[index] = portals[index] ?? {};
              const portalDirMap = portals[index];
              portalDirMap[dir] = true;
              break;
            }
          }
        }
      }
    });

    // merge sets and create Component objects from distinct set numbers
    this.volume.forEach((pos, index) => {
      let posCopy: Vector3D | undefined;
      let root = set[index]!;

      if (root !== undefined) {
        while (root !== set[root]) {
          root = set[root]!;
        }

        // flatten disjoint-set parents
        let i = index;
        while (set[i] !== root) {
          const parent = set[i]!;
          set[i] = root;
          i = parent;
        }

        // since we're already here, do some initializations
        let component: NavComponent | undefined = this.components.get(root);
        if (!component) {
          component = {
            cell: this,
            id: root,
            sample: (posCopy = posCopy ?? vector.new(pos)),
            partition: undefined,
            links: {},
          };
          this.components.set(root, component);
        }

        const voxelPortals = portals[index];
        for (let dir = 0; dir < adjacentNodes.length; dir++) {
          let link = component.links[dir];
          if (!link) {
            link = { cachedComps: undefined, portals: [] };
            component.links[dir] = link;
          }

          if (voxelPortals?.[dir]) {
            link.portals.push((posCopy = posCopy ?? vector.new(pos)));
          }
        }
      }
    });

    // Logger.trace('Scan of', this.volume.min, '-', this.volume.max);
    // const blank = { [Logger.String]: () => '__' };
    // this.volume.forEachSlice({ y: 1 }, (slice) => {
    //   Logger.trace('    slice', slice.min, '-', slice.max);
    //   slice.forEachSlice({ z: 1 }, (slice2) => {
    //     const row = [];
    //     slice2.forEach((pos) =>
    //       row.push(set[this.volume.index(pos.x, pos.y, pos.z)] ?? blank)
    //     );
    //     Logger.trace('    ', row);
    //   });
    // });

    // Logger.trace('Result:', this.components);

    return set;
  }

  *iterateComponents(): Iterable<NavComponent> {
    return this.components.values();
  }

  *iterateCompPortals(): Iterable<{
    compID: ComponentID;
    portal: Vector3D;
  }> {
    for (const [id, component] of this.components.entries()) {
      for (const link of Object.values(component.links)) {
        for (const portal of link.portals) {
          yield { compID: id, portal };
        }
      }
    }
  }

  *iterateCompSamples(): Iterable<{
    component: NavComponent;
    voxel: Vector3D;
  }> {
    for (const component of this.components.values()) {
      yield { component, voxel: component.sample };
      for (const link of Object.values(component.links)) {
        for (const portal of link.portals) {
          yield { component, voxel: portal };
        }
      }
    }
  }

  [Logger.String]() {
    return `NavCell(${this.volume.min.x},${this.volume.min.y},${this.volume.min.z};${this.volume.max.x},${this.volume.max.y},${this.volume.max.z})`;
  }
}

// Get cell positions that would be relevant for the specified movement delta
function getNextCellDeltas(delta: Vector3D): Vector3D[] {
  const minX = floorDiv(delta.x, cellSize);
  const maxX = floorDiv(cellSize - 1 + delta.x, cellSize);
  const minY = floorDiv(delta.y, cellSize);
  const maxY = floorDiv(cellSize - 1 + delta.y, cellSize);
  const minZ = floorDiv(delta.z, cellSize);
  const maxZ = floorDiv(cellSize - 1 + delta.z, cellSize);

  const results: Vector3D[] = [];
  for (let z of $range(minZ, maxZ)) {
    for (let y of $range(minY, maxY)) {
      for (let x of $range(minX, maxX)) {
        if (x !== 0 || y !== 0 || z !== 0) {
          results.push({ x, y, z });
        }
      }
    }
  }
  return results;
}

function findOppositeDirection(
  direction: Direction,
  adjacentNodes: Locomotion['adjacentNodes']
): Direction | undefined {
  const dirDelta = adjacentNodes[direction];
  for (const [dir, delta] of adjacentNodes.entries()) {
    if (
      delta.x == -dirDelta.x &&
      delta.y == -dirDelta.y &&
      delta.z == -dirDelta.z
    ) {
      return dir;
    }
  }

  return undefined;
}

function cellKey(x: number, y: number, z: number): string {
  return `${x}:${y}:${z}`;
}

function componentKey(component: NavComponent): string {
  const { x, y, z } = component.cell.volume.min;
  return `${x}:${y}:${z}:${component.id}`;
}

function voxelKey({ x, y, z }: Vector3D): string {
  return `${x}:${y}:${z}`;
}
