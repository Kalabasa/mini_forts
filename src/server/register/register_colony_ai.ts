import { Meta } from 'common/meta';
import { MinionAgent } from 'server/ai/colony/agents/minion_agent';
import { ColonyAI } from 'server/ai/colony/colony_ai';
import { BallistaOperable } from 'server/ai/colony/operables/ballista_operable';
import { BallistaDef } from 'server/block/ballista/def';
import { BallistaScript } from 'server/block/ballista/script';
import { BlockDefinition } from 'server/block/block';
import { BlockManager } from 'server/block/block_manager';
import { DenDef } from 'server/block/den/def';
import { EnemyEntityScript } from 'server/entity/enemy_entity/enemy_entity';
import { MinionScript } from 'server/entity/minion/script';
import {
  AddBlockEvent,
  AddEntityEvent,
  AddGhostEvent,
  EntityDiedEvent,
  LoadMapChunkEvent,
  MarkDigEvent,
  RemoveBlockEvent,
  RemoveEntityEvent,
  RemoveGhostEvent,
  StartStageLoadEvent,
  UnmarkDigEvent,
} from 'server/game/events';
import { Game } from 'server/game/game';
import { createLogger, Logger } from 'utils/logger';

export function registerColonyAI(
  game: Game,
  blockManager: BlockManager,
  colonyAI: ColonyAI
) {
  Logger.info('Registering colony AI...');
  const logger = createLogger('registerColonyAI');

  colonyAI.setContext(game);

  game.events.on(StartStageLoadEvent, (event) => {
    colonyAI.reset();
  });

  game.events.on(LoadMapChunkEvent, (event) => {
    const { volume, data } = event;

    const nodesWithMeta = minetest.find_nodes_with_meta(volume.min, volume.max);
    for (const position of nodesWithMeta) {
      if (Meta.get(position).hasDigMark) {
        logger.info('Adding diggable:', position);
        colonyAI.addDiggable(position);
      }
    }

    volume.forEach((pos, i) => {
      const id = data[i];
      const blockDef = blockManager.getDefByNodeID(id);

      if (!blockDef) return;

      if (blockDef.hasGhost() && blockDef.registry.ghost.id === id) {
        logger.info('Adding buildable:', pos);
        colonyAI.addBuildable(vector.new(pos), blockDef);
      } else {
        processNewBlock(vector.new(pos), blockDef);
      }
    });
  });

  function processNewBlock(position: Vector3D, blockDef: BlockDefinition) {
    if (blockDef === BallistaDef) {
      logger.info('Adding BallistaOperable:', position);
      const blockRef = blockManager.getRef<BallistaScript>(position);
      colonyAI.addOperable(new BallistaOperable(blockRef, position, game));
    } else if (blockDef === DenDef) {
      logger.info('Adding Den:', position);
      colonyAI.addDen(position);
    }
  }

  game.events.on(AddBlockEvent, (event) =>
    processNewBlock(event.position, event.blockDef)
  );

  game.events.on(RemoveBlockEvent, (event) => {
    logger.info('Removing potential diggable:', event.position);
    colonyAI.removeDiggable(event.position);

    if (event.blockDef === BallistaDef) {
      logger.info('Removing BallistaOperable:', event.position);
      colonyAI.removeOperable(event.position);
    } else if (event.blockDef === DenDef) {
      logger.info('Removing Den:', event.position);
      colonyAI.removeDen(event.position);
    }
  });

  game.events.on(AddGhostEvent, (event) => {
    logger.info('Adding buildable:', event.position);
    colonyAI.addBuildable(event.position, event.blockDef);
  });

  game.events.on(RemoveGhostEvent, (event) => {
    logger.info('Removing buildable:', event.position);
    colonyAI.removeBuildable(event.position);
  });

  game.events.on(MarkDigEvent, (event) => {
    logger.info('Adding diggable:', event.position);
    colonyAI.addDiggable(event.position);
  });

  game.events.on(UnmarkDigEvent, (event) => {
    logger.info('Removing diggable:', event.position);
    colonyAI.removeDiggable(event.position);
  });

  game.events.on(AddEntityEvent, (event) => {
    if (event.entity instanceof MinionScript) {
      logger.info('Adding MinionAgent:', event.entity);
      colonyAI.addAgent(event.entity.id, new MinionAgent(game, event.entity));
    } else if (event.entity instanceof EnemyEntityScript) {
      logger.info('Adding EnemyEntity:', event.entity);
      colonyAI.addEnemy(event.entity.id, event.entity);
    }
  });

  game.events.on(EntityDiedEvent, (event) => {
    if (event.entity instanceof MinionScript) {
      logger.info('Removing dead MinionAgent:', event.entity);
      colonyAI.removeAgent(event.entity.id);
    } else if (event.entity instanceof EnemyEntityScript) {
      logger.info('Removing dead EnemyEntity:', event.entity);
      colonyAI.removeEnemy(event.entity.id);
    }
  });

  game.events.on(RemoveEntityEvent, (event) => {
    if (!event.entity.alive) return; // dead already handled

    if (event.entity instanceof MinionScript) {
      logger.info('Removing MinionAgent:', event.entity);
      colonyAI.removeAgent(event.entity.id);
    } else if (event.entity instanceof EnemyEntityScript) {
      logger.info('Removing EnemyEntity:', event.entity);
      colonyAI.removeEnemy(event.entity.id);
    }
  });
}
