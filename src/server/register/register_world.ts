import { Game } from 'server/game/game';
import { Logger } from 'utils/logger';
import { World } from 'server/world/world';

export function registerWorld(game: Game, world: World) {
  Logger.info('Registering world...');

  world.setContext(game);

  minetest.register_on_generated((minp, maxp, blockseed) => {
    world.generateMap(minp, maxp);
  });
}
