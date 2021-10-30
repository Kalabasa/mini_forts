import { Autotile, Tiles } from 'server/block/autotile_block/autotile';
import {
  AbstractBlockPropertiesConstructor,
  AbstractBlockScriptConstructor,
  BlockCallbacks,
  BlockProperties,
  BlockScript,
  BlockScriptConstructor,
  BlockState,
} from 'server/block/block';
import { equalVectors } from 'utils/math';

function makeAutotileNodes(
  autotileTiles: Map<string, Tiles>
): Record<string, NodeDefinition> {
  const autotileNodes: Record<string, NodeDefinition> = {};

  for (const [name, tiles] of autotileTiles.entries()) {
    autotileNodes[name] = {
      drawtype: 'normal',
      tiles,
    };
  }

  return autotileNodes;
}

export function createAutotileBlockProperties<P extends BlockProperties>({
  autotile,
  base,
}: {
  autotile: Autotile;
  base?: AbstractBlockPropertiesConstructor<P>;
}) {
  const autotileTiles = autotile.makeTiles();

  abstract class AutotileBlockProperties extends (base ?? BlockProperties) {
    readonly autotile: Autotile = autotile;
    readonly autotileTiles = autotileTiles;

    override scriptCallbacks = this.defineCallbacks({
      onDestroy: true,
    });

    nodeDefinition = this.defineNodes(makeAutotileNodes(autotileTiles));
  }

  return AutotileBlockProperties as AbstractBlockPropertiesConstructor<
    P & AutotileBlockProperties
  >;
}

type PropertiesInstance = InstanceType<
  ReturnType<typeof createAutotileBlockProperties>
>;

export class AutotileBlockScript<P extends PropertiesInstance>
  extends BlockScript<P>
  implements BlockCallbacks<PropertiesInstance>
{
  static asClass2<P extends PropertiesInstance>() {
    return this as BlockScriptConstructor<AutotileBlockScript<P>>;
  }

  override initializeNode() {
    const [neighbors] = minetest.find_nodes_in_area(
      vector.subtract(this.position, 2),
      vector.add(this.position, 2),
      this.getNodeNames()
    );
    const state = this.computeAutotileState(this.position, neighbors);

    super.initializeNode(state);

    const autotileNeighbors = filterNeighbors(this.position, neighbors);
    neighbors.push(this.position);

    for (const pos of autotileNeighbors) {
      this.updateNeighbor(pos, neighbors);
    }
  }

  onDestroy() {
    let [neighbors] = minetest.find_nodes_in_area(
      vector.subtract(this.position, 2),
      vector.add(this.position, 2),
      this.getNodeNames()
    );

    neighbors = neighbors.filter((p) => !equalVectors(p, this.position));
    const autotileNeighbors = filterNeighbors(this.position, neighbors);

    for (const pos of autotileNeighbors) {
      this.updateNeighbor(pos, neighbors);
    }
  }

  private updateNeighbor(pos: Vector3D, otherNeighbors: Vector3D[]) {
    const { autotileTiles } = this.properties;

    const ref = this.context.blockManager.getRef<this>(pos);
    if (autotileTiles.has(ref.getState())) {
      const state = this.computeAutotileState(pos, otherNeighbors);
      ref.changeState(state);
    }
  }

  private computeAutotileState(
    position: Vector3D,
    neighbors: Vector3D[]
  ): BlockState<P> {
    const adjacency = Autotile.computeAdjacencyMap(position, neighbors);
    return this.properties.autotile.getName(adjacency);
  }

  private getNodeNames(): string[] {
    return Object.values(this.registry.states).map((r) => r.name);
  }
}

function filterNeighbors(center: Vector3D, neighbors: Vector3D[]) {
  return neighbors.filter((pos) =>
    Autotile.adjacencyOffsets.some(
      (offset) =>
        offset.x === pos.x - center.x &&
        offset.y === pos.y - center.y &&
        offset.z === pos.z - center.z
    )
  );
}
