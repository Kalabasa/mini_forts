import { Control, Player } from 'common/player/player';
import { Logger } from 'utils/logger';

const controlTableKey: Record<
  Control,
  keyof ReturnType<LocalPlayer['get_control']>
> = {
  [Control.Up]: 'up',
  [Control.Down]: 'down',
  [Control.Left]: 'left',
  [Control.Right]: 'right',
  [Control.Jump]: 'jump',
  [Control.Aux1]: 'aux1',
  [Control.Sneak]: 'sneak',
  [Control.Zoom]: 'zoom',
  [Control.Dig]: 'dig',
  [Control.Place]: 'place',
};

export class ClientPlayer implements Player {
  private loadCallbacks: Function[] | undefined = [];

  constructor() {
    this.pollLoad();
  }

  getName(): string {
    return minetest.localplayer.get_name();
  }

  isLoaded() {
    return minetest.localplayer != undefined && minetest.camera != undefined;
  }

  waitForLoad(callback: Function): void {
    if (this.isLoaded()) {
      callback();
    } else {
      this.loadCallbacks!.push(callback);
    }
  }

  private pollLoad(): void {
    if (this.isLoaded()) {
      for (const callback of this.loadCallbacks!) {
        callback();
      }
      this.loadCallbacks = undefined;
    } else {
      minetest.after(1, () => this.pollLoad());
    }
  }

  getPosition(): Vector3D {
    return minetest.localplayer.get_pos();
  }

  getEyePosition(): Vector3D {
    const eye = minetest.camera.get_offset();
    return vector.add(minetest.camera.get_pos(), eye);
  }

  getLookDir(): Vector3D {
    return minetest.camera.get_look_dir();
  }

  getControl(control: Control): boolean {
    return getControl(control, minetest.localplayer.get_control());
  }

  getTool(): ItemDefinition {
    // ItemStack.get_definition() does not work in the client
    const toolName = minetest.localplayer.get_wielded_item().get_name();
    return minetest.get_item_def(toolName)!;
  }
}

function getControl(
  control: Control,
  controlTable: ReturnType<LocalPlayer['get_control']>
): boolean {
  const key = controlTableKey[control];
  return controlTable[key];
}
