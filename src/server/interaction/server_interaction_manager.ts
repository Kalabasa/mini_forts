import { IsNode } from 'common/block/is_node';
import { BlockTag } from 'common/block/tag';
import { globals } from 'common/globals';
import { GUIManager } from 'common/gui/gui_manager';
import { openBlockUseGUI } from 'common/interaction/block_use_gui';
import { InteractionContext } from 'common/interaction/interaction_context';
import {
  InteractionConfig,
  InteractionController,
} from 'common/interaction/interaction_controller';
import { Meta } from 'common/meta';
import { BlockProperties, BlockRef } from 'server/block/block';
import { GameContext } from 'server/game/context';
import {
  MarkDigEvent,
  RemoveBlockEvent,
  UnmarkDigEvent,
} from 'server/game/events';
import { ToolRegistry } from 'server/interaction/tool_registry';
import { RemotePlayer } from 'server/player/remote_player';
import { throwError } from 'utils/error';
import { Volume } from 'utils/space';

export class ServerInteractionManager {
  private playerStore = new Map<
    string,
    { context: InteractionContext; controller: InteractionController }
  >();

  constructor(
    private readonly gameContext: GameContext,
    private readonly guiManager: GUIManager
  ) {
    gameContext.events.onFor(RemoveBlockEvent, this, (event) => {
      removeDigMarkers(new Volume(event.position, event.position));
    });
  }

  update(dt: number): void {
    for (const { controller } of this.playerStore.values()) {
      if ((controller.player as RemotePlayer).isConnected()) {
        controller.onUpdate(dt);
      }
    }
  }

  addPlayer(player: RemotePlayer, config: InteractionConfig): void {
    const context = new PlayerInteractionContext(
      player,
      this.gameContext,
      this.guiManager
    );
    const controller = new InteractionController(player, config, context);
    this.playerStore.set(player.name, { context, controller });
  }

  getForPlayer(
    playerName: string
  ):
    | { context: InteractionContext; controller: InteractionController }
    | undefined {
    return this.playerStore.get(playerName);
  }

  removePlayer(player: RemotePlayer): void {
    this.playerStore.delete(player.name);
  }
}

class PlayerInteractionContext implements InteractionContext {
  private undoGroupStack: Function[][] = [];
  private undoGroup: Function[] | undefined;

  constructor(
    private readonly player: RemotePlayer,
    private readonly gameContext: GameContext,
    private readonly guiManager: GUIManager
  ) {}

  canUse(position: Vector3D): boolean {
    return IsNode.useable(minetest.get_node(position));
  }

  use(position: Vector3D): void {
    if (!this.canUse(position)) return;

    const node = minetest.get_node(position);
    const nodeDef = minetest.registered_nodes[node.name];
    if (!nodeDef) return;

    const useTag = BlockTag.get(nodeDef, BlockTag.Use);
    if (useTag === BlockTag.UseScript) {
      const ref =
        this.gameContext.blockManager.getRef<
          BlockRef<BlockProperties.WithUseScript>
        >(position);

      ref.onUseScript(this.player.playerObj);
    } else if (useTag) {
      openBlockUseGUI(useTag, this.player, position, this, this.guiManager);
    }
  }

  undo(): void {
    // prevent recording an undo of the undo (shouldn't happen by the logic, but...)
    this.undoGroup = undefined;

    if (this.undoGroupStack.length > 0) {
      const undoGroup = this.undoGroupStack.pop()!;
      for (const undo of undoGroup) {
        undo();
      }
    }
  }

  private startUndoGroup() {
    this.undoGroup = [];
  }

  private commitUndoGroup() {
    if (!this.undoGroup) throwError('Undo group not started!');

    this.undoGroupStack.push(this.undoGroup);
    if (this.undoGroupStack.length > 10) {
      this.undoGroupStack.shift();
    }
    this.undoGroup = undefined;
  }

  private recordUndo(fn: Function) {
    if (!this.undoGroup) return;
    this.undoGroup.push(fn);
  }

  canAddGhost(position: Vector3D): boolean {
    return IsNode.air(minetest.get_node(position));
  }

  canRemoveGhost(position: Vector3D): boolean {
    return IsNode.ghost(minetest.get_node(position));
  }

  canMarkDig(position: Vector3D): boolean {
    return (
      IsNode.diggable(minetest.get_node(position)) &&
      !Meta.get(position).hasDigMark
    );
  }

  canUnmarkDig(position: Vector3D): boolean {
    return Meta.get(position).hasDigMark;
  }

  addGhost(volume: Volume, toolName: string): void {
    if (volume.volume() > globals.interaction.maxSize) return;

    const ghostNodeName = ToolRegistry.toolToGhost[toolName];
    if (!ghostNodeName) return;

    // TODO VoxelManip for batch changes
    this.startUndoGroup();
    volume.forEach((pos) =>
      this.addGhostSingle(vector.new(pos), ghostNodeName)
    );
    this.commitUndoGroup();
  }

  removeGhost(volume: Volume): void {
    if (volume.volume() > globals.interaction.maxSize) return;

    // TODO VoxelManip for batch changes
    this.startUndoGroup();
    volume.forEach((pos) => this.removeGhostSingle(vector.new(pos)));
    this.commitUndoGroup();
  }

  markDig(volume: Volume): void {
    if (volume.volume() > globals.interaction.maxSize) return;

    this.startUndoGroup();
    volume.forEach((pos) => this.markDigSingle(vector.new(pos)));
    this.commitUndoGroup();
  }

  unmarkDig(volume: Volume): void {
    if (volume.volume() > globals.interaction.maxSize) return;

    const nodesWithMeta = minetest.find_nodes_with_meta(volume.min, volume.max);

    this.startUndoGroup();
    nodesWithMeta.forEach((pos) => this.unmarkDigSingle(vector.new(pos)));
    this.commitUndoGroup();

    removeDigMarkers(volume);
  }

  spawnMinion(denPosition: Vector3D): void {
    this.gameContext.getDirector().spawnMinion(denPosition);
  }

  private addGhostSingle(position: Vector3D, ghostNodeName: string): void {
    if (!this.canAddGhost(position)) return;
    if (!IsNode.ghost({ name: ghostNodeName })) return;

    minetest.set_node(position, { name: ghostNodeName });

    this.recordUndo(() => this.removeGhostSingle(position));
  }

  private removeGhostSingle(position: Vector3D): void {
    if (!this.canRemoveGhost(position)) return;

    const node = minetest.get_node(position);
    minetest.remove_node(position);

    this.recordUndo(() => this.addGhostSingle(position, node.name));
  }

  private markDigSingle(position: Vector3D): void {
    if (!this.canMarkDig(position)) return;

    Meta.get(position).hasDigMark = true;
    minetest.add_entity(position, globals.markers.digMarker);

    this.recordUndo(() => {
      this.unmarkDigSingle(position);
      removeDigMarkers({ min: position, max: position });
    });

    this.gameContext.events.emit(new MarkDigEvent(position));
  }

  private unmarkDigSingle(position: Vector3D): void {
    if (!this.canUnmarkDig(position)) return;

    Meta.get(position).hasDigMark = false;

    this.recordUndo(() => this.markDigSingle(position));

    this.gameContext.events.emit(new UnmarkDigEvent(position));
  }
}

// I added dig markers, I should remove dig markers
function removeDigMarkers(volume: { min: Vector3D; max: Vector3D }) {
  minetest
    .get_objects_in_area(
      { x: volume.min.x - 0.5, y: volume.min.y - 0.5, z: volume.min.z - 0.5 },
      { x: volume.max.x + 0.5, y: volume.max.y + 0.5, z: volume.max.z + 0.5 }
    )
    .forEach((objRef: ObjectRef | LuaEntitySAO) => {
      if (!('get_luaentity' in objRef)) return;
      const luaEntity = objRef.get_luaentity();
      if (luaEntity == undefined) return;
      if (luaEntity.name === globals.markers.digMarker) {
        luaEntity.object.remove();
      }
    });
}
