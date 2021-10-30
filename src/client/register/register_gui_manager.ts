import { ClientPlayer } from 'client/player/client_player';
import { GUIEngine } from 'common/gui/gui_engine';
import { GUIManager } from 'common/gui/gui_manager';

export function registerGUIManager() {
  const guiManager = new GUIManager(
    (p: ClientPlayer) =>
      new GUIEngine({
        addHUD: (def) => minetest.localplayer.hud_add(def),
        changeHUD: (...params) => minetest.localplayer.hud_change(...params),
        removeHUD: (id) => minetest.localplayer.hud_remove(id),
        showFormspec: (name, spec) => minetest.show_formspec(name, spec),
      })
  );

  minetest.register_on_formspec_input((formName, fields) =>
    guiManager.onReceiveFields(
      minetest.localplayer.get_name(),
      formName,
      fields
    )
  );

  return guiManager;
}
