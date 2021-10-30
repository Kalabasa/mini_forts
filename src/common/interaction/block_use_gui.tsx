import { BlockTag } from 'common/block/tag';
import { GUI } from 'common/gui/gui';
import { GUIManager } from 'common/gui/gui_manager';
import { DenMenu } from 'common/gui/den_menu/den_menu';
import { InteractionContext } from 'common/interaction/interaction_context';
import { Player } from 'common/player/player';

const mountID = 'blockUse';

export function openBlockUseGUI(
  useTag: BlockTag.Code<'Use'>,
  player: Player,
  position: Vector3D,
  context: InteractionContext,
  guiManager: GUIManager
) {
  let gui;

  if (useTag === BlockTag.UseOpenDenMenu) {
    gui = (
      <DenMenu
        onSelectSpawnMinion={() => {
          context.spawnMinion(position);
          guiManager.unmount(player, mountID);
        }}
      />
    );
  }

  if (!gui) return;

  guiManager.mount(player, mountID, gui);
}
