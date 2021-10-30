import { Profiling } from 'common/debug/profiling';
import { NavComponent, NavMap } from 'server/ai/pathfinder/nav_map';
import { DebugMarker } from 'server/debug/debug_marker';
import { CONFIG } from 'utils/config';
import { Logger } from 'utils/logger';
import { equalVectors, lerpVector, randomInt, ZERO_V } from 'utils/math';
import { WeakRef } from 'utils/weak_ref';

if (CONFIG.isDev) {
  minetest.register_chatcommand('debug_navmap', {
    params: '<name>',
    func: (playerName, param) => {
      const playerObj = minetest.get_player_by_name(playerName);

      if (!playerObj) return $multi(false, 'No player');

      const name = param.trim();

      if (name.length === 0) return $multi(false, 'Missing name parameter');

      const ref = instances.get(name);
      const instance = ref?.deref();

      if (!instance) {
        instances.delete(name);
        return $multi(false, `No DebugNavMap instance for name: '${name}'`);
      }

      const playerPos = playerObj.get_pos();
      instance.debug(playerPos);

      return $multi(true);
    },
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

  private constructor(...params: ConstructorParameters<typeof NavMap>) {
    super(...params);
  }

  override invalidateRegion(...args: Parameters<NavMap['invalidateRegion']>) {
    Profiling.startTimer('invalidateRegion');
    const result = super.invalidateRegion(...args);
    Profiling.endTimer('invalidateRegion');
    return result;
  }

  override populatePartitions(...args: Parameters<NavMap['populatePartitions']>) {
    Profiling.startTimer('populatePartitions');
    const result = super.populatePartitions(...args);
    Profiling.endTimer('populatePartitions');
    return result;
  }

  debug(position: Vector3D) {
    const cell = this.getCellByVoxel(position)!;

    DebugMarker.mark(lerpVector(cell.volume.min, cell.volume.max, 0.5), {
      type: DebugMarker.Volume.White,
      duration: 60,
      size: cell.volume.getExtent(),
    });

    const debugMarkerTypes = Object.values(DebugMarker.Point).filter(
      (t) => t !== DebugMarker.Point.White
    );
    let debugMarkerIndex = randomInt(0, debugMarkerTypes.length - 1);
    const assignedMarkerType = new Map<
      number,
      typeof debugMarkerTypes[number]
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
          duration: 60,
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
          duration: 60,
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
                  duration: 60,
                });
              }
            }
          }
        }
      }
    } catch (e) {
      Logger.error(e);
    }

    Logger.trace('debug_navmap:', cell.volume);
  }
}
