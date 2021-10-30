import { globals } from 'common/globals';
import { Game } from 'server/game/game';
import { RemotePlayer } from 'server/player/remote_player';
import { CONFIG } from 'utils/config';
import { Logger } from 'utils/logger';
import { IntervalTimer } from 'utils/timer';

export function registerDebugPointed(game: Game) {
  if (CONFIG.isProd) return;

  let enabledForPlayer: RemotePlayer | undefined;
  let hudID: number | undefined;

  const timer = new IntervalTimer(0.2);

  minetest.register_globalstep((dt) => {
    if (!timer.updateAndCheck(dt)) return;

    if (!enabledForPlayer) return;

    if (!hudID) {
      Logger.error('Pointed thing debugger error!');
      enabledForPlayer = undefined;
      return;
    }

    let info: (string | undefined)[] = ['...'];

    const origin = enabledForPlayer.getEyePosition();
    const front = vector.add(
      origin,
      vector.multiply(enabledForPlayer.getLookDir(), globals.interaction.range)
    );
    const raycast = Raycast(origin, front, false, false);

    for (const pointedThing of raycast) {
      const node = minetest.get_node(pointedThing.under);
      const def = game.blockManager.getDefByNodeName(node.name);
      const ref = game.blockManager.getRef(pointedThing.under);
      const entities = game.entityStore.find({
        volume: {
          min: vector.subtract(pointedThing.above, 0.5),
          max: vector.add(pointedThing.above, 0.5),
        },
      });

      info = [
        `(${pointedThing.under.x},${pointedThing.under.y},${pointedThing.under.z})`,
        `Node: '${node.name}'`,
        def && `Block: '${def.name}' Health: ${ref?.getHealth()}`,
        Logger.format(...entities),
      ];
      break;
    }

    enabledForPlayer.playerObj.hud_change(
      hudID,
      'text',
      info.filter((s) => s).join('\n')
    );
  });

  minetest.register_chatcommand('debug_pointed', {
    func: (playerName, param) => {
      if (enabledForPlayer) {
        if (hudID) enabledForPlayer.playerObj.hud_remove(hudID);

        enabledForPlayer = undefined;
        hudID = undefined;

        return $multi(true, 'Pointed thing debugger off');
      } else {
        enabledForPlayer = game.findPlayerByName(playerName);

        if (enabledForPlayer) {
          hudID = enabledForPlayer.playerObj.hud_add({
            position: { x: 0.5, y: 0.5 },
            offset: { x: 0, y: globals.ui.smallSize },
            alignment: { x: 1, y: 1 },
            hud_elem_type: 'text',
            text: 'Pointed thing debugger',
            name: 'Pointed thing debugger',
            number: 0xff0000,
            scale: { x: globals.ui.largeSize, y: globals.ui.smallSize },
            size: { x: 1 },
          });
        }

        return $multi(
          enabledForPlayer != undefined,
          'Pointed thing debugger on'
        );
      }
    },
  });
}
