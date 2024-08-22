import { Profiling } from 'common/debug/profiling';
import { globals } from 'common/globals';
import { Player } from 'common/player/player';
import { FindPath, Path } from 'server/ai/pathfinder/path';
import { DebugMarker } from 'server/debug/debug_marker';
import { Game } from 'server/game/game';
import { equalVectors, lerpVector } from 'utils/math';
import { WeakRef } from 'utils/weak_ref';

const renderInterval = 0.5;

export function registerDebugPath(
  game: Game,
  pathfinder: { findPath(start: Vector3D, end: Vector3D): Path }
) {
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

  let checkPathPlayer: Player | undefined = undefined;
  let checkPathStart: Vector3D | undefined = undefined;
  let checkPath: DebugPath | undefined = undefined;

  minetest.register_chatcommand('check_path_start', {
    func: (playerName) => {
      checkPathPlayer = game.findPlayerByName(playerName);

      if (!checkPathPlayer) {
        return $multi(false, 'No player');
      }

      checkPathStart = getPointedNodeAbove(checkPathPlayer);

      if (!checkPathStart) {
        return $multi(false, 'No pointed location');
      }

      return $multi(
        true,
        `Check path start set: (${checkPathStart.x}, ${checkPathStart.y}, ${checkPathStart.z})`
      );
    },
  });

  minetest.register_chatcommand('check_path_end', {
    func: () => {
      if (!checkPathStart) {
        return $multi(false, 'Issue /check_path_start first!');
      }

      if (!checkPathPlayer) {
        return $multi(false, 'No player');
      }

      const end = getPointedNodeAbove(checkPathPlayer);

      if (!end) {
        return $multi(false, 'No pointed location');
      }

      checkPath = pathfinder.findPath(checkPathStart, end) as DebugPath;
      return $multi(true, `Check path: ${checkPath.exists()}`);
    },
  });

  minetest.register_chatcommand('check_path_reset', {
    func: () => {
      checkPathStart = undefined;
      checkPath = undefined;
      return $multi(true);
    },
  });

  function getPointedNodeAbove(player: Player) {
    const origin = player.getEyePosition();
    const front = vector.add(
      origin,
      vector.multiply(player.getLookDir(), globals.interaction.range)
    );
    for (const pointedThing of Raycast(origin, front, false, false)) {
      return pointedThing.above;
    }
  }

  let time = 0;
  minetest.register_globalstep((dt: number) => {
    time += dt;

    for (const [name, ref] of instances.entries()) {
      const instance = ref?.deref();
      if (instance) {
        if (instance.debugEnabled) {
          if (time >= instance.lastRenderTime + renderInterval) {
            instance.lastRenderTime = time;
            instance.render();
          }
        }
      } else {
        instances.delete(name);
      }
    }

    if (checkPath && checkPathPlayer) {
      checkPath.render();
      const step = checkPath.getStep();
      if (step) {
        const pointed = getPointedNodeAbove(checkPathPlayer);
        if (pointed && equalVectors(step, pointed)) {
          if (checkPath.hasNext()) {
            checkPath.advance();
          } else {
            checkPath = undefined;
          }
        }
      }
    }
  });
}

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
    this.logger.trace(
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

    if (!this.exists()) {
      DebugMarker.line(this.source, this.destinations[0].pos, {
        type: DebugMarker.Point.Red,
        duration,
      });

      DebugMarker.mark(this.source, {
        type: DebugMarker.Point.Red,
        nametag: 'src',
        duration,
      });
    }

    for (const dst of this.destinations ?? []) {
      DebugMarker.mark(dst.pos, {
        type: DebugMarker.Point.Yellow,
        nametag: 'dst',
        duration,
      });
    }
  }
}
