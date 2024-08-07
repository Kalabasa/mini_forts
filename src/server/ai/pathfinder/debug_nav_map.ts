import { Profiling } from 'common/debug/profiling';
import { globals } from 'common/globals';
import { NavComponent, NavMap } from 'server/ai/pathfinder/nav_map';
import { DebugMarker } from 'server/debug/debug_marker';
import { Game } from 'server/game/game';
import { RemotePlayer } from 'server/player/remote_player';
import { CONFIG } from 'utils/config';
import { Logger } from 'utils/logger';
import { ZERO_V, lerpVector } from 'utils/math';
import { IntervalTimer } from 'utils/timer';
import { WeakRef } from 'utils/weak_ref';

export function registerDebugNavMap(game: Game) {
  if (CONFIG.isProd) return;

  minetest.register_chatcommand('debug_navmap', {
    params: '<name>',
    func: (playerName, param) => {
      const player = game.findPlayerByName(playerName);

      if (!player) return $multi(false, 'No player');

      const name = param.trim();

      if (name.length === 0) {
        const names = ['off', ...instances.keys()].join(', ');
        return $multi(false, `Missing parameter. Expected one of: ${names}`);
      }

      for (const instance of instances.values()) {
        instance.deref()?.setActiveFor(null);
      }

      if (name !== 'off') {
        const ref = instances.get(name);
        const instance = ref?.deref();

        if (!instance) {
          instances.delete(name);
          return $multi(false, `No DebugNavMap instance for name: '${name}'`);
        }

        instance.setActiveFor(player);
      }

      return $multi(true);
    },
  });

  const timer = new IntervalTimer(1.0);

  minetest.register_globalstep((dt) => {
    if (!timer.updateAndCheck(dt)) return;
    for (const instance of instances.values()) {
      instance.deref()?.debug(timer.seconds);
    }
  });
}

const instances = new Map<string, WeakRef<DebugNavMap>>();

export class DebugNavMap extends NavMap {
  static create(
    name: string,
    ...params: ConstructorParameters<typeof NavMap>
  ): NavMap {
    const instance = new DebugNavMap(...params);
    instances.set(name, new WeakRef(instance));
    Logger.trace(`Created DebugNavMap: '${name}'`);
    return instance;
  }

  private activeFor: RemotePlayer | null = null;

  private constructor(...params: ConstructorParameters<typeof NavMap>) {
    super(...params);
  }

  override invalidateRegion(...args: Parameters<NavMap['invalidateRegion']>) {
    Profiling.startTimer('invalidateRegion');
    const result = super.invalidateRegion(...args);
    Profiling.endTimer('invalidateRegion');
    return result;
  }

  override populatePartitions(
    ...args: Parameters<NavMap['populatePartitions']>
  ) {
    Profiling.startTimer('populatePartitions');
    const result = super.populatePartitions(...args);
    Profiling.endTimer('populatePartitions');
    return result;
  }

  setActiveFor(value: RemotePlayer | null) {
    this.activeFor = value;
  }

  debug(duration: number) {
    if (!this.activeFor) return;

    const origin = this.activeFor.getEyePosition();
    const front = vector.add(
      origin,
      vector.multiply(this.activeFor.getLookDir(), globals.interaction.range)
    );
    const raycast = Raycast(origin, front, false, false);

    let pointedPos: Vector3D | null = null;
    for (const pointedThing of raycast) {
      pointedPos = pointedThing.above;
      break;
    }

    if (!pointedPos) return;

    const cell = this.getCellByVoxel(pointedPos)!;
    const cellPos = cell.getCellPos();

    DebugMarker.mark(lerpVector(cell.volume.min, cell.volume.max, 0.5), {
      type: DebugMarker.Volume.White,
      duration,
      size: cell.volume.getExtent(),
    });

    const debugMarkerTypes = Object.values(DebugMarker.Point).filter(
      (t) => t !== DebugMarker.Point.White
    );
    let debugMarkerIndex =
      (cellPos.x + cellPos.y * 2 + cellPos.z * 3) % debugMarkerTypes.length;
    const assignedMarkerType = new Map<
      number,
      (typeof debugMarkerTypes)[number]
    >();

    const compInfo = new Map<
      number,
      { comp: NavComponent; min: Vector3D; max: Vector3D; points: Vector3D[] }
    >();

    cell.volume.forEach((pos) => {
      const comp = cell.findComponent(pos);
      if (!comp) return;

      let info = compInfo.get(comp.id);
      if (!info) {
        info = {
          comp,
          min: vector.new(pos),
          max: vector.new(pos),
          points: [],
        };
        compInfo.set(comp.id, info);
      }

      info.min.x = Math.min(info.min.x, pos.x);
      info.min.y = Math.min(info.min.y, pos.y);
      info.min.z = Math.min(info.min.z, pos.z);
      info.max.x = Math.max(info.max.x, pos.x);
      info.max.y = Math.max(info.max.y, pos.y);
      info.max.z = Math.max(info.max.z, pos.z);

      info.points.push(vector.new(pos));
    });

    for (const [id, info] of compInfo.entries()) {
      let type = assignedMarkerType.get(id);
      if (!type) {
        type = debugMarkerTypes[debugMarkerIndex++ % debugMarkerTypes.length];
        assignedMarkerType.set(id, type);
      }

      for (const point of info.points) {
        DebugMarker.mark(point, {
          type,
          size: { x: 0.17, y: 0.17, z: 0.17 },
          duration,
        });
      }

      DebugMarker.mark(
        {
          x: (info.min.x + info.max.x) / 2,
          y: (info.min.y + info.max.y) / 2,
          z: (info.min.z + info.max.z) / 2,
        },
        {
          type,
          size: ZERO_V,
          nametag: `id=${id} part=${info.comp.partition}`,
          duration,
        }
      );
    }

    try {
      const adjacentNodes = this.locomotion.adjacentNodes;
      for (const [id, info] of compInfo.entries()) {
        const comp = info.comp;
        for (let dir = 0; dir < adjacentNodes.length; dir++) {
          if (comp.links[dir].portals.length > 0) {
            const nextCells = this.adjacentCellDeltas[dir].map(
              (d) => this.getCell(vector.add(cell.getCellPos(), d))!
            );

            const components = [
              ...cell.findAdjacentComponents(id, nextCells, dir),
            ];

            for (const nextCell of nextCells) {
              const cellDelta = vector.subtract(
                nextCell.getCellPos(),
                cell.getCellPos()
              );
              const nextComponents = components.filter(
                (c) => c.cell === nextCell
              );
              if (nextComponents.length > 0) {
                const nametag =
                  id + '->' + nextComponents.map((c) => c.id).join(',');

                const pos = {
                  x:
                    (info.min.x + info.max.x) * 0.5 +
                    cellDelta.x * (info.max.x - info.min.x + 1) * 0.5,
                  y:
                    (info.min.y + info.max.y) * 0.5 +
                    cellDelta.y * (info.max.y - info.min.y + 1) * 0.5,
                  z:
                    (info.min.z + info.max.z) * 0.5 +
                    cellDelta.z * (info.max.z - info.min.z + 1) * 0.5,
                };

                DebugMarker.mark(pos, {
                  type: DebugMarker.Point.White,
                  size: ZERO_V,
                  nametag,
                  duration,
                });
              }
            }
          }
        }
      }
    } catch (e) {
      this.logger.error(e);
    }

    this.logger.trace('debug_navmap:', cell.volume);
  }
}
