declare global {
  namespace minetest {
    const localplayer: LocalPlayer;
    const camera: Camera;

    function get_csm_restrictions(): CSMRestrictions;
    function get_node_def(
      nodename: string
    ): Required<NodeDefinition> | undefined;
    function get_item_def(
      itemstring: string
    ): Required<ItemDefinition> | undefined;
    function display_chat_message(text: string): void;
    function register_on_formspec_input(
      fn: (formname, fields) => boolean | void
    ): void;
    function register_on_dignode(
      fn: (pos: Vector3D, node: Node) => boolean | void
    ): void;
    function register_on_punchnode(
      fn: (pos: Vector3D, node: Node) => boolean | void
    ): void;
    // Doc says 2nd param is node, but it's actually an item def
    function register_on_placenode(
      fn: (pointed_thing: PointedNode, item: ItemDefinition) => void
    ): void;
    function register_on_item_use(
      fn: (item: ItemDefinition, pointed_thing: PointedThing) => boolean | void
    ): void;
    function register_on_modchannel_signal(
      fn: (channel_name: string, signal: 0 | 1 | 2 | 3 | 4 | 5) => void
    ): void;
    function register_on_inventory_open(
      fn: (inventory: any) => boolean | void
    ): void;
    function show_formspec(formname: string, formspec: string): boolean;
  }

  export type CSMRestrictions = Record<
    | 'load_client_mods'
    | 'chat_messages'
    | 'read_itemdefs'
    | 'read_nodedefs'
    | 'lookup_nodes'
    | 'read_playerinfo',
    boolean
  >;

  export interface LocalPlayer {
    get_pos(): Vector3D;
    get_velocity(): Vector3D;
    get_name(): string;
    get_wield_index(): number;
    get_wielded_item(): ItemStack;
    get_control(): {
      up: boolean;
      down: boolean;
      left: boolean;
      right: boolean;
      jump: boolean;
      aux1: boolean;
      sneak: boolean;
      zoom: boolean;
      dig: boolean;
      place: boolean;
    };
    hud_add(definition: HudDefinition): number | undefined;
    hud_get(id: number): HudDefinition | undefined;
    hud_remove(id: number): boolean;
    hud_change: PlayerObject['hud_change'];
  }

  export interface Camera {
    set_camera_mode(mode: 0 | 1 | 2): void;
    get_camera_mode(): 0 | 1 | 2;
    get_pos(): Vector3D;
    get_offset(): Vector3D;
    get_look_dir(): Vector3D;
    get_look_vertical(): number;
    get_look_horizontal(): number;
    get_aspect_ratio(): number;
  }
}

export {};
