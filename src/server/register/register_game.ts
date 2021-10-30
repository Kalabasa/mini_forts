import { Game } from 'server/game/game';
import { Serializer } from 'server/game/serializer';
import { Logger } from 'utils/logger';

export function registerGame(game: Game) {
  Logger.info('Registering game...');

  minetest.set_timeofday(0.5);

  const storage = minetest.get_mod_storage();
  let initialized = false;

  minetest.register_on_mods_loaded(() => {
    minetest.after(0, () => {
      Logger.info('Loading game data...');
      const data = Serializer.deserializeGameData(storage);
      if (data) game.load(data);
      Logger.info('Initializing game...');
      game.onInit();
      initialized = true;
    });
  });

  minetest.register_on_shutdown(() => {
    Logger.info('Saving game data...');
    Serializer.serializeGameData(storage, game.save());
  });

  minetest.register_globalstep((dtime) => {
    if (!initialized) return;
    game.update(dtime);
  });

  minetest.handle_node_drops = () => {};
}
