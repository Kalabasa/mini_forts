import { ClientInteractionContext } from 'client/interaction/client_interaction_context';
import { ClientPlayer } from 'client/player/client_player';
import { checkRestrictions } from 'client/restrictions';
import { Channel } from 'common/channel/channel';
import { globals } from 'common/globals';
import {
  InteractionConfig,
  InteractionController,
} from 'common/interaction/interaction_controller';
import { ConfigureInteractionMessage } from 'common/interaction/interaction_messages';
import { GUIManager } from 'common/gui/gui_manager';
import { Logger } from 'utils/logger';

// todo: settingtypes.txt
const clientControl = true; // todo: disable clientControl on Android until fully tested
const config: InteractionConfig = {
  disableUse: false,
  disableDrop: true, // no undo client-side
  disablePlace: false,
  disableDig: false,
  enableDrag: true,
  enableAutoRepeat: true,
};

export function registerInteractions(
  player: ClientPlayer,
  guiManager: GUIManager
) {
  Logger.info('Registering interactions...');

  if (!clientControl) return;

  if (
    !checkRestrictions(minetest.get_csm_restrictions(), {
      lookup_nodes: "Can't set up client-side interactions!",
      read_nodedefs: "Can't set up client-side interactions!",
    })
  ) {
    return;
  }

  const channel = Channel.get(globals.interaction.channelName);
  const context = new ClientInteractionContext(player, channel, guiManager);
  const controller = new InteractionController(player, config, context);

  player.waitForLoad(() => {
    channel.join();
    channel.emit(
      new ConfigureInteractionMessage({
        clientControl: clientControl,
        drag: config.enableDrag,
        autoRepeat: config.enableAutoRepeat,
      })
    );
  });

  minetest.register_globalstep((dt) => {
    if (!player.isLoaded()) return;

    controller.onUpdate(dt);
  });

  minetest.register_on_punchnode((pos, node) => {
    if (!player.isLoaded()) return;

    const pointedThing: PointedThing = {
      type: 'node',
      above: pos,
      under: pos,
    };
    controller.onDig(pointedThing);
    return true;
  });

  minetest.register_on_placenode((pointedThing, item) => {
    if (!player.isLoaded()) return;
    controller.onPlace(pointedThing);
  });
}
