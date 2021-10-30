import { ColonyAI } from 'server/ai/colony/colony_ai';
import { BlockManager } from 'server/block/block_manager';
import { registerDebugPointed } from 'server/debug/debug_pointed';
import { EntityStore } from 'server/entity/entity_store';
import { registerCheats } from 'server/game/cheats';
import { Game } from 'server/game/game';
import { registerBlocks } from 'server/register/register_blocks';
import { registerColonyAI } from 'server/register/register_colony_ai';
import { registerEntities } from 'server/register/register_entities';
import { registerGame } from 'server/register/register_game';
import { registerGUIManager } from 'server/register/register_gui_manager';
import { registerHUD } from 'server/register/register_hud';
import { registerInteractions } from 'server/register/register_interactions';
import { registerPlayers } from 'server/register/register_players';
import { registerWorld } from 'server/register/register_world';
import { Barrier } from 'server/world/barrier';
import { World } from 'server/world/world';
import { CONFIG } from 'utils/config';
import { Logger } from 'utils/logger';
import { seedRandom } from 'utils/math';

Logger.info('=============================');
Logger.info('||        MiniForts        ||');
Logger.info('=============================');
Logger.info(`MiniForts v${CONFIG.version}`);
Logger.info(`Build ${CONFIG.build}`);
Logger.info('-----------------------------');

seedRandom(minetest.get_us_time());

const world = new World();
const colonyAI = new ColonyAI();
const blockManager = new BlockManager();
const entityStore = new EntityStore();
const game = new Game(world, blockManager, entityStore, colonyAI);

// 'Register' functions wire up game elements to the Minetest engine and to each other
Barrier.registerNode();
registerBlocks(game, blockManager);
registerWorld(game, world);
registerEntities(game, entityStore);
registerColonyAI(game, blockManager, colonyAI);
registerPlayers(game);
const guiManager = registerGUIManager();
registerInteractions(game, guiManager);
registerHUD(game, guiManager);
registerGame(game);
registerCheats(game);
registerDebugPointed(game);

Logger.info('Init done!');
