import { ClientPlayer } from 'client/player/client_player';
import { IsNode } from 'common/block/is_node';
import { BlockTag } from 'common/block/tag';
import { Channel } from 'common/channel/channel';
import { GUIManager } from 'common/gui/gui_manager';
import { openBlockUseGUI } from 'common/interaction/block_use_gui';
import { InteractionContext } from 'common/interaction/interaction_context';
import {
  BuildInteractionMessage,
  DigInteractionMessage,
  SpawnMinionInteractionMessage,
  UnbuildInteractionMessage,
  UndigInteractionMessage,
  UseInteractionMessage
} from 'common/interaction/interaction_messages';
import { Meta } from 'common/meta';
import { throwError } from 'utils/error';
import { Volume } from 'utils/space';

export class ClientInteractionContext implements InteractionContext {
  constructor(
    private readonly player: ClientPlayer,
    private readonly channel: Channel,
    private readonly guiManager: GUIManager
  ) {}

  canUse(position: Vector3D): boolean {
    return IsNode.useable(minetest.get_node_or_nil(position));
  }

  use(position: Vector3D): void {
    if (!this.canUse(position)) return;

    const node = minetest.get_node_or_nil(position);
    if (!node) return;

    const nodeDef = minetest.get_node_def(node.name);
    if (!nodeDef) return;

    const useTag = BlockTag.get(nodeDef, BlockTag.Use);
    if (useTag === BlockTag.UseScript) {
      this.channel.emit(new UseInteractionMessage({ pos: position }));
    } else if (useTag) {
      openBlockUseGUI(useTag, this.player, position, this, this.guiManager);
    }
  }

  undo(): void {
    throwError('Client-side undo not supported!');
  }

  canAddGhost(position: Vector3D): boolean {
    return IsNode.air(minetest.get_node_or_nil(position));
  }

  canRemoveGhost(position: Vector3D): boolean {
    return IsNode.ghost(minetest.get_node_or_nil(position));
  }

  canMarkDig(position: Vector3D): boolean {
    return (
      IsNode.diggable(minetest.get_node_or_nil(position)) &&
      !Meta.get(position).hasDigMark
    );
  }

  canUnmarkDig(position: Vector3D): boolean {
    return Meta.get(position).hasDigMark;
  }

  addGhost(volume: Volume, name: string): void {
    this.channel.emit(
      new BuildInteractionMessage({
        toolName: name,
        min: volume.min,
        max: volume.max,
      })
    );
  }

  removeGhost(volume: Volume): void {
    this.channel.emit(
      new UnbuildInteractionMessage({
        min: volume.min,
        max: volume.max,
      })
    );
  }

  markDig(volume: Volume): void {
    this.channel.emit(
      new DigInteractionMessage({
        min: volume.min,
        max: volume.max,
      })
    );
  }

  unmarkDig(volume: Volume): void {
    this.channel.emit(
      new UndigInteractionMessage({
        min: volume.min,
        max: volume.max,
      })
    );
  }

  spawnMinion(position: Vector3D): void {
    this.channel.emit(new SpawnMinionInteractionMessage({ pos: position }));
  }
}
