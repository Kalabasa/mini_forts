import { globals } from 'common/globals';
import { Control, Player } from 'common/player/player';
import { getBit } from 'utils/math';

const controlBit: Record<Control, number> = {
  [Control.Up]: 0,
  [Control.Down]: 1,
  [Control.Left]: 2,
  [Control.Right]: 3,
  [Control.Jump]: 4,
  [Control.Aux1]: 5,
  [Control.Sneak]: 6,
  [Control.Dig]: 7,
  [Control.Place]: 8,
  [Control.Zoom]: 9,
};

export class RemotePlayer implements Player {
  readonly name: string;
  connected: boolean;

  constructor(readonly playerObj: PlayerObject) {
    this.name = playerObj.get_player_name();
  }

  getName(): string {
    return this.name;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getPosition(): Vector3D {
    return this.playerObj.get_pos();
  }

  getEyePosition(): Vector3D {
    const [fpEye, tpEye] = this.playerObj.get_eye_offset();
    return vector.add(this.playerObj.get_pos(), fpEye);
  }

  getLookDir(): Vector3D {
    return this.playerObj.get_look_dir();
  }

  getControl(control: Control): boolean {
    return getControl(control, this.playerObj.get_player_control_bits());
  }

  getTool(): ItemDefinition {
    const hotbar = this.playerObj
      .get_inventory()
      .get_list(globals.interaction.mainInventoryList);
    return hotbar[this.playerObj.get_wield_index() - 1].get_definition();
  }
}

function getControl(control: Control, bits: number): boolean {
  const bit = controlBit[control];
  return getBit(bits, bit) > 0;
}
