import { GUIEngine } from 'common/gui/gui_engine';
import { GUIManager } from 'common/gui/gui_manager';
import { RemotePlayer } from 'server/player/remote_player';

export function registerGUIManager() {
  const guiManager = new GUIManager(
    (p: RemotePlayer) =>
      new GUIEngine({
        addHUD: (def) => p.playerObj.hud_add(def),
        changeHUD: (...params) => p.playerObj.hud_change(...params),
        removeHUD: (id) => p.playerObj.hud_remove(id),
        showFormspec: (name, spec) =>
          minetest.show_formspec(p.name, name, spec),
      })
  );

  minetest.register_on_player_receive_fields((player, formName, fields) =>
    guiManager.onReceiveFields(player.get_player_name(), formName, fields)
  );

  return guiManager;
}
