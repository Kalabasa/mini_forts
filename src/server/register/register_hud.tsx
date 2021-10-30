import { GameHUD } from 'common/gui/game_hud/game_hud';
import { GUI } from 'common/gui/gui';
import { GUIManager } from 'common/gui/gui_manager';
import {
  AddPlayerEvent,
  RemovePlayerEvent,
  UpdateResourcesEvent,
} from 'server/game/events';
import { Game } from 'server/game/game';
import { ResourceType } from 'server/game/resources';

const mountID = 'registerHUD';

export function registerHUD(game: Game, gguiManager: GUIManager) {
  game.events.on(AddPlayerEvent, (event) => {
    gguiManager.mount(
      event.player,
      mountID,
      <GameHUD
        wood={getResourceState(game, ResourceType.Wood)}
        stone={getResourceState(game, ResourceType.Stone)}
        metal={getResourceState(game, ResourceType.Metal)}
        spore={getResourceState(game, ResourceType.Spore)}
      />
    );
  });
  game.events.on(RemovePlayerEvent, (event) => {
    gguiManager.unmount(event.player, mountID);
  });
}

function getResourceState(game: Game, type: ResourceType): GUI.State<number> {
  const state = GUI.State.createMutableState(game.getResource(type));
  game.events.on(UpdateResourcesEvent, (event) => {
    state.setValue(event.resources[type]);
  });
  return state;
}
