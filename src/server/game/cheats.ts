import { Game } from 'server/game/game';
import { ResourceType } from 'server/game/resources';
import { CONFIG } from 'utils/config';

export function registerCheats(game: Game) {
  if (CONFIG.isProd) return;

  minetest.register_chatcommand('add_resource', {
    params: '<type> <amount>',
    func: (name, param) => {
      const [typeName, amountString] = param.trim().split(' ');

      try {
        const amount = parseInt(amountString);

        for (const [key, value] of Object.entries(ResourceType)) {
          if (typeName.toLowerCase() === key.toLowerCase()) {
            game.addResource({ type: value, amount });
            return $multi(true);
          }
        }
      } catch (e) {}

      return $multi(false);
    },
  });
}
