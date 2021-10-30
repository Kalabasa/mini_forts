import { BlockTag } from 'common/block/tag';
import { res } from 'resource_id';
import { BallistaDef } from 'server/block/ballista/def';
import { BarricadeDef } from 'server/block/barricade/def';
import { BedrockDef } from 'server/block/bedrock/def';
import {
  BlockCallbacks,
  BlockDefinition,
  BlockProperties,
  BlockRef,
  BlockScript,
} from 'server/block/block';
import { BlockManager } from 'server/block/block_manager';
import { CoreCrystalDef } from 'server/block/core_crystal/def';
import { CoreCrystalBaseDef } from 'server/block/core_crystal_base/def';
import { DenDef } from 'server/block/den/def';
import { DoorDef } from 'server/block/door/def';
import { EnemyCrystalDef } from 'server/block/enemy_crystal/def';
import { EnemyCrystalBaseDef } from 'server/block/enemy_crystal_base/def';
import { ExtractorDef } from 'server/block/extractor/def';
import { FertileSoilDef } from 'server/block/fertile_soil/def';
import { Ghost } from 'server/block/ghost';
import { OreDef } from 'server/block/ore/def';
import { RockDef } from 'server/block/rock/def';
import { SoilDef } from 'server/block/soil/def';
import { WallDef } from 'server/block/wall/def';
import { WoodDef } from 'server/block/wood/def';
import {
  AddBlockEvent,
  AddGhostEvent,
  LoadMapChunkEvent,
  RemoveBlockEvent,
  RemoveGhostEvent,
} from 'server/game/events';
import { Game } from 'server/game/game';
import { EventBus } from 'utils/event_bus';
import { Mutable } from 'utils/immutable';
import { Logger } from 'utils/logger';
import { vectorFloorDiv } from 'utils/math';
import { Volume } from 'utils/space';

const registeredNodeNames: string[] = [];

export function registerBlocks(game: Game, blockManager: BlockManager) {
  Logger.info('Registering blocks...');

  blockManager.setContext(game);

  registerBlock(BallistaDef);
  registerBlock(BarricadeDef);
  registerBlock(BedrockDef);
  registerBlock(CoreCrystalBaseDef);
  registerBlock(CoreCrystalDef);
  registerBlock(DenDef);
  registerBlock(DoorDef);
  registerBlock(EnemyCrystalBaseDef);
  registerBlock(EnemyCrystalDef);
  registerBlock(ExtractorDef);
  registerBlock(FertileSoilDef);
  registerBlock(OreDef);
  registerBlock(RockDef);
  registerBlock(SoilDef);
  registerBlock(WallDef);
  registerBlock(WoodDef);

  minetest.register_lbm({
    name: res('node_load_event'),
    label: 'Block load event',
    nodenames: registeredNodeNames,
    run_at_every_load: true,
    action: (pos: Vector3D, node: Node) => {
      const validBounds = game.getStageBounds();
      if (!validBounds) return;
      queueLoadNodeEvent(pos, validBounds, game.events);
    },
  });

  function registerBlock(def: BlockDefinition) {
    const { name, properties, registry } = def;

    const physicsTags = {
      PhysicsAttachment: properties.physics.attachment,
      PhysicsSupport: properties.physics.support,
    };

    const baseNodeDef: Partial<NodeDefinition> = {
      diggable: properties.digTime < Infinity,
      // param2 will be used to store health
      paramtype2: properties.hasHealth() ? 'none' : undefined,
      // groups will be used to store arbitrary tags
      groups: BlockTag.defineGroups({
        ...properties.tags,
        ...physicsTags,
      }),
      ...mixinNodeCallbacks(def),
    };

    def.registry.groups = baseNodeDef.groups ?? {};

    for (const [state, stateNodeDef] of Object.entries(
      properties.nodeDefinition
    )) {
      const nodeDef: NodeDefinition = {
        ...baseNodeDef,
        ...(stateNodeDef as Mutable<NodeDefinition>),
      };

      const nodeName = res(name + '__' + state);
      registry.states[state] = registerNode(nodeName, nodeDef);
    }

    if (def.hasGhost()) {
      const nodeDef: NodeDefinition = {
        ...Ghost.defineNode(def.properties.ghost, physicsTags),
        ...mixinGhostNodeCallbacks(def),
      };

      const nodeName = res(name + '__ghost');
      def.registry.ghost = registerNode(nodeName, nodeDef);
    }

    blockManager.addDefinition(def);
  }

  function createNodeCallback(
    callback: (position: Vector3D) => void
  ): (position: Vector3D) => void {
    return (position: Vector3D) => {
      const validBounds = game.getStageBounds();
      if (!validBounds || !validBounds.containsPoint(position)) return;
      callback(position);
    };
  }

  function mixinNodeCallbacks<P extends BlockProperties, S extends BlockRef<P>>(
    def: BlockDefinition<P, S>
  ): Partial<NodeDefinition> {
    const { properties } = def;

    return {
      on_timer: properties.hasTimer()
        ? createNodeCallback((position) => {
            const blockRef =
              blockManager.getRef<BlockRef<typeof properties>>(position);
            blockRef.onTimer();
          })
        : undefined,

      on_construct: createNodeCallback((position) => {
        game.events.emit(
          new AddBlockEvent(position, minetest.get_node(position), def)
        );
      }),

      on_destruct: createNodeCallback((position) => {
        if (properties.hasDestroy()) {
          const blockRef =
            blockManager.getRef<BlockRef<typeof properties>>(position);
          blockRef.onDestroy();
          blockRef.invalidate();
        }

        const node = minetest.get_node(position);
        // Emit event after when is gone
        minetest.after(0, () =>
          game.events.emit(new RemoveBlockEvent(position, node, def))
        );
      }),
    };
  }

  function mixinGhostNodeCallbacks<
    P extends BlockProperties.WithGhost,
    S extends BlockScript<P> & BlockCallbacks<P>
  >(def: BlockDefinition<P, S>): Partial<NodeDefinition> {
    return {
      on_construct: createNodeCallback((position) => {
        game.events.emit(
          new AddGhostEvent(position, minetest.get_node(position), def)
        );
      }),
      on_destruct: createNodeCallback((position) => {
        game.events.emit(
          new RemoveGhostEvent(position, minetest.get_node(position), def)
        );
      }),
    };
  }
}

function registerNode(name: string, nodeDef: NodeDefinition) {
  minetest.register_node(name, nodeDef);
  registeredNodeNames.push(name);
  const id = minetest.get_content_id(name);
  return { name, id };
}

// key: blockpos `{x}:{y}:{z}`
// value: blockpos Vector3
const queuedMapBlockLoads: Map<string, Vector3D> = new Map();

// Batch load events per mapblock to speed things up
// If there's an API to listen for whole mapblock loads that would be way easier
function queueLoadNodeEvent(
  position: Vector3D,
  validBounds: Volume,
  eventBus: EventBus
) {
  const blockPos: Vector3D = vectorFloorDiv(position, 16);
  const key = `${blockPos.x}:${blockPos.y}:${blockPos.z}`;
  if (!queuedMapBlockLoads.has(key)) {
    queuedMapBlockLoads.set(key, blockPos);
    minetest.after(0, flushLoadNodeEvents, validBounds, eventBus);
  }
}

const tempBuffer: number[] = [];

function flushLoadNodeEvents(validBounds: Volume, eventBus: EventBus) {
  queuedMapBlockLoads.forEach((blockPos) => {
    const minp = vector.multiply(blockPos, 16);
    const maxp = vector.add(minp, 15);

    if (!validBounds.intersects(minp, maxp)) return;

    const volume = new Volume(minp, maxp);

    const vm = VoxelManip(minp, maxp);
    const data = vm.get_data(tempBuffer);

    eventBus.emit(new LoadMapChunkEvent(volume, data));
  });

  queuedMapBlockLoads.clear();
}
