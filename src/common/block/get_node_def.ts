import { CONFIG } from 'utils/config';

export const getNodeDef: (
  name: string
) => Required<NodeDefinition> | undefined = CONFIG.isClient
  ? minetest.get_node_def
  : (name) => minetest.registered_nodes[name];
