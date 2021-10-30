// Forked from Istar-Eldritch/minetest-types
// https://github.com/Istar-Eldritch/minetest_types/

declare global {
  function dump(obj: any, indent?: number): string;

  function dump2(obj: any): string;

  enum EmergeAreaAction {
    EMERGE_CANCELLED,
    EMERGE_ERRORED,
    EMERGE_FROM_MEMORY,
    EMERGE_FROM_DISK,
    EMERGE_GENERATED,
  }

  namespace minetest {
    const CONTENT_UNKNOWN: number;
    const CONTENT_AIR: number;
    const CONTENT_IGNORE: number;
    const EMERGE_CANCELLED: EmergeAreaAction;
    const EMERGE_ERRORED: EmergeAreaAction;
    const EMERGE_FROM_MEMORY: EmergeAreaAction;
    const EMERGE_FROM_DISK: EmergeAreaAction;
    const EMERGE_GENERATED: EmergeAreaAction;
    const registered_items: {
      [name: string]: Required<ItemDefinition>;
    };
    const registered_nodes: {
      [name: string]: Required<NodeDefinition>;
    };
    const registered_tools: {
      [name: string]: Required<ItemDefinition>;
    };
    const registered_entities: {
      [name: string]: Required<LuaEntityProperties>;
    };
    const luaentities: {
      [I in any]: LuaEntity;
    };
    const settings: Settings;
    function add_entity(
      pos: Vector3D,
      name: string,
      staticdata?: string
    ): ObjectRef | undefined;
    function add_item(pos: Vector3D, item: Item): ObjectRef | undefined;
    function add_node_level(pos: Vector3D, level: number): void;
    function add_particle(particle_definition: ParticleDefinition): void;
    function add_particlespawner(
      particlespawner_definition: ParticleSpawnerDefinition
    ): void;
    function after<T extends Array<any>>(
      time: number,
      func: (...param: T) => void,
      ...param: T
    ): void;
    function auth_reload(): void;
    function ban_player(name: string): void;
    function chat_send_all(text: string): void;
    function chat_send_player(name: string, message: string): void;
    function check_for_falling(pos: Vector3D): void;
    function check_player_privs(
      name: string,
      privs: { [k: string]: boolean }
    ): [boolean, [string]];
    function clear_craft(recipe: string): void;
    function clear_objects(options?: { mode: 'full' | 'quick' }): void;
    function clear_registered_biomes(): void;
    function clear_registered_decorations(): void;
    function clear_registered_ores(): void;
    function clear_registered_schematics(...args: any[]): any;
    function colorize(color: string, text: string): string;
    function compress(
      data: any,
      method?: 'deflate',
      ...compresion_opts: any[]
    ): string;
    function create_detached_inventory(
      name: string,
      options: {
        allow_move?: (
          inv: InvRef,
          from_list: string,
          from_index: number,
          to_list: string,
          to_index: number,
          count: number,
          player: PlayerObject
        ) => number;
        allow_put?: (
          inv: InvRef,
          listname: string,
          index: number,
          stack: ItemStack,
          player: PlayerObject
        ) => number;
        allow_take?: (
          inv: InvRef,
          listname: string,
          index: number,
          stack: ItemStack,
          player: PlayerObject
        ) => number;
        on_move?: (
          inv: InvRef,
          from_list: string,
          from_index: number,
          to_list: string,
          count: number,
          player: PlayerObject
        ) => void;
        on_put?: (
          inv: InvRef,
          listname: string,
          index: number,
          stack: ItemStack,
          player: PlayerObject
        ) => void;
        on_take?: (
          inv: InvRef,
          listname: string,
          index: number,
          stack: ItemStack,
          player: PlayerObject
        ) => void;
      }
    ): InvRef;
    function create_schematic(...args: any[]): any;
    function debug(...args: any[]): void;
    function decode_base64(text: string): string;
    function decompress(data: string, method?: string): string;
    function delete_area(pos1: Vector3D, pos2: Vector3D): void;
    function delete_particlespawner(id: string, player_name: string): void;
    function deserialize<T>(str: string): T | undefined;
    function dig_node(pos: Vector3D): void;
    function dir_to_facedir(...args: any[]): any;
    function dir_to_wallmounted(...args: any[]): any;
    function do_item_eat(...args: any[]): any;
    function emerge_area(
      pos1: Vector3D,
      post2: Vector3D,
      callback?: (
        blockpos: Vector3D,
        action: EmergeAreaAction,
        calls_remaining: number
      ) => void
    ): void;
    function encode_base64(input: string): string;
    function explode_scrollbar_event(...args: any[]): any;
    function explode_table_event(...args: any[]): any;
    function explode_textlist_event(...args: any[]): any;
    function facedir_to_dir(...args: any[]): any;
    function find_node_near(...args: any[]): any;
    function find_nodes_in_area(
      pos1: Vector3D,
      pos2: Vector3D,
      nodenames: string | string[],
      grouped: true
    ): { [nodename: string]: Vector3D[] };
    function find_nodes_in_area(
      pos1: Vector3D,
      pos2: Vector3D,
      nodenames: string | string[],
      grouped?: false
    ): LuaMultiReturn<[Vector3D[], { [nodename: string]: number }]>;
    function find_nodes_with_meta(pos1: Vector3D, pos2: Vector3D): Vector3D[];
    function find_path(...args: any[]): any;
    function forceload_block(pos: Vector3D, transient?: boolean): boolean;
    function forceload_free_block(pos: Vector3D, transient?: boolean): void;
    function formspec_escape(...args: any[]): any;
    function get_all_craft_recipes(...args: any[]): any;
    function get_ban_description(...args: any[]): any;
    function get_ban_list(...args: any[]): any;
    function get_connected_players(...args: any[]): any;
    function get_content_id(name: string): number;
    function get_craft_recipe(...args: any[]): any;
    function get_craft_result(...args: any[]): any;
    function get_current_modname(...args: any[]): any;
    function get_day_count(...args: any[]): any;
    function get_dig_params(...args: any[]): any;
    function get_gametime(): number;
    function get_heat(...args: any[]): any;
    function get_humidity(...args: any[]): any;
    function get_inventory(...args: any[]): any;
    function get_item_group(...args: any[]): any;
    function get_mapgen_object(
      objectname: 'voxelmanip'
    ): LuaMultiReturn<[VoxelManip, Vector3D, Vector3D]>;
    function get_mapgen_object(objectname: string): unknown;
    function get_meta(pos: Vector3D): NodeMetaRef;
    function get_mod_storage(): StorageDef;
    function get_modnames(...args: any[]): any;
    function get_modpath(...args: any[]): any;
    function get_name_from_content_id(content_id: number): string;
    function get_node(pos: Vector3D): Node;
    function get_node_drops(...args: any[]): any;
    function get_node_group(...args: any[]): any;
    function get_node_level(...args: any[]): any;
    function get_node_light(...args: any[]): any;
    function get_node_max_level(...args: any[]): any;
    function get_node_or_nil(pos: Vector3D): Node | undefined;
    function get_node_timer(position: Vector3D): NodeTimerRef;
    function get_objects_inside_radius(
      pos: Vector3D,
      radius: number
    ): ObjectRef[];
    function get_objects_in_area(pos1: Vector3D, pos2: Vector3D): ObjectRef[];
    function get_password_hash(...args: any[]): any;
    function get_perlin(...args: any[]): any;
    function get_perlin_map<T extends Vector2D | Vector3D>(
      noiseparams: NoiseParams,
      size: T
    ): T extends Vector3D ? PerlinNoiseMap3D : PerlinNoiseMap2D;
    function get_player_by_name(name: string): PlayerObject;
    function get_player_information(...args: any[]): any;
    function get_player_ip(...args: any[]): any;
    function get_player_privs(...args: any[]): any;
    function get_player_radius_area(...args: any[]): any;
    function get_pointed_thing_position(...args: any[]): any;
    function get_position_from_hash(...args: any[]): any;
    function get_server_status(...args: any[]): any;
    function get_server_uptime(...args: any[]): any;
    function get_timeofday(...args: any[]): any;
    function get_us_time(): number;
    function get_voxel_manip(p1: Vector3D, p2: Vector3D): VoxelManip;
    function get_worldpath(...args: any[]): any;
    function global_exists(...args: any[]): any;
    function handle_node_drops(...args: any[]): any;
    function has_feature(...args: any[]): any;
    function hash_node_position(...args: any[]): any;
    function hud_replace_builtin(...args: any[]): any;
    function inventorycube(top: string, left: string, right: string): any;
    function is_protected(...args: any[]): any;
    function is_singleplayer(...args: any[]): any;
    function is_yes(...args: any[]): any;
    function item_drop(...args: any[]): any;
    function item_eat(...args: any[]): any;
    function item_place(...args: any[]): any;
    function item_place_node(...args: any[]): any;
    function item_place_object(...args: any[]): any;
    function kick_player(...args: any[]): any;
    function line_of_sight(...args: any[]): any;
    function log(text: string): void;
    function log(
      level: 'none' | 'error' | 'warning' | 'action' | 'info' | 'verbose',
      text: string
    ): void;
    function node_dig(...args: any[]): any;
    function node_punch(...args: any[]): any;
    function notify_authentication_modified(...args: any[]): any;
    function override_item(
      name: string,
      redefinition: Partial<ItemDefinition>
    ): any;
    function parse_json<T>(string: string, nullvalue?: any): T;
    function place_node(pos: Vector3D, node: { name: string }): void;
    function place_schematic(...args: any[]): any;
    function place_schematic_on_vmanip(...args: any[]): any;
    function player_exists(...args: any[]): any;
    function pos_to_string(...args: any[]): any;
    function privs_to_string(...args: any[]): any;
    function punch_node(...args: any[]): any;
    function raillike_group(...args: any[]): any;
    function record_protection_violation(...args: any[]): any;
    function register_abm(...args: any[]): any;
    function register_alias(...args: any[]): any;
    function register_authentication_handler(...args: any[]): any;
    function register_biome(...args: any[]): any;
    function register_chatcommand(
      cmd: string,
      chatcommand_definition: ChatCommandDefinition
    ): any;
    function register_craft(...args: any[]): any;
    function register_craft_predict(...args: any[]): any;
    function register_craftitem(...args: any[]): any;
    function register_decoration(...args: any[]): any;
    function register_entity<T>(
      name: string,
      entity_definition: LuaEntityProperties<T>
    ): void;
    function register_globalstep(callback: (dtime: number) => void): any;
    function register_lbm(lbm_definition: LoadingBlockModifier): any;
    function register_node(name: string, definition: NodeDefinition): void;
    function register_on_chat_message(
      callback: (name: string, message: string) => void
    ): void;
    function register_on_cheat(...args: any[]): any;
    function register_on_craft(...args: any[]): any;
    function register_on_dieplayer(
      callback: (objref: PlayerObject, reason: object) => void
    ): any;
    function register_on_dignode(
      callback: (
        pos: Vector3D,
        oldnode: Node,
        digger: ObjectRef | undefined
      ) => void
    ): any;
    function register_on_generated(
      callback: (minp: Vector3D, maxp: Vector3D, blockseed: any) => void
    ): void;
    function register_on_hpchange(...args: any[]): any;
    function register_on_item_eat(...args: any[]): any;
    function register_on_joinplayer(
      callback: (objref: PlayerObject, last_login: number | undefined) => void
    ): any;
    function register_on_leaveplayer(
      callback: (objref: PlayerObject, timed_out: boolean) => void
    ): any;
    function register_on_mapgen_init(...args: any[]): any;
    function register_on_newplayer(...args: any[]): any;
    function register_on_placenode(
      callback: (
        pos: Vector3D,
        newnode: Node,
        placer: ObjectRef | undefined,
        oldnode: Node,
        itemstack: ItemStack,
        poitned_thing: PointedNode
      ) => boolean | void
    ): void;
    function register_on_player_receive_fields(
      fn: (
        player: PlayerObject,
        formname: string,
        fields: Record<string, string | undefined>
      ) => boolean
    ): any;
    function register_on_prejoinplayer(...args: any[]): any;
    function register_on_protection_violation(...args: any[]): any;
    function register_on_punchnode(
      callback: (
        pos: Vector3D,
        node: Node,
        puncher: PlayerObject,
        pointed_thing: PointedNode
      ) => void
    ): void;
    function register_on_respawnplayer(
      callback: (objref: PlayerObject) => boolean | void
    ): void;
    function register_on_mods_loaded(callback: () => void): void;
    function register_on_shutdown(callback: () => void): void;
    function register_ore(...args: any[]): any;
    function register_privilege(...args: any[]): any;
    function register_tool(name: string, item_definition: ItemDefinition): any;
    function remove_node(pos: Vector3D): void;
    function request_shutdown(...args: any[]): any;
    function rollback_get_last_node_actor(...args: any[]): any;
    function rollback_get_node_actions(...args: any[]): any;
    function rollback_revert_actions_by(...args: any[]): any;
    function rotate_and_place(...args: any[]): any;
    function rotate_node(...args: any[]): any;
    function serialize(table: object): string;
    function set_gen_notify(...args: any[]): any;
    function set_last_run_mod(...args: any[]): any;
    function set_mapgen_params(...args: any[]): any;
    function set_node(
      pos: Vector3D,
      node: { name: string; param1?: number; param2?: number }
    ): any;
    function set_node_level(...args: any[]): any;
    function set_noiseparam_defaults(...args: any[]): any;
    function set_player_password(...args: any[]): any;
    function set_player_privs(
      name: string,
      privs: { [k: string]: boolean }
    ): any;
    function set_timeofday(val: number): void;
    function show_formspec(
      playername: string,
      formname: string,
      formspec: string
    ): void;
    function sound_play(
      spec: SimpleSoundSpec,
      parameters: SoundParameters,
      ephemeral?: boolean
    ): any;
    function sound_stop(...args: any[]): any;
    function spawn_item(...args: any[]): any;
    function spawn_tree(...args: any[]): any;
    function splittext(...args: any[]): any;
    function string_to_pos(...args: any[]): any;
    function string_to_privs(...args: any[]): any;
    function swap_node(
      pos: Vector3D,
      node: { name: string; param1?: number; param2?: number }
    ): any;
    function transforming_liquid_add(...args: any[]): any;
    function unban_player_or_ip(...args: any[]): any;
    function unregister_biome(...args: any[]): any;
    function unregister_item(...args: any[]): any;
    function write_json(data: object, styled?: boolean): string;
    function mod_channel_join(channel_name: string): ModChannel;
    function register_on_modchannel_message(
      fn: (channel_name: string, sender: string, message: string) => void
    ): void;
  }

  export interface ModChannel {
    leave(): void;
    is_writeable(): boolean;
    send_all(message: String);
  }

  export interface PlayerObject extends ObjectRef {
    get_player_name(): string;
    get_player_control(): Record<
      | 'up'
      | 'down'
      | 'left'
      | 'right'
      | 'jump'
      | 'aux1'
      | 'sneak'
      | 'dig'
      | 'place'
      | 'zoom',
      boolean
    >;
    get_player_control_bits(): number;
    get_eye_offset(): LuaMultiReturn<[Vector3D, Vector3D]>;
    get_look_dir(): Vector3D;
    set_physics_override(override_table: {
      speed?: number;
      jump?: number;
      gravity?: number;
      sneak?: boolean;
      sneak_glitch?: boolean;
      new_move?: boolean;
    }): void;
    hud_set_flags(flags: {
      hotbar?: boolean;
      healthbar?: boolean;
      crosshair?: boolean;
      wielditem?: boolean;
      breathbar?: boolean;
      minimap?: boolean;
      minimap_radar?: boolean;
    }): void;
    hud_set_hotbar_itemcount(count: number): void;
    hud_add(hud_definition: HudDefinition): number;
    hud_remove(id: number): void;
    hud_change(
      id: number,
      stat: 'position',
      value: TextHudDefinition['position']
    ): void;
    hud_change(id: number, stat: 'name', value: HudDefinition['name']): void;
    hud_change(
      id: number,
      stat: 'scale',
      value: Partial<TextHudDefinition['scale']>
    ): void;
    hud_change(
      id: number,
      stat: 'text',
      value: TextHudDefinition['text']
    ): void;
    hud_change(
      id: number,
      stat: 'number',
      value: TextHudDefinition['number']
    ): void;
    hud_change(
      id: number,
      stat: 'item',
      value: InventoryHudDefinition['item']
    ): void;
    hud_change(
      id: number,
      stat: 'dir',
      value: StatbarHudDefinition['direction']
    ): void;
    hud_change(
      id: number,
      stat: 'world_pos',
      value: WaypointHudDefinition['world_pos']
    ): void;
    set_inventory_formspec(formspec: string): void;
    set_clouds(cloud_parameters: {
      density?: number;
      color?: ColorSpec;
      ambient?: ColorSpec;
      height?: number;
      thickness?: number;
      speed?: Vector2D;
    }): void;
    set_sky(sky_parameters: {
      base_color?: ColorSpec;
      type?: 'plain';
      clouds?: boolean;
    }): void;
    set_sun(sun_parameters: { sunrise_visible?: boolean }): void;
  }

  export type HudDefinition = {
    name: string;
    alignment: Vector2D;
    offset: Vector2D;
    z_index?: number;
  } & (
    | ImageHudDefinition
    | TextHudDefinition
    | StatbarHudDefinition
    | InventoryHudDefinition
    | WaypointHudDefinition
    | ImageWaypointHudDefinition
  );
  type ImageHudDefinition = {
    hud_elem_type: 'image';
    position: Vector2D;
    scale: { x: number; y: number };
    text: string;
  };
  type TextHudDefinition = {
    hud_elem_type: 'text';
    position: Vector2D;
    scale: Vector2D;
    text: string;
    /** RGB color */
    number: number;
    size: { x: number };
  };
  type StatbarHudDefinition = {
    hud_elem_type: 'statbar';
    position: Vector2D;
    direction: 0 | 1 | 2 | 3;
    /** texture */
    text: string;
    /** BG texture */
    text2?: string;
    /** current amount */
    number: number;
    /** total amount */
    item: number;
    size: Vector2D;
  };
  type InventoryHudDefinition = {
    hud_elem_type: 'inventory';
    position: Vector2D;
    direction: 0 | 1 | 2 | 3;
    /** inventory list name */
    text: string;
    number: number;
    /** selected position */
    item: number;
  };
  type WaypointHudDefinition = {
    hud_elem_type: 'waypoint';
    /** suffix */
    text?: string;
    precision?: number;
    /** color */
    number: number;
    world_pos: Vector3D;
  };
  type ImageWaypointHudDefinition = {
    hud_elem_type: 'image_waypoint';
    scale: { x: number };
    /** texture */
    text: string;
    world_pos: Vector3D;
  };

  /** @noSelf */
  export interface NodeDefinition {
    drawtype: DrawType;
    visual_scale?: number;
    tiles:
      | [TileDefinition]
      | [TileDefinition, TileDefinition]
      | [
          TileDefinition,
          TileDefinition,
          TileDefinition,
          TileDefinition,
          TileDefinition,
          TileDefinition
        ];
    special_tiles?: string[];
    use_texture_alpha?: 'opaque' | 'clip' | 'blend';
    alpha?: number;
    post_effect_color?: ColorSpec;
    inventory_image?: string | [string, string, string];
    wield_image?: string | [string, string, string];
    paramtype?: 'none' | 'light';
    paramtype2?: 'none';
    is_ground_content?: boolean;
    sunlight_propagates?: boolean;
    walkable?: boolean;
    pointable?: boolean;
    diggable?: boolean;
    climbable?: boolean;
    buildable_to?: boolean;
    groups?: { [k: string]: number };
    drop?: Item | Item[] | { max_items: number; items: DropDefinition[] };
    stack_max?: number;
    liquidtype?: 'none' | 'source' | 'flowing';
    liquid_alternative_flowing?: any;
    liquid_alternative_source?: any;
    liquid_viscosity?: number;
    liquid_renewable?: boolean;
    light_source?: number;
    damage_per_second?: number;
    node_box?: NodeBox;
    selection_box?: NodeBox;
    collision_box?: NodeBox;
    sounds?: {
      footstep?: SimpleSoundSpec;
      dig?: SimpleSoundSpec;
      dug?: SimpleSoundSpec;
    };
    on_construct?: (pos: Vector3D) => void;
    on_destruct?: (pos: Vector3D) => void;
    after_destruct?: (pos: Vector3D, oldnode: Node) => void;
    on_place?: (
      item: ItemStack,
      placer: ObjectRef,
      pos: Vector3D,
      pointedthing: PointedNode
    ) => void;
    on_drop?: (item: ItemStack, dropper: ObjectRef, pos: Vector3D) => void;
    on_use?: (
      item: ItemStack,
      player: ObjectRef,
      pointedthing: PointedNode
    ) => void;
    on_punch?: (
      item: ItemStack,
      node: Node,
      player: ObjectRef,
      pointedthing: PointedNode
    ) => void;
    on_dig?: (pos: Vector3D, node: Node, player: ObjectRef) => void;
    on_timer?: (pos: Vector3D, elapsed: number) => void;
    on_receive_fields?: (
      pos: Vector3D,
      formname: any,
      fields: { [k: string]: any },
      sender: PlayerObject
    ) => void;
    allow_metadata_inventory_move?: (
      pos: Vector3D,
      from_list: string,
      from_index: number,
      to_list: string,
      to_index: number,
      count: number,
      player: PlayerObject
    ) => void;
    allow_metadata_inventory_put?: (
      pos: Vector3D,
      listname: string,
      index: number,
      stack: ItemStack,
      player: PlayerObject
    ) => void;
    allow_metadta_inventory_take?: (
      pos: Vector3D,
      listname: string,
      index: number,
      stack: ItemStack,
      player: PlayerObject
    ) => void;
    on_metadata_inventory_move?: (
      pos: Vector3D,
      from_list: string,
      from_index: number,
      to_list: string,
      to_index: number,
      count: number,
      player: PlayerObject
    ) => void;
    on_metadata_inventory_put?: (
      pos: Vector3D,
      listname: string,
      index: number,
      stack: ItemStack,
      player: PlayerObject
    ) => void;
    on_metadta_inventory_take?: (
      pos: Vector3D,
      listname: string,
      index: number,
      stack: ItemStack,
      player: PlayerObject
    ) => void;

    after_place_node?: (
      pos: Vector3D,
      placer: ObjectRef | undefined,
      itemstack: ItemStack,
      pointed_thing: PointedNode
    ) => boolean | void;
    can_dig?: (pos: Vector3D, player: PlayerObject) => void;
    after_dig_node?: (
      pos: Vector3D,
      oldnode: Node,
      old_meta: MetaDataRef,
      digger: ObjectRef
    ) => void;
    on_rightclick?: (
      pos: Vector3D,
      node: Node,
      player: PlayerObject,
      stack: ItemStack,
      pointed: PointedNode
    ) => void;

    on_blast?: (pos: Vector3D, intensity?: number) => void;
  }

  /** @noSelf */
  export interface ItemDefinition {
    name: string;
    description?: string;
    short_description?: string;
    wield_image?: string;
    inventory_image?: string | [string, string, string];
    groups?: { [k: string]: number };
    tool_capabilities?: any; //idc
    range?: number;
    node_placement_prediction?: string;
    on_place?: (
      itemstack: ItemStack,
      placer: ObjectRef | undefined,
      pointed_thing: PointedNode
    ) => ItemStack | void;
    on_use?: (
      itemstack: ItemStack,
      user: ObjectRef | undefined,
      pointed_thing: PointedThing
    ) => ItemStack | void;
    after_use?: (
      itemstack: ItemStack,
      user: ObjectRef | undefined,
      node: Node,
      digparams: any
    ) => ItemStack | void;
    on_drop?: (
      itemstack: ItemStack,
      dropper: ObjectRef | undefined,
      pos: Vector3D
    ) => ItemStack | void;
  }

  export type TileDefinition =
    | string
    | {
        name: string;
        animation: TileAnimationDefinition;
      }
    | {
        name: string;
        backface_culling: boolean;
        align_style: 'node' | 'world' | 'user';
        scale: number;
      };

  export type CollisionInfo = {
    touching_ground: boolean;
    collides: boolean;
    standing_on_object: boolean;
    collisions: Collision[];
  };
  export type Collision = {
    axis: 'x' | 'y' | 'z';
    old_velocity: Vector3D;
    new_velocity: Vector3D;
  } & (
    | {
        type: 'node';
        node_pos: Vector3D;
      }
    | {
        type: 'object';
        object: ObjectRef;
      }
  );

  /** @noSelf */
  export interface ObjectProperties {
    eye_height?: number;
    physical?: boolean;
    collide_with_objects?: boolean;
    collisionbox?: [number, number, number, number, number, number];
    selectionbox?: [number, number, number, number, number, number];
    pointable?: boolean;
    visual?:
      | 'cube'
      | 'sprite'
      | 'upright_sprite'
      | 'mesh'
      | 'wielditem'
      | 'item';
    visual_size?: Vector3D;
    mesh?: string;
    textures?:
      | string
      | [string]
      | [string, string]
      | [string, string, string, string, string, string];
    use_texture_alpha?: boolean;
    spritediv?: Vector2D;
    initial_sprite_basepos?: Vector2D;
    is_visible?: boolean;
    makes_footstep_sound?: boolean;
    automatic_rotate?: number;
    stepheight?: number;
    automatic_face_movement_dir?: number;
    automatic_face_movement_max_rotation_per_sec?: number;
    backface_culling?: boolean;
    glow?: number;
    nametag?: string;
    nametag_color?: ColorSpec;
    nametag_bgcolor?: ColorSpec;
    infotext?: string;
    static_save?: boolean;
    damage_texture_modifier?: string;
    shaded?: boolean;
    show_on_minimap?: boolean;
  }

  export interface Node {
    name: string;
    param1: number;
    param2: number;
  }

  export type PointedThing = PointedObject | PointedNothing | PointedNode;

  export interface PointedObject {
    type: 'object';
    ref: ObjectRef;
  }

  export interface PointedNothing {
    type: 'nothing';
  }

  export interface PointedNode {
    type: 'node';
    under: Vector3D;
    above: Vector3D;
  }

  type RaycastPointedThing = {
    intersection_point: Vector3D;
    intersection_normal: Vector3D;
  };

  export interface DropDefinition {
    items: Item[];
    rarity: number;
    tools: string[];
  }

  export type NodeBox = NodeBoxRegular | NodeBoxFixed | NodeBoxConnected;

  export type NodeBoxRegular = {
    type: 'regular';
  };

  export type NodeBoxFixed = {
    type: 'fixed';
    fixed: Box | Box[];
  };

  export type NodeBoxConnected = {
    type: 'connected';
    fixed: Box | Box[];
    connect_top: Box | Box[];
    connect_bottom: Box | Box[];
    connect_front: Box | Box[];
    connect_left: Box | Box[];
    connect_right: Box | Box[];
    connect_back: Box | Box[];
  };

  export type Box = [number, number, number, number, number, number];

  export type DrawType =
    | 'normal'
    | 'airlike'
    | 'allfaces'
    | 'allfaces_optional'
    | 'glasslike'
    | 'glasslike_framed'
    | 'glasslike_framed_optional'
    | 'liquid'
    | 'flowingliquied'
    | 'torchlike'
    | 'signlike'
    | 'plantlike'
    | 'raillike'
    | 'fencelike'
    | 'firelike'
    | 'nodebox'
    | 'mesh';

  /** @noSelf */
  export type LuaEntityProperties<T = {}> = T & {
    initial_properties?: ObjectProperties;
    on_activate?: (
      this: LuaEntity<T>,
      staticdata: string,
      dtime_s: number
    ) => void;
    on_deactivate?: (this: LuaEntity<T>) => void;
    on_step?: (
      this: LuaEntity<T>,
      dtime: number,
      moveresult: CollisionInfo
    ) => void;
    on_punch?: (
      this: LuaEntity<T>,
      puncher: ObjectRef | undefined,
      time_from_last_punch: number | undefined,
      tool_capabilities: object | undefined,
      dir: Vector3D | undefined
    ) => void;
    on_rightclick?: (this: LuaEntity<T>, clicker: ObjectRef) => void;
    on_attach_child?: (this: LuaEntity<T>, child: ObjectRef) => void;
    on_detach_child?: (this: LuaEntity<T>, child: ObjectRef) => void;
    on_detach?: (this: LuaEntity<T>, parent: ObjectRef | undefined) => void;
    get_staticdata?: (this: LuaEntity<T>) => void;
  };

  export type LuaEntity<T = {}> = LuaEntityProperties<T> & {
    name: string;
    object: LuaEntitySAO<T>;
  };

  export type LuaEntitySAO<T = {}> = ObjectRef & {
    remove(): void;
    set_acceleration(acc: Vector3D): void;
    get_acceleration(): Vector3D;
    set_velocity(vel: Vector3D): void;
    get_velocity(): Vector3D;
    set_rotation(rot: Vector3D): void;
    get_rotation(): Vector3D;
    set_yaw(yaw: number): void;
    get_yaw(): number;
    get_luaentity(): LuaEntity<T>;
    set_sprite(
      start_frame?: Vector2D,
      num_frames?: number,
      framelength?: number,
      select_x_by_camera?: boolean
    ): void;
    set_texture_mod(mod: string): void;
    get_texture_mod(): string;
  };

  export interface Vector3D {
    x: number;
    y: number;
    z: number;
  }

  export interface Vector2D {
    x: number;
    y: number;
  }

  export type ColorSpec =
    | number
    | string
    | {
        a?: number;
        r: number;
        g: number;
        b: number;
      };

  export type SimpleSoundSpec =
    | string
    | {
        name: string;
        gain?: number;
        pitch?: number;
      };

  export type SoundParameters = {
    gain?: number;
    fade?: number;
    pitch?: number;
    to_player?: string;
    loop?: boolean;
    pos?: Vector3D;
    max_hear_distance?: number;
    object?: ObjectRef;
    exclude_player?: string;
  };

  export interface ObjectRef {
    get_pos(): Vector3D;
    get_armor_groups(): { [k: string]: any };
    get_animation(): {
      frames: Vector2D;
      frame_speed: number;
      frame_blend: number;
      frame_loop: boolean;
    };
    get_hp(): number;
    get_breath(): number;
    get_inventory(): InvRef;
    get_wielded_item(): ItemStack;
    get_wield_index(): number;
    get_wield_list(): string;
    move_to(pos: Vector3D, continuous?: boolean): void;
    punch(
      puncher: ObjectRef,
      time_from_last_punch: number,
      direction?: Vector3D
    ): void;
    right_click(clicker: ObjectRef): void;
    set_pos(pos: Vector3D): void;
    set_armor_groups(groups: { [k: string]: any }): void;
    set_hp(hitpoints: number): void;
    set_wielded_item(item: Item): boolean;
    set_animation(
      frame_range: Vector2D,
      frame_speed?: number,
      frame_blend?: number,
      frame_loop?: boolean
    ): void;
    set_attach(
      parent: ObjectRef,
      bone?: string,
      position?: Vector3D,
      rotation?: Vector3D
    ): void;
    set_detach(): void;
    get_attach(): {
      parent: ObjectRef;
      bone: string;
      position: Vector3D;
      rotation: any;
    };
    set_bone_position(bone?: '', v1?: Vector3D, v2?: Vector3D): void;
    set_properties(object_property_table: ObjectProperties): void;
    get_properties(): Required<ObjectProperties>;
    is_player(): this is PlayerObject;
    get_nametag_attributes(): {
      text: string;
      color: { a: number; r: number; g: number; b: number };
      bgcolor: { a: number; r: number; g: number; b: number };
    };
    set_nametag_attributes(attributes: {
      text: string;
      color: ColorSpec;
      bgcolor?: ColorSpec | false;
    });
  }

  export interface InvRef {
    is_empty(listname: string): boolean;
    get_size(listname: string): number;
    set_size(listname: string, size: number): void;
    get_width(listname: string): number;
    set_width(listname: string, width: number): void;
    get_stack(listname: string, index: number): ItemStack;
    set_stack(listname: string, index: number, stack: Item): void;
    get_list(listname: string): ItemStack[];
    set_list(listname: string, list: Item[]): void;
    get_lists(): { [k: string]: ItemStack[] };
    set_lists(lists: { [k: string]: Item[] }): void;
    add_item(listname: string, stack: Item): ItemStack;
    room_for_item(listname: string, stack: Item): boolean;
    contains_item(listname: string, stack: Item): boolean;
    remove_item(listname: string, stack: Item): ItemStack;
  }

  export type Item = ItemStack | ItemTable | string;

  export interface ItemStack {
    add_item(item: Item): void;
    add_wear(amount: number): void;
    clear(): void;
    get_count(): number;
    set_count(count: number): boolean;
    get_definition(): ItemDefinition;
    get_free_space(): number;
    get_meta(): MetaDataRef;
    get_metadata(): string;
    get_name(): string;
    set_name(name: string): boolean;
    get_stack_max(): number;
    get_tool_capabilities(): any;
    get_wear(): number;
    set_wear(wear: number): boolean;
    is_empty(): boolean;
    is_known(): boolean;
    item_fits(item: Item): boolean;
    peek_item(n?: number): ItemStack;
    replace(item: Item | string): void;
    take_item(n?: number): ItemStack;
    to_string(): string;
    to_table(): any;
  }

  export interface ItemTable {
    name: string;
    count: number;
    wear: number;
    metadata: string;
  }

  export interface MetaDataRef {
    contains(key: string): boolean | undefined;
    get(key: string): string | undefined;
    set_string(key: string, value: string): string;
    get_string(key: string): string;
    set_int(key: string, value: number): void;
    get_int(key: string): number;
    set_float(key: string, value: number): void;
    get_float(key: string): number;
  }

  export interface NodeMetaRef extends MetaDataRef {}

  export interface StorageDef extends MetaDataRef {}

  /** @noSelf */
  export interface LoadingBlockModifier {
    label?: string;
    name: string;
    nodenames: string[];
    run_at_every_load: boolean;
    action: (pos: Vector3D, node: Node) => void;
  }

  export interface ParticleDefinition {
    pos: Vector3D;
    velocity: Vector3D;
    acceleration: Vector3D;
    texture: string;
    size: number;
    expirationtime: number;
    collisiondetection?: boolean;
    collision_removal?: boolean;
    object_collision?: boolean;
    vertical?: boolean;
    glow?: number;
    animation?: TileAnimationDefinition;
    playername?: string;
  }

  export type TileAnimationDefinition =
    | {
        type: 'vertical_frames';
        aspect_w: number;
        aspect_h: number;
        length: number;
      }
    | {
        type: 'sheet_2d';
        frames_w: number;
        frames_h: number;
        frame_length: number;
      };

  export type ParticleSpawnerDefinition = {
    amount: number;
    time: number;
    minpos: Vector3D;
    maxpos: Vector3D;
    minvel: Vector3D;
    maxvel: Vector3D;
    minacc: Vector3D;
    maxacc: Vector3D;
    minexptime: number;
    maxexptime: number;
    minsize: number;
    maxsize: number;
  } & Omit<
    ParticleDefinition,
    'pos' | 'velocity' | 'acceleration' | 'expirationtime' | 'size'
  >;

  export const VoxelManip: (p1: Vector3D, p2: Vector3D) => VoxelManip;

  export interface VoxelManip {
    get_data(buffer?: number[]): number[];
    set_data(data: number[]);
    write_to_map(light?: boolean);
    get_emerged_area(): LuaMultiReturn<[Vector3D, Vector3D]>;
  }

  export const AreaStore: (type_name?: string) => AreaStore;

  type AreaStoreResult<
    IncludeBorders extends boolean,
    IncludeData extends boolean
  > = IncludeBorders extends true
    ? IncludeData extends true
      ? AreaStoreResultBorders & AreaStoreResultData
      : AreaStoreResultBorders
    : IncludeData extends true
    ? AreaStoreResultData
    : true;

  type AreaStoreResultBorders = {
    min: Vector3D;
    max: Vector3D;
  };
  type AreaStoreResultData = {
    data: string;
  };

  export interface AreaStore {
    get_area<IncludeBorders extends boolean, IncludeData extends boolean>(
      id: number,
      include_borders: IncludeBorders,
      include_data: IncludeData
    ): AreaStoreResult<IncludeBorders, IncludeData> | undefined;
    get_areas_for_pos<
      IncludeBorders extends boolean,
      IncludeData extends boolean
    >(
      pos: Vector3D,
      include_borders: IncludeBorders,
      include_data: IncludeData
    ): { [id: number]: AreaStoreResult<IncludeBorders, IncludeData> };
    insert_area(
      edge1: Vector3D,
      edge2: Vector3D,
      data: string,
      id?: number
    ): number | undefined;
    remove_area(id: number): boolean;
  }

  /** @noSelf */
  interface _vector {
    ['new'](v: Vector3D): Vector3D;
    ['new'](a: number, b: number, c: number): Vector3D;
    direction(p1: Vector3D, p2: Vector3D): Vector3D;
    distance(p1: Vector3D, p2: Vector3D): number;
    length(v: Vector3D): number;
    normalize(v: Vector3D): Vector3D;
    floor(v: Vector3D): Vector3D;
    round(v: Vector3D): Vector3D;
    apply(v: Vector3D, func: (x: number) => number): Vector3D;
    sort(v1: Vector3D, v2: Vector3D): LuaMultiReturn<[Vector3D, Vector3D]>;
    angle(v1: Vector3D, v2: Vector3D): number;
    dot(v1: Vector3D, v2: Vector3D): number;
    cross(v1: Vector3D, v2: Vector3D): Vector3D;
    offset(v: Vector3D, x: number, y: number, z: number): Vector3D;
    add(v: Vector3D, x: Vector3D | number): Vector3D;
    subtract(v: Vector3D, x: Vector3D | number): Vector3D;
    multiply(v: Vector3D, s: number): Vector3D;
    divide(v: Vector3D, s: number): Vector3D;
    rotate(v: Vector3D, r: Vector3D): Vector3D;
    rotate_around_axis(v1: Vector3D, v2: Vector3D, a: number): Vector3D;
    dir_to_rotation(direction: Vector3D, up: Vector3D): Vector3D;
  }
  export const vector: _vector;

  export type NoiseParams = {
    offset: number;
    scale: number;
    spread: Vector3D;
    seed: number;
    octaves: number;
    persistence: number;
    lacunarity: number;
    flags?: string;
  };

  export interface PerlinNoiseMap2D {
    get_2d_map(pos: Vector2D): number[][];
    get_2d_map_flat(pos: Vector2D, buffer?: number[]): number[];
    calc_2d_map(pos: Vector2D): void;
    get_map_slice<T extends Partial<Vector2D>>(
      slice_offset: T,
      slice_size: T,
      buffer?: number[]
    ): number[];
  }
  export interface PerlinNoiseMap3D {
    get_3d_map(pos: Vector3D): number[][][];
    get_3d_map_flat(pos: Vector3D, buffer?: number[]): number[];
    calc_3d_map(pos: Vector3D): void;
    get_map_slice<T extends Partial<Vector3D>>(
      slice_offset: T,
      slice_size: T,
      buffer?: number[]
    ): number[];
  }

  export const PseudoRandom: (seed: number) => PseudoRandom;
  export interface PseudoRandom {
    next(): number;
    next(min: number, max: number): number;
  }

  export const PcgRandom: (seed: number) => PcgRandom;
  export interface PcgRandom {
    next(): number;
    next(min: number, max: number): number;
  }

  export const SecureRandom: () => SecureRandom | undefined;
  export interface SecureRandom {
    next_bytes(count?: number): string;
  }

  /** @noSelf */
  interface ChatCommandDefinition {
    params?: string;
    description?: string;
    privs?: Record<string, boolean>;
    func: (name: string, param: string) => LuaMultiReturn<[boolean, string?]>;
  }

  export const Raycast: <IncludeObjects extends boolean>(
    pos1: Vector3D,
    pos2: Vector3D,
    objects?: IncludeObjects,
    liquids?: boolean
  ) => Raycast<IncludeObjects>;
  export type Raycast<IncludeObjects extends boolean> =
    IncludeObjects extends false
      ? LuaIterable<PointedNode & RaycastPointedThing>
      : LuaIterable<PointedThing & RaycastPointedThing>;

  export const Settings: (filename: string) => Settings;
  export interface Settings {
    get(key: string): any;
  }

  export interface NodeTimerRef {
    set(timeout: number, elapsed: number): void;
    start(timeout: number): void;
    is_started(): boolean;
  }
}

export {};
