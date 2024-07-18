import { Game } from 'server/game/game';
import { ResourceType } from 'server/game/resources';
import { CONFIG } from 'utils/config';

export function registerCheats(game: Game) {
  if (CONFIG.isProd) return;

  minetest.register_chatcommand('add_resource', {
    params: '<type> <amount>',
    func: (name, param) => {
      const [typeName, amountString] = param.toLowerCase().trim().split(' ');

      try {
        const amount = parseInt(amountString);

        let added = false;
        for (const [key, value] of Object.entries(ResourceType)) {
          if (typeName === 'all' || typeName === key.toLowerCase()) {
            game.addResource({ type: value, amount });
            added = true;
          }
        }
        if (added) return $multi(true);
      } catch (e) {}

      return $multi(false);
    },
  });

  minetest.register_chatcommand('disable_enemies', {
    func: (name, param) => {
      game.getDirector().disableEnemies();
      return $multi(true);
    },
  });
}
