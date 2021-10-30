import { BlockTag } from 'common/block/tag';
import { Meta, NodeMeta } from 'common/meta';
import { BlockGfx } from 'server/block/effects';
import { GhostDefinition } from 'server/block/ghost';
import { Entity } from 'server/entity/entity';
import { GameContext } from 'server/game/context';
import { Resource } from 'server/game/resources';
import { throwError } from 'utils/error';
import { Immutable } from 'utils/immutable';
import { Logger } from 'utils/logger';
import { floorDiv, randomInt } from 'utils/math';

// general block reference instance type
export type BlockRef<P extends BlockProperties = BlockProperties> =
  BlockScript<P> & BlockCallbacks<P>;

// extract instance type from definition
export type BlockRefInstance<D extends BlockDefinition> =
  D extends BlockDefinition<any, infer S> ? S : never;

// extract states from properties
export type BlockState<P extends BlockProperties> = string &
  keyof P['nodeDefinition'];

export class BlockDefinition<
  P extends BlockProperties = BlockProperties,
  S extends BlockRef<P> = BlockRef<P>
> {
  constructor(
    readonly name: string,
    readonly properties: P,
    readonly script: BlockScriptConstructor<S>,
    readonly registry: BlockRegistry<P>
  ) {}

  static create<P extends BlockProperties>(
    name: string,
    properties: BlockPropertiesConstructor<
      {} extends BlockCallbacks<P> ? P : never
    >
  ): BlockDefinition<P, BlockRef<P>>;
  static create<P extends BlockProperties, S extends BlockRef<P>>(
    name: string,
    properties: BlockPropertiesConstructor<P>,
    script: BlockScriptConstructor<S>
  ): BlockDefinition<P, S>;
  static create(
    name: string,
    properties: BlockPropertiesConstructor<BlockProperties>,
    script: BlockScriptConstructor<any> = BlockScript
  ): BlockDefinition<BlockProperties, BlockRef<BlockProperties>> {
    // registry will be populated when nodes are registered
    const registry = {
      states: {},
    } as BlockRegistry<BlockProperties>;
    return new BlockDefinition(name, new properties(), script, registry);
  }

  hasGhost(): this is BlockDefinition.WithGhost {
    return this.properties.hasGhost();
  }

  hasDestroy(): this is BlockDefinition.WithDestroy {
    return this.properties.hasDestroy();
  }

  hasTimer(): this is BlockDefinition.WithTimer {
    return this.properties.hasTimer();
  }

  isOperable(): this is BlockDefinition.WithOperate {
    return this.properties.isOperable();
  }

  [Logger.String]() {
    return `BlockDefinition(${this.name})`;
  }
}

export namespace BlockDefinition {
  export type WithGhost = BlockDefinition<
    BlockProperties.WithGhost,
    BlockRef<BlockProperties.WithGhost>
  >;
  export type WithDestroy = BlockDefinition<
    BlockProperties.WithDestroy,
    BlockRef<BlockProperties.WithDestroy>
  >;
  export type WithTimer = BlockDefinition<
    BlockProperties.WithTimer,
    BlockRef<BlockProperties.WithTimer>
  >;
  export type WithOperate = BlockDefinition<
    BlockProperties.WithOperate,
    BlockRef<BlockProperties.WithOperate>
  >;
  export type WithUseScript = BlockDefinition<
    BlockProperties.WithUseScript,
    BlockRef<BlockProperties.WithUseScript>
  >;
}

export namespace BlockProperties {
  export type WithGhost = BlockProperties &
    Required<Pick<BlockProperties, 'ghost' | 'resource'>>;
  export type WithDestroy = BlockProperties & {
    scriptCallbacks: { onDestroy: true };
  };
  export type WithTimer = BlockProperties & {
    scriptCallbacks: { onTimer: true };
  };
  export type WithOperate = BlockProperties & {
    operable: true;
  };
  export type WithUseScript = BlockProperties & {
    useTag: typeof BlockTag.UseScript;
  };

  export type Tags = {
    [T in Exclude<BlockTag.TagName, 'Ghost' | 'BuildStyle'>]?: BlockTag.Code<T>;
  };
}

export type BlockPropertiesConstructor<P extends BlockProperties> = new () => P;
export type AbstractBlockPropertiesConstructor<P extends BlockProperties> =
  abstract new () => P;
export type BlockScriptConstructor<S extends BlockRef> = new (
  ...params: ConstructorParameters<typeof BlockScript>
) => S;
export type AbstractBlockScriptConstructor<S extends BlockRef> = abstract new (
  ...params: ConstructorParameters<typeof BlockScript>
) => S;

export abstract class BlockProperties {
  readonly health: number = Infinity;
  readonly digTime: number = Infinity;
  readonly physics: {
    attachment?: BlockTag.Code<'PhysicsAttachment'>;
    support?: BlockTag.Code<'PhysicsSupport'>;
  } = {};

  /** Resource yielded when dug, and resource used to build */
  readonly resource?: Immutable<Resource>;
  /** Resource yielded when mining */
  readonly miningResource?: Immutable<Resource>;

  readonly tags: BlockProperties.Tags = {};

  readonly scriptCallbacks?: {
    onDestroy?: boolean;
    onTimer?: boolean;
  };

  readonly ghost?: GhostDefinition;

  abstract readonly nodeDefinition: BlockNodeDefinition;

  hasHealth(): boolean {
    return this.health < Infinity;
  }

  hasState<T extends string>(
    stateName: T
  ): this is { nodeDefinition: { [K in T]: NodeDefinition } } {
    return this.nodeDefinition[stateName] != undefined;
  }

  hasGhost(): this is BlockProperties.WithGhost {
    return this.ghost != undefined;
  }

  hasDestroy(): this is BlockProperties.WithDestroy {
    return this.scriptCallbacks?.onDestroy === true;
  }

  hasTimer(): this is BlockProperties.WithTimer {
    return this.scriptCallbacks?.onTimer === true;
  }

  isOperable(): this is BlockProperties.WithOperate {
    return this.tags.Operable === BlockTag.OperableTrue;
  }

  protected defineTags(tags: { [T in BlockTag.TagName]?: BlockTag.Code<T> }): {
    [T in BlockTag.TagName]?: BlockTag.Code<T>;
  } {
    return { ...this.tags, ...tags };
  }

  protected defineCallbacks<T extends BlockProperties['scriptCallbacks']>(
    callbacks: T
  ): T {
    return this.scriptCallbacks
      ? { ...this.scriptCallbacks, ...callbacks }
      : callbacks;
  }

  protected defineNode(defaultDefinition: NodeDefinition) {
    if (this.nodeDefinition) throwError('Existing nodeDefinition!');
    return this.defineNodes({ default: defaultDefinition });
  }

  protected defineNodes<T extends BlockNodeDefinition>(definitions: T): T {
    return this.nodeDefinition
      ? { ...this.nodeDefinition, ...definitions }
      : definitions;
  }
}

export type BlockNodeDefinition = {
  default?: NodeDefinition;
} & {
  [k: string]: NodeDefinition;
};

export type BlockRegistry<P extends BlockProperties> = {
  groups: Record<string, number>;
  states: {
    [K in BlockState<P>]: NodeRegistration;
  };
} & (P extends BlockProperties.WithGhost ? { ghost: NodeRegistration } : {});

type NodeRegistration = {
  id: number;
  name: string;
};

export type BlockCallbacks<Properties> = {} & Callback<
  Properties,
  BlockProperties.WithDestroy,
  { onDestroy(): void }
> &
  Callback<
    Properties,
    BlockProperties.WithUseScript,
    { onUseScript(user: PlayerObject): void }
  > &
  Callback<Properties, BlockProperties.WithTimer, { onTimer(): void }> &
  Callback<
    Properties,
    BlockProperties.WithOperate,
    { startOperation(): void; endOperation(): void }
  >;

type Callback<
  Properties,
  W extends object,
  C extends Record<string, Function>
> = Properties extends W ? C : {};

/**
 * BlockScript handles all block logic. An instance of this class can be created and destroyed
 * regardless of the underlying node's life cycle. The script class is created on-demand and only
 * serve to perform logic based on the node's current state. Internal class state is not persisted.
 */
export class BlockScript<P extends BlockProperties = BlockProperties>
  implements BlockCallbacks<BlockProperties>
{
  static asClass<P extends BlockProperties>() {
    return this as BlockScriptConstructor<BlockScript<P>>;
  }

  readonly properties: P;
  readonly registry: BlockRegistry<P>;

  private _valid = true;

  get valid(): boolean {
    return this._valid;
  }

  constructor(
    readonly definition: BlockDefinition<P, BlockRef<P>>,
    protected readonly context: GameContext,
    readonly position: Readonly<Vector3D>
  ) {
    this.properties = this.definition.properties;
    this.registry = this.definition.registry;
  }

  // Callback order
  // * Newly set node: constructor -> initializeNode -> activate
  // * Existing node: constructor -> activate
  coreActivate(): void {
    this.activate();
  }

  initializeNode(initialState: BlockState<P> = 'default'): void {
    minetest.set_node(this.position, {
      name: this.registry.states[initialState].name,
      param2: this.properties.hasHealth()
        ? BlockScript.healthToParam2(this.properties.health)
        : undefined,
    });
  }

  getData(): NodeMeta {
    this.checkValid();
    // todo: Integrate node metadata directly to BlockScript (allow custom properties per block type)
    return Meta.get(this.position);
  }

  getTimer(): NodeTimerRef {
    this.checkValid();
    return minetest.get_node_timer(this.position);
  }

  getState(): BlockState<P> {
    this.checkValid();

    const node = minetest.get_node(this.position);

    for (const [state, registration] of Object.entries(this.registry.states)) {
      if (registration.name === node.name) return state;
    }

    throwError('Invalid block state!');
  }

  changeState(state: BlockState<P>): void {
    this.checkValid();

    const { name } = this.registry.states[state];
    const { param1, param2 } = minetest.get_node(this.position);
    minetest.swap_node(this.position, { name, param1, param2 });
  }

  damage(amount: number, source?: Entity | Vector3D): void {
    this.checkValid();
    if (!this.properties.hasHealth()) return;
    if (amount <= 0) return;

    const sourcePosition =
      source && ('z' in source ? source : source.objRef.get_pos());

    this.onDamage({
      amount,
      sourceEntity: source && 'objRef' in source ? source : undefined,
      sourcePosition,
      reduce(delta: number): number {
        const old = amount;
        amount = Math.max(0, amount - delta);
        return old - amount;
      },
    });

    amount = Math.floor(amount);
    if (amount === 0) {
      BlockGfx.damageBlockedFx(this.position, sourcePosition);
      return;
    }

    const node = minetest.get_node(this.position);

    let health = BlockScript.param2ToHealth(node.param2);
    health = Math.max(0, health - amount);

    if (health <= 0) {
      BlockGfx.destroyedFx(this.position);
      if (this.hasGhost() && !this.getData().hasDigMark) {
        this.remove();
        minetest.set_node(this.position, { name: this.registry.ghost.name });
      } else {
        this.remove();
      }
      return;
    }

    const param2 = BlockScript.healthToParam2(health);
    minetest.swap_node(this.position, { ...node, param2 });

    BlockGfx.damagedFx(this.position, sourcePosition);
  }

  getHealth(): number {
    this.checkValid();
    if (!this.properties.hasHealth()) return Infinity;

    const { param2 } = minetest.get_node(this.position);
    return BlockScript.param2ToHealth(param2);
  }

  remove(): void {
    this.invalidate();
    minetest.remove_node(this.position);
    this.context.blockPhysics.updateSupported(this.position);
  }

  invalidate(): void {
    this._valid = false;
  }

  private checkValid() {
    if (!this._valid) throwError('BlockRef is no longer valid!');
  }

  protected static healthToParam2(health: number): number {
    // health is lossily compressed to param2
    // param2 [0,252] <-> health [0,500]

    if (health < 0) return 0;
    if (health > 500) return 255;
    if (health < 128) return health;

    const excess = health - 128;
    const low = floorDiv(excess, 3);

    if (excess % 3 === 0) return 128 + low;

    const high = Math.ceil(excess / 3);
    return 128 + randomInt(low, high);
  }

  protected static param2ToHealth(param2: number): number {
    return param2 < 128 ? param2 : 128 + (param2 - 128) * 3;
  }

  // Called when the script is instantiated (the node may already have been existing)
  activate(): void {
    // For override
  }

  onDamage(damage: BlockDamage): void {
    // For override
  }

  hasGhost(): this is BlockRef<BlockProperties.WithGhost> {
    return this.properties.hasGhost();
  }

  hasDestroy(): this is BlockRef<BlockProperties.WithDestroy> {
    return this.properties.hasDestroy();
  }

  hasTimer(): this is BlockRef<BlockProperties.WithTimer> {
    return this.properties.hasTimer();
  }

  isOperable(): this is BlockRef<BlockProperties.WithOperate> {
    return this.properties.isOperable();
  }

  [Logger.String]() {
    return `${this.constructor.name}(${this.position.x},${this.position.y},${this.position.z})`;
  }
}

export type BlockDamage = {
  readonly amount: number;
  readonly sourceEntity?: Entity;
  readonly sourcePosition?: Vector3D;
  reduce(delta: number): number;
};
