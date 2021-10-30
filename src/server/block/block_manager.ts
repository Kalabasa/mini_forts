import { BlockDefinition, BlockRef } from 'server/block/block';
import { GameContext } from 'server/game/context';
import { throwError } from 'utils/error';
import { WeakValueMap } from 'utils/weak_ref';

export class BlockManager {
  private context: GameContext;

  private readonly nameToDef: Partial<Record<string, BlockDefinition>> = {};
  private readonly nodeNameToDef: Partial<Record<string, BlockDefinition>> = {};
  private readonly nodeIDToDef: Partial<Record<number, BlockDefinition>> = {};

  private readonly refCache = new WeakValueMap<string, BlockRef>();

  setContext(value: GameContext): void {
    this.context = value;
  }

  addDefinition(definition: BlockDefinition): void {
    this.nameToDef[definition.name] = definition;

    for (const reg of Object.values(definition.registry.states)) {
      this.nodeNameToDef[reg.name] = definition;
      this.nodeIDToDef[reg.id] = definition;
    }

    if (definition.hasGhost()) {
      this.nodeNameToDef[definition.registry.ghost.name] = definition;
      this.nodeIDToDef[definition.registry.ghost.id] = definition;
    }
  }

  createRef<T extends BlockRef = BlockRef>(
    def: BlockDefinition<any, T>,
    position: Vector3D
  ): T {
    const script = new def.script(def, this.context, position);
    this.refCache.set(posKey(position), script);
    return script;
  }

  // returns undefined iff not real node
  // use type parameter to assert real node and block type
  getRef<T extends BlockRef | undefined = BlockRef | undefined>(
    position: Vector3D
  ): T {
    const key = posKey(position);
    const ref = this.refCache.get(key);

    if (ref && ref.valid) return ref as T;

    const node = minetest.get_node(position);
    const def = this.nodeNameToDef[node.name];
    if (!def || (def.hasGhost() && def.registry.ghost.name === node.name)) {
      return undefined!;
    }

    const newRef = this.createRef(
      def as BlockDefinition<any, NonNullable<T>>,
      position
    );
    newRef.coreActivate();

    return newRef;
  }

  getDef(
    position: Vector3D,
    includeGhosts: boolean = false
  ): BlockDefinition | undefined {
    let node;
    let def;

    if (!includeGhosts) {
      node = minetest.get_node(position);
      def = this.nodeNameToDef[node.name];
      if (def && def.hasGhost() && def.registry.ghost.name === node.name) {
        return undefined;
      }
    }

    const key = posKey(position);
    const ref = this.refCache.get(key);
    if (ref) return ref.definition;

    node = node ?? minetest.get_node(position);
    def = def ?? this.nodeNameToDef[node.name];
    return def;
  }

  getDefByName(name: string): BlockDefinition | undefined {
    return this.nameToDef[name];
  }

  getDefByNodeName(
    name: string,
    includeGhosts: boolean = false
  ): BlockDefinition | undefined {
    const def = this.nodeNameToDef[name];
    if (
      !def ||
      (!includeGhosts && def.hasGhost() && def.registry.ghost.name === name)
    ) {
      return undefined;
    }
    return def;
  }

  getDefByNodeID(id: number): BlockDefinition | undefined {
    return this.nodeIDToDef[id];
  }
}

function posKey(pos: Vector3D) {
  return `${pos.x}:${pos.y}:${pos.z}`;
}
