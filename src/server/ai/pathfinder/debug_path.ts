import { Profiling } from 'common/debug/profiling';
import { FindPath, Path } from 'server/ai/pathfinder/path';
import { DebugMarker } from 'server/debug/debug_marker';
import { CONFIG } from 'utils/config';
import { Logger } from 'utils/logger';
import { lerpVector } from 'utils/math';
import { WeakRef } from 'utils/weak_ref';

if (CONFIG.isDev) {
  minetest.register_chatcommand('debug_path', {
    params: '<name>',
    func: (playerName, param) => {
      const name = param.trim();

      if (name.length > 0) {
        const ref = instances.get(name);
        const instance = ref?.deref();

        if (!instance) {
          instances.delete(name);
          return $multi(false, `No DebugPath instance for name: '${name}'`);
        }

        instance.enableDebug();
      } else {
        for (const [name, ref] of instances.entries()) {
          const instance = ref?.deref();
          if (instance) {
            instance.enableDebug();
          } else {
            instances.delete(name);
          }
        }
      }

      return $multi(true);
    },
  });
}

const renderInterval = 0.5;

let time = 0;
minetest.register_globalstep((dt: number) => {
  time += dt;
  for (const ref of instances.values()) {
    const instance = ref?.deref();
    if (instance) {
      if (instance.debugEnabled) {
        if (time >= instance.lastRenderTime + renderInterval) {
          instance.lastRenderTime = time;
          instance.render();
        }
      }
    }
  }
});

let instanceNumber = 0;
const instances = new Map<string, WeakRef<DebugPath>>();

export class DebugPath extends FindPath {
  debugEnabled = false;
  lastRenderTime = 0;

  static create(
    namePrefix: string,
    ...params: ConstructorParameters<typeof FindPath>
  ): FindPath {
    const name = namePrefix + instanceNumber++;
    const instance = new DebugPath(...params);
    instances.set(name, new WeakRef(instance));
    return instance;
  }

  private constructor(...params: ConstructorParameters<typeof FindPath>) {
    super(...params);
  }

  enableDebug() {
    Logger.trace(
      'Enabling debug for path:',
      this.exists() ? this.getStep() : '?',
      '→',
      this.destinations
    );
    this.debugEnabled = true;
  }

  override searchCoarsePath(...args: Parameters<FindPath['searchCoarsePath']>) {
    Profiling.startTimer('searchCoarsePath');
    const result = super.searchCoarsePath(...args);
    Profiling.endTimer('searchCoarsePath');
    return result;
  }

  override searchVoxelPath(...args: Parameters<FindPath['searchVoxelPath']>) {
    Profiling.startTimer('searchVoxelPath');
    const result = super.searchVoxelPath(...args);
    Profiling.endTimer('searchVoxelPath');
    return result;
  }

  render() {
    if (!this.exists()) return;

    const duration = renderInterval * 2;

    for (const [i, n] of (this.partialPath ?? []).entries()) {
      if (i >= this.partialPathIndex) {
        DebugMarker.mark(n.position, {
          type:
            i === this.partialPathIndex
              ? DebugMarker.Point.Blue
              : DebugMarker.Point.White,
          nametag: '' + i,
          duration,
        });

        if (i >= this.partialPathIndex + 1 && n.from) {
          DebugMarker.mark(lerpVector(n.position, n.from.position, 0.5), {
            type: DebugMarker.Point.White,
            duration,
          });
        }
      }
    }

    for (const [i, n] of (this.coarsePath ?? []).entries()) {
      if (i >= this.coarsePathIndex) {
        const volume = n.component.cell.volume;
        DebugMarker.mark(lerpVector(volume.min, volume.max, 0.5), {
          type:
            i === this.coarsePathIndex
              ? DebugMarker.Volume.Blue
              : DebugMarker.Volume.White,
          nametag: '' + i,
          duration,
          size: volume.getExtent(),
        });

        if (i >= this.coarsePathIndex + 1 && n.to) {
          const fromVolume = n.to.component.cell.volume;
          DebugMarker.mark(lerpVector(volume.min, fromVolume.max, 0.5), {
            type: DebugMarker.Point.White,
            duration,
          });
        }
      }
    }

    for (const dst of this.destinations ?? []) {
      DebugMarker.mark(dst, {
        type: DebugMarker.Point.Yellow,
        nametag: 'dst',
        duration,
      });
    }
  }
}
