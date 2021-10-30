import { Player } from 'common/player/player';
import { GUI } from 'common/gui/gui';
import { Renderer } from 'common/gui/renderer';
import { throwError } from 'utils/error';
import { Logger } from 'utils/logger';

type Mount = {
  player: Player;
  root: GUI.Node;
  renderer: Renderer;
};

export class GUIManager {
  private mounts = new Map<string, Mount>();

  constructor(
    private readonly rendererProvider: (player: Player) => Renderer
  ) {}

  onReceiveFields(
    playerName: string,
    formName: string,
    fields: Record<string, string | undefined>
  ): boolean {
    for (const mount of this.mounts.values()) {
      if (mount.player.getName() === playerName) {
        if (mount.renderer.onReceiveFields(formName, fields)) return true;
      }
    }
    return false;
  }

  mount(player: Player, id: string, root: GUI.Node): void {
    const renderer = this.getRenderer(player, id);
    renderer.render(root);

    this.mounts.set(mountKey(player, id), {
      player,
      root,
      renderer,
    });
  }

  update(player: Player, id: string, root: GUI.Node): void {
    const mount = this.mounts.get(mountKey(player, id));
    if (!mount) throwError('Invalid mount key:', mountKey(player, id));

    mount.renderer.render(root);
  }

  unmount(player: Player, id: string): void {
    const mount = this.mounts.get(mountKey(player, id));
    if (!mount) throwError('Invalid mount key:', mountKey(player, id));

    mount.renderer.cleanup();

    this.mounts.delete(id);
  }

  private getRenderer(player: Player, id: string): Renderer {
    const mount = this.mounts.get(mountKey(player, id));
    if (mount) return mount.renderer;
    return this.rendererProvider(player);
  }
}

function mountKey(player: Player, id: string): string {
  return `${player.getName()}:${id}`;
}
