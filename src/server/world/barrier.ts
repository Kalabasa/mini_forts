import { globals } from 'common/globals';

export const Barrier = {
  registerNode,
  nodeID: 0,
  nodeName: '',
};

function registerNode() {
  const name = globals.nodes.barrier;
  minetest.register_node(name, {
    drawtype: 'airlike',
    tiles: [globals.textures.blank],
    paramtype: 'light',
    sunlight_propagates: true,
    walkable: true,
    pointable: false,
  });
  Barrier.nodeID = minetest.get_content_id(name);
  Barrier.nodeName = name;
}
