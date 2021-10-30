import { checkGame } from 'client/check_game';
import { ClientPlayer } from 'client/player/client_player';
import { registerGUIManager } from 'client/register/register_gui_manager';
import { registerInteractions } from 'client/register/register_interactions';
import { CONFIG } from 'utils/config';
import { Logger } from 'utils/logger';

if (checkGame()) initClient();

function initClient() {
  Logger.info('=============================');
  Logger.info('||    MiniForts Client     ||');
  Logger.info('=============================');
  Logger.info(`MiniForts Client v${CONFIG.version}`);
  Logger.info(`Build ${CONFIG.build}`);
  Logger.info('-----------------------------');

  const player = new ClientPlayer();
  const guiManager = registerGUIManager();

  registerInteractions(player, guiManager);

  Logger.info('Init done!');
}
