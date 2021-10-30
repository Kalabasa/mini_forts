import { globals } from 'common/globals';

// Quick client-side check to see if the server is running MiniForts game
export function checkGame(): boolean {
  return minetest.get_node_def(globals.nodes.barrier) != undefined;
}
