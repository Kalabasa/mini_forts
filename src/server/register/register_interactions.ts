import { BlockTag } from 'common/block/tag';
import { Channel, ChannelMessageType } from 'common/channel/channel';
import { globals } from 'common/globals';
import { GUIManager } from 'common/gui/gui_manager';
import { InteractionContext } from 'common/interaction/interaction_context';
import {
  InteractionConfig,
  InteractionController,
} from 'common/interaction/interaction_controller';
import {
  BuildInteractionMessage,
  ConfigureInteractionMessage,
  DigInteractionMessage,
  SpawnMinionInteractionMessage,
  UnbuildInteractionMessage,
  UndigInteractionMessage,
  UseInteractionMessage,
} from 'common/interaction/interaction_messages';
import { BallistaDef } from 'server/block/ballista/def';
import { BarricadeDef } from 'server/block/barricade/def';
import { BlockDefinition } from 'server/block/block';
import { DenDef } from 'server/block/den/def';
import { DoorDef } from 'server/block/door/def';
import { ExtractorDef } from 'server/block/extractor/def';
import { Ghost } from 'server/block/ghost';
import { WallDef } from 'server/block/wall/def';
import { AddPlayerEvent, RemovePlayerEvent } from 'server/game/events';
import { Game } from 'server/game/game';
import { digMarker } from 'server/interaction/dig_marker/dig_marker';
import { ServerInteractionManager } from 'server/interaction/server_interaction_manager';
import { ToolRegistry } from 'server/interaction/tool_registry';
import { Immutable, Mutable } from 'utils/immutable';
import { Logger } from 'utils/logger';
import { Volume } from 'utils/space';

const defaultToolCapabilities = {
  full_punch_interval: 0,
  max_drop_level: 0,
  groupcaps: {},
  damage_groups: {},
};

const defaultConfig: InteractionConfig = {
  disableUse: false,
  disableDrop: false,
  disablePlace: false,
  disableDig: false,
  enableDrag: false,
  enableAutoRepeat: true,
};

export function registerInteractions(game: Game, guiManager: GUIManager) {
  Logger.info('Registering interactions...');

  minetest.register_entity(globals.markers.digMarker, digMarker);

  const tools = [
    registerTool(BarricadeDef),
    registerTool(WallDef),
    registerTool(DoorDef),
    registerTool(DenDef),
    registerTool(ExtractorDef),
    registerTool(BallistaDef),
  ];

  const channel = Channel.get(globals.interaction.channelName);
  const manager = new ServerInteractionManager(game, guiManager);

  channel.join();

  game.events.on(AddPlayerEvent, (event) => {
    manager.addPlayer(event.player, defaultConfig);

    const { playerObj } = event.player;

    const inventory = playerObj.get_inventory();
    inventory.set_lists({
      main: tools,
    });
    inventory.set_size(globals.interaction.mainInventoryList, tools.length);
    playerObj.hud_set_hotbar_itemcount(tools.length);
  });

  game.events.on(RemovePlayerEvent, (event) => {
    manager.removePlayer(event.player);
  });

  channel.on(ConfigureInteractionMessage, (message) => {
    const controller = manager.getForPlayer(message.sender)?.controller;
    if (!controller) return;

    const { clientControl, drag, autoRepeat } = message.properties;

    const config = {
      disableUse: clientControl,
      disablePlace: clientControl,
      disableDig: clientControl,
      disableDrop: false,
      enableDrag: drag,
      enableAutoRepeat: autoRepeat,
    };
    controller.setConfig(config);

    Logger.trace(`Player '${message.sender}' set interaction config:`, config);
  });

  registerMessageHandler(UseInteractionMessage, (context, { pos }) => {
    context.use(pos);
  });

  registerMessageHandler(
    BuildInteractionMessage,
    (context, { min, max, toolName }) => {
      context.addGhost(new Volume(min, max), toolName);
    }
  );

  registerMessageHandler(UnbuildInteractionMessage, (context, { min, max }) => {
    context.removeGhost(new Volume(min, max));
  });

  registerMessageHandler(DigInteractionMessage, (context, { min, max }) => {
    context.markDig(new Volume(min, max));
  });

  registerMessageHandler(UndigInteractionMessage, (context, { min, max }) => {
    context.unmarkDig(new Volume(min, max));
  });

  registerMessageHandler(SpawnMinionInteractionMessage, (context, { pos }) => {
    context.spawnMinion(pos);
  });

  minetest.register_on_punchnode(
    (
      pos: Vector3D,
      node: Node,
      puncher: PlayerObject,
      pointedThing: PointedNode
    ) => {
      const controller = getController(puncher);
      if (!controller) return;

      controller.onDig(pointedThing);
    }
  );

  minetest.register_globalstep((dt) => {
    manager.update(dt);
  });

  minetest.override_item('', {
    wield_image: '',
    tool_capabilities: defaultToolCapabilities,
    range: globals.interaction.range,
  });

  function registerTool(placedBlockDef: BlockDefinition.WithGhost): string {
    const { name, properties, registry } = placedBlockDef;

    const toolName = 'mini_forts:tool__' + name;

    const toolDef: Immutable<ItemDefinition> = {
      name: toolName,
      inventory_image: Ghost.getInventoryImage(properties.ghost),
      range: globals.interaction.range,
      groups: BlockTag.defineGroups({
        BuildStyle: properties.ghost.buildStyle,
        PhysicsAttachment: properties.physics.attachment,
        PhysicsSupport: properties.physics.support,
      }),
      tool_capabilities: defaultToolCapabilities,
      // for some reason it needs a prediction for on_placenode to work client-side
      // but using a real prediction will result in janky experience, so... 'air'
      node_placement_prediction: 'air',

      on_drop: (itemStack, dropper, position) => {
        if (!dropper) return itemStack;

        const controller = getController(dropper);
        if (!controller) return itemStack;

        controller.onDrop();
        return itemStack;
      },

      on_place: (itemStack, placer, pointedThing) => {
        if (!placer) return itemStack;

        const controller = getController(placer);
        if (!controller) return itemStack;

        controller.onPlace(pointedThing);
        return itemStack;
      },
    };

    minetest.register_tool(toolName, toolDef as Mutable<ItemDefinition>);

    ToolRegistry.toolToGhost[toolName] = registry.ghost.name;

    return toolName;
  }

  function registerMessageHandler<T extends object>(
    type: ChannelMessageType<T>,
    callback: (context: InteractionContext, properties: T) => void
  ) {
    channel.on(type, (message) => {
      const context = getContext(message.sender);
      if (!context) return;
      callback(context, message.properties);
    });
  }

  function getContext(playerName: string): InteractionContext | undefined {
    return manager.getForPlayer(playerName)?.context;
  }

  function getController(
    obj: ObjectRef | PlayerObject
  ): InteractionController | undefined {
    if (!obj.is_player()) return undefined;
    const name = obj.get_player_name();
    return manager.getForPlayer(name)?.controller;
  }
}
