import { IsNode } from 'common/block/is_node';
import { Pathfinder } from 'server/ai/pathfinder/pathfinder';
import { CoreCrystalDef } from 'server/block/core_crystal/def';
import { CoreCrystalBaseDef } from 'server/block/core_crystal_base/def';
import { DenDef } from 'server/block/den/def';
import { EnemyCrystalDef } from 'server/block/enemy_crystal/def';
import { EnemyCrystalBaseDef } from 'server/block/enemy_crystal_base/def';
import { EnemyEntity } from 'server/entity/enemy_entity/enemy_entity';
import { MinionDef } from 'server/entity/minion/def';
import { MinionScript } from 'server/entity/minion/script';
import { SlugDef } from 'server/entity/slug/def';
import { SnailDef } from 'server/entity/snail/def';
import { LoadMapChunkEvent } from 'server/game/events';
import { Game } from 'server/game/game';
import { ResourceType } from 'server/game/resources';
import { Logger } from 'utils/logger';
import { hypot2, randomInt } from 'utils/math';
import { IntervalTimer } from 'utils/timer';

const startingResources = {
  [ResourceType.Wood]: 1000,
  [ResourceType.Stone]: 1000,
  [ResourceType.Metal]: 1000,
  [ResourceType.Spore]: 1000,
};

const maxEnemyBases = 3;
const maxEnemyEntities = 9;

// Gameplay logic
export class Director {
  private enemyBases: Vector3D[] = [];
  private enemyEntities: EnemyEntity[] = [];

  private eventTimer = new IntervalTimer(10);

  constructor(private readonly game: Game) {
    game.events.onFor(LoadMapChunkEvent, this, this.onLoadMapChunk as any);
  }

  reset(): void {
    Logger.trace('Resetting Director...');
    this.eventTimer.reset();
    this.enemyBases = [];
    this.enemyEntities = [];
  }

  init(): void {
    this.game.setResources(startingResources);

    const homePos = this.game.getHomePosition();
    const homeUnderPos = vector.add(homePos, { x: 0, y: -1, z: 0 });

    this.game.setBlock(CoreCrystalDef, homePos);
    this.game.setBlock(CoreCrystalBaseDef, homeUnderPos);

    const initialMinions = [
      // { x: homePos.x - 1, y: homePos.y, z: homePos.z },
      // { x: homePos.x + 1, y: homePos.y, z: homePos.z },
      { x: homePos.x, y: homePos.y, z: homePos.z + 1 },
    ];

    for (const pos of initialMinions) {
      this.game.createEntity(MinionDef, pos);
    }

    this.game.waitUntilMapLoaded(() => {
      this.initWithMap();
    });
  }

  update(dt: number): void {
    if (this.eventTimer.updateAndCheck(dt)) {
      this.cleanupEnemyEntities();
      this.trySpawnEnemy();
    }
  }

  spawnMinion(denPosition: Vector3D): MinionScript | undefined {
    if (!this.game.hasResource(MinionDef.properties.spawnRequirement)) {
      return undefined;
    }

    const def = this.game.blockManager.getDef(denPosition);
    if (def !== DenDef) return undefined;

    this.game.subtractResource(
      MinionDef.properties.spawnRequirement,
      denPosition
    );
    return this.game.createEntity(MinionDef, denPosition);
  }

  private trySpawnEnemy() {
    if (this.enemyEntities.length >= maxEnemyEntities) return;
    if (this.enemyBases.length === 0) return;

    const type = Math.random() < 0.08 ? SnailDef : SlugDef;

    const basePos = this.enemyBases[randomInt(0, this.enemyBases.length - 1)];
    const top = { x: basePos.x, y: basePos.y + 1, z: basePos.z };
    const enemy = this.game.createEntity(type, top);
    this.enemyEntities.push(enemy);
  }

  private initWithMap() {
    Logger.trace('Initial enemy bases:', this.enemyBases);
    minetest.after(1, () => this.trySpawnEnemyBases());
  }

  /** @noSelf */
  private onLoadMapChunk = (event: LoadMapChunkEvent) => {
    event.volume.forEach((pos, i) => {
      const id = event.data[i];
      if (id === EnemyCrystalDef.registry.states.default.id) {
        this.enemyBases.push(vector.new(pos));
        Logger.trace('Loaded enemy base:', pos);
      }
    });
  };

  private trySpawnEnemyBases() {
    if (this.enemyBases.length >= maxEnemyBases) return;
    minetest.after(1, () => this.trySpawnEnemyBases());

    const baseSpawnPos = this.findEnemyBaseSpawnPos();
    if (!baseSpawnPos) return;

    Logger.trace('Spawning enemy base...', baseSpawnPos);
    this.enemyBases.push(baseSpawnPos);

    const baseUnderPos = vector.add(baseSpawnPos, { x: 0, y: -1, z: 0 });

    this.game.setBlock(EnemyCrystalDef, baseSpawnPos);
    this.game.setBlock(EnemyCrystalBaseDef, baseUnderPos);
  }

  private cleanupEnemyEntities() {
    for (let i = this.enemyEntities.length - 1; i >= 0; i--) {
      const enemy = this.enemyEntities[i];

      if (!enemy.alive) {
        this.enemyEntities.splice(i, 1);
      }
    }
  }

  // todo: delegate spawn base positioning to Stage implementation
  private findEnemyBaseSpawnPos(): Vector3D | undefined {
    const homePos = this.game.getHomePosition();
    const bounds = this.game.getStageBounds();
    const boundsExtent = bounds.getExtent();
    const boundsPadding = 20;
    const extent = Math.max(boundsExtent.x, boundsExtent.z);
    const safeRadius = extent * 0.2;
    const neighborRadius =
      this.enemyBases.length === 0
        ? 0
        : (extent * 0.4) / this.enemyBases.length;

    const pathfinder = Pathfinder.get(this.game, SlugDef.properties.locomotion);

    let attempts = 10;

    let pos: Vector3D | undefined;
    do {
      if (attempts-- <= 0) {
        return undefined;
      }

      pos = {
        x: randomInt(
          bounds.min.x + boundsPadding,
          bounds.max.x - boundsPadding
        ),
        y: randomInt(
          Math.max(bounds.min.y, homePos.y - 8),
          Math.min(bounds.max.y, homePos.y + 8)
        ),
        z: randomInt(
          bounds.min.z + boundsPadding,
          bounds.max.z - boundsPadding
        ),
      };

      if (
        hypot2(homePos.x - pos.x, homePos.z - pos.z) <
        safeRadius * safeRadius
      ) {
        Logger.trace('In safe radius:', pos);
        pos = undefined;
      }

      if (pos) {
        for (const otherBase of this.enemyBases) {
          if (
            hypot2(otherBase.x - pos.x, otherBase.z - pos.z) <
            neighborRadius * neighborRadius
          ) {
            Logger.trace('In neighbor radius:', pos);
            pos = undefined;
            break;
          }
        }
      }

      if (pos) {
        while (IsNode.solid(minetest.get_node(pos))) {
          pos.y++;
          if (pos.y > bounds.max.y) {
            Logger.trace('Reached ceiling:', pos);
            pos = undefined;
            break;
          }
        }
      }

      if (pos) {
        while (!IsNode.solid(minetest.get_node(pos))) {
          pos.y--;
          if (pos.y < bounds.min.y) {
            Logger.trace('Reached floor:', pos);
            pos = undefined;
            break;
          }
        }
      }

      if (pos) {
        pos.y++;
      }

      if (pos) {
        if (!pathfinder.findPath(pos, homePos).exists()) {
          Logger.trace('Unreachable:', pos);
          pos = undefined;
        }
      }
    } while (!pos);

    return pos;
  }
}
