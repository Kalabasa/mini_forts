import { IsNode } from 'common/block/is_node';
import { ColonyAI } from 'server/ai/colony/colony_ai';
import { TaskPriority } from 'server/ai/colony/task';
import { Pathfinder } from 'server/ai/pathfinder/pathfinder';
import { CoreCrystalDef } from 'server/block/core_crystal/def';
import { CoreCrystalBaseDef } from 'server/block/core_crystal_base/def';
import { DenDef } from 'server/block/den/def';
import { EnemyCrystalDef } from 'server/block/enemy_crystal/def';
import { EnemyCrystalBaseDef } from 'server/block/enemy_crystal_base/def';
import { BeetleDef } from 'server/entity/beetle/def';
import {
  EnemyEntity,
  EnemyEntityProperties,
  EnemyEntityScript,
} from 'server/entity/enemy_entity/enemy_entity';
import { EntityDefinition } from 'server/entity/entity';
import { Faction } from 'server/entity/faction';
import { Locomotion } from 'server/entity/locomotion/locomotion';
import { MinionDef } from 'server/entity/minion/def';
import { MinionScript } from 'server/entity/minion/script';
import { SlugDef } from 'server/entity/slug/def';
import { SnailDef } from 'server/entity/snail/def';
import { LoadMapChunkEvent } from 'server/game/events';
import { Game } from 'server/game/game';
import { ResourceType } from 'server/game/resources';
import { unreachableCase } from 'utils/error';
import { ID } from 'utils/id';
import { createLogger } from 'utils/logger';
import { hypot2, randomInt } from 'utils/math';
import { IntervalTimer } from 'utils/timer';

const startingResources = {
  [ResourceType.Wood]: 200,
  [ResourceType.Stone]: 200,
  [ResourceType.Metal]: 200,
  [ResourceType.Spore]: 200,
};

const maxEnemyBases = 3;
const initialMaxEnemies = 1;

const logger = createLogger('Director');

// Gameplay logic
export class Director {
  private enemiesDisabled = false;
  private enemyBases: Vector3D[] = [];
  private readonly enemies = new Map<ID, EnemyEntity>();
  private maxEnemies = initialMaxEnemies;
  private gameTime = 0;

  private eventTimer = new IntervalTimer(10);

  constructor(
    private readonly game: Game,
    private readonly colonyAI: ColonyAI
  ) {
    game.events.onFor(LoadMapChunkEvent, this, this.onLoadMapChunk);
  }

  reset(): void {
    logger.trace('Resetting...');
    this.eventTimer.reset();
    this.enemyBases = [];
    this.enemies.clear();
    this.maxEnemies = initialMaxEnemies;
    this.gameTime = 0;
  }

  init(): void {
    this.game.setResources(startingResources);

    const homePos = this.game.getHomePosition();
    const homeUnderPos = vector.add(homePos, { x: 0, y: -1, z: 0 });

    this.game.setBlock(CoreCrystalDef, homePos);
    this.game.setBlock(CoreCrystalBaseDef, homeUnderPos);

    const initialMinions = [
      { x: homePos.x - 1, y: homePos.y, z: homePos.z },
      { x: homePos.x + 1, y: homePos.y, z: homePos.z },
      { x: homePos.x, y: homePos.y, z: homePos.z - 1 },
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
    this.gameTime += dt;

    if (this.enemiesDisabled) {
      for (const enemy of this.enemies.values()) {
        logger.trace('Enemies disabled. Removing enemy', enemy);
        enemy.objRef.remove();
      }
    }

    if (this.eventTimer.updateAndCheck(dt)) {
      const defenderCount = this.game.entityStore.count({
        volume: this.game.getStageBounds(),
        faction: Faction.Defenders,
      });
      this.maxEnemies = Math.round(
        Math.max(
          initialMaxEnemies,
          0.2 * defenderCount * Math.log2(this.gameTime)
        )
      );

      this.cleanupEnemyEntities();
      if (!this.enemiesDisabled) {
        this.trySpawnEnemy();
      }
    }
  }

  calculateResourceHarvestingPriority(type: ResourceType): TaskPriority {
    const [idealMin, idealMax] = this.calculateResourceAmountsIdealRange(type);
    const actualAmount = this.game.getResource(type);
    const value = (actualAmount - idealMin) / (idealMax - idealMin);
    if (value < 0) {
      // is below minimum
      return TaskPriority.High;
    } else if (value < 0.2) {
      return TaskPriority.Medium;
    } else {
      return TaskPriority.Low;
    }
  }

  private calculateResourceAmountsIdealRange(
    type: ResourceType
  ): [number, number] {
    // todo: optimise (this function is called for each type)
    let b = 0;
    const buildTasks = this.colonyAI.getBuildTasks();
    for (const buildTask of buildTasks) {
      const resource = buildTask.block.properties.resource;
      if (type === resource.type) {
        b += resource.amount;
      }
    }

    const e = this.enemies.size;
    if (type === ResourceType.Wood) {
      return [0, 40 + b * 2];
    } else if (type === ResourceType.Stone) {
      return [0, 60 + b * 2];
    } else if (type === ResourceType.Metal) {
      return [0, 40 + b * 2 + e * 10];
    } else if (type === ResourceType.Spore) {
      return [0, 160 + b * 2];
    } else {
      unreachableCase(type);
    }
  }

  // shouldn't this be a function in DenScript?
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

  addEnemy(id: ID, enemy: EnemyEntity): void {
    this.enemies.set(id, enemy);
  }

  removeEnemy(id: ID): void {
    this.enemies.delete(id);
  }

  disableEnemies() {
    logger.trace('Disable enemies');
    this.enemiesDisabled = true;
  }

  private trySpawnEnemy() {
    if (this.enemies.size >= this.maxEnemies) return;
    if (this.enemyBases.length === 0) return;

    const type = this.getEnemyTypeForSpawn();

    const basePos = this.enemyBases[randomInt(0, this.enemyBases.length - 1)];

    const possibleLocations: Vector3D[] = [];
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        if (x !== 0 && z !== 0) {
          const pos = vector.add(basePos, { x, y: 0, z });
          const under = vector.add(basePos, { x, y: -1, z });
          if (
            !Locomotion.solidNodeCost(
              type.properties.locomotion.moveCost(pos)
            ) &&
            Locomotion.solidNodeCost(type.properties.locomotion.moveCost(under))
          ) {
            possibleLocations.push(pos);
          }
        }
      }
    }

    if (possibleLocations.length === 0) return;

    const enemy = this.game.createEntity(
      type,
      possibleLocations[randomInt(0, possibleLocations.length - 1)]
    );
    this.enemies.set(enemy.id, enemy);
  }

  private getEnemyTypeForSpawn(): EntityDefinition<
    EnemyEntityProperties,
    EnemyEntityScript
  > {
    const proportions = [
      [SlugDef, 100],
      [SnailDef, 20 + 10 * Math.sin(this.gameTime * 0.002)],
      [BeetleDef, 10 + 5 * Math.sin(this.gameTime * 0.007)],
    ] as const;

    const total = proportions.reduce((sum, [, prop]) => sum + prop, 0);
    const choice = Math.random() * total;
    for (let i = 0, p = 0; i < proportions.length; i++) {
      const [def, prop] = proportions[i];
      p += prop;
      if (p >= choice) return def;
    }

    return proportions[proportions.length - 1][0];
  }

  private initWithMap() {
    logger.trace('Initial enemy bases:', this.enemyBases);
    minetest.after(1, () => this.trySpawnEnemyBases());
  }

  private onLoadMapChunk(event: LoadMapChunkEvent) {
    event.volume.forEach((pos, i) => {
      const id = event.data[i];
      if (id === EnemyCrystalDef.registry.states.default.id) {
        this.enemyBases.push(vector.new(pos));
        logger.trace('Loaded enemy base:', pos);
      }
    });
  }

  private trySpawnEnemyBases() {
    if (this.enemyBases.length >= maxEnemyBases) return;
    minetest.after(1, () => this.trySpawnEnemyBases());

    const baseSpawnPos = this.findEnemyBaseSpawnPos();
    if (!baseSpawnPos) return;

    logger.trace('Spawning enemy base...', baseSpawnPos);
    this.enemyBases.push(baseSpawnPos);

    const baseUnderPos = vector.add(baseSpawnPos, { x: 0, y: -1, z: 0 });

    for (let x = -1; x <= 1; x++) {
      for (let y = 0; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          minetest.remove_node(vector.add(baseSpawnPos, { x, y, z }));
        }
      }
    }
    this.game.setBlock(EnemyCrystalDef, baseSpawnPos);
    this.game.setBlock(EnemyCrystalBaseDef, baseUnderPos);
  }

  private cleanupEnemyEntities() {
    for (const enemy of this.enemies.values()) {
      if (!enemy.alive) {
        this.enemies.delete(enemy.id);
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
        logger.trace('In safe radius:', pos);
        pos = undefined;
      }

      if (pos) {
        for (const otherBase of this.enemyBases) {
          if (
            hypot2(otherBase.x - pos.x, otherBase.z - pos.z) <
            neighborRadius * neighborRadius
          ) {
            logger.trace('In neighbor radius:', pos);
            pos = undefined;
            break;
          }
        }
      }

      if (pos) {
        while (IsNode.solid(minetest.get_node(pos))) {
          pos.y++;
          if (pos.y > bounds.max.y) {
            logger.trace('Reached ceiling:', pos);
            pos = undefined;
            break;
          }
        }
      }

      if (pos) {
        while (!IsNode.solid(minetest.get_node(pos))) {
          pos.y--;
          if (pos.y < bounds.min.y) {
            logger.trace('Reached floor:', pos);
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
          logger.trace('Unreachable:', pos);
          pos = undefined;
        }
      }
    } while (!pos);

    return pos;
  }
}
