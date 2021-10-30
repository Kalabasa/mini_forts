import {
  AdjacencyMap,
  Autotile,
  Tiles,
} from 'server/block/autotile_block/autotile';
import { getBit } from 'utils/math';

export class ColumnAutotile implements Autotile {
  constructor(private readonly texture: string) {}

  getName(adjacencyMap: AdjacencyMap): string {
    const openTop: boolean = !adjacencyMap['y+'];
    const openBottom: boolean = !adjacencyMap['y-'];

    if (openTop) {
      const w = adjacencyMap['x-'] ? 1 : 0;
      const e = adjacencyMap['x+'] ? 1 : 0;
      const s = adjacencyMap['z-'] ? 1 : 0;
      const n = adjacencyMap['z+'] ? 1 : 0;
      const sw = adjacencyMap['x-z-'] ? 1 : 0;
      const se = adjacencyMap['x+z-'] ? 1 : 0;
      const nw = adjacencyMap['x-z+'] ? 1 : 0;
      const ne = adjacencyMap['x+z+'] ? 1 : 0;
      // subtile types
      // 0:open corner
      // 1:vertical edge
      // 2:horizontal edge
      // 3:inner corner
      // 4:contiguous
      const nwType = w + 2 * n + w * n * nw;
      const neType = e + 2 * n + e * n * ne;
      const swType = w + 2 * s + w * s * sw;
      const seType = e + 2 * s + e * s * se;
      const topType = `${nwType}${neType}${swType}${seType}`;
      return openBottom ? `plane${topType}` : `top${topType}`;
    } else if (openBottom) {
      return 'bottom';
    } else {
      return 'base';
    }
  }

  makeTiles(): Map<string, Tiles> {
    const openSide = combine(this.texture, [
      ...parts.sideBottom_TopHalf,
      ...parts.sideTop_BottomHalf,
    ]);
    const planeSide = combine(this.texture, [
      ...parts.sideTop_TopHalf,
      ...parts.sideBottom_BottomHalf,
    ]);
    const topSide = combine(this.texture, [
      ...parts.sideTop_TopHalf,
      ...parts.sideTop_BottomHalf,
    ]);
    const bottomSide = combine(this.texture, [
      ...parts.sideBottom_TopHalf,
      ...parts.sideBottom_BottomHalf,
    ]);

    const bottom = `${this.texture}^[sheet:4x2:3,0`;

    const map = new Map<string, Tiles>();
    map.set('base', [
      openSide,
      openSide,
      openSide,
      openSide,
      openSide,
      openSide,
    ]);
    map.set('bottom', [
      openSide,
      bottom,
      bottomSide,
      bottomSide,
      bottomSide,
      bottomSide,
    ]);

    for (const nwType of $range(0, 4)) {
      const n = nwType === 4 || getBit(nwType, 1) > 0;
      const w = nwType === 4 || getBit(nwType, 0) > 0;
      for (const neType of $range(0, 4)) {
        const checkN = neType === 4 || getBit(neType, 1) > 0;
        if (n === checkN) {
          const e = neType === 4 || getBit(neType, 0) > 0;
          for (const swType of $range(0, 4)) {
            const checkW = swType === 4 || getBit(swType, 0) > 0;
            if (w === checkW) {
              const s = swType === 4 || getBit(swType, 1) > 0;
              for (const seType of $range(0, 4)) {
                const checkE = seType === 4 || getBit(seType, 0) > 0;
                const checkS = seType === 4 || getBit(seType, 1) > 0;
                if (e === checkE && s === checkS) {
                  const topType = `${nwType}${neType}${swType}${seType}`;

                  const topSubtileNW = [
                    parts.top_NW_Corner_Quarter,
                    parts.top_N_Edge_NW_Quarter,
                    parts.top_W_Edge_NW_Quarter,
                    parts.top_NW_InnerCornerQuarter,
                    parts.top_NW_Quarter,
                  ][nwType];

                  const topSubtileNE = [
                    parts.top_NE_Corner_Quarter,
                    parts.top_N_Edge_NE_Quarter,
                    parts.top_E_Edge_NE_Quarter,
                    parts.top_NE_InnerCornerQuarter,
                    parts.top_NE_Quarter,
                  ][neType];

                  const topSubtileSW = [
                    parts.top_SW_Corner_Quarter,
                    parts.top_S_Edge_SW_Quarter,
                    parts.top_W_Edge_SW_Quarter,
                    parts.top_SW_InnerCornerQuarter,
                    parts.top_SW_Quarter,
                  ][swType];

                  const topSubtileSE = [
                    parts.top_SE_Corner_Quarter,
                    parts.top_S_Edge_SE_Quarter,
                    parts.top_E_Edge_SE_Quarter,
                    parts.top_SE_InnerCornerQuarter,
                    parts.top_SE_Quarter,
                  ][seType];

                  const top = combine(this.texture, [
                    ...topSubtileNW,
                    ...topSubtileNE,
                    ...topSubtileSW,
                    ...topSubtileSE,
                  ]);

                  map.set(`top${topType}`, [
                    top,
                    bottom,
                    topSide,
                    topSide,
                    topSide,
                    topSide,
                  ]);

                  map.set(`plane${topType}`, [
                    top,
                    bottom,
                    planeSide,
                    planeSide,
                    planeSide,
                    planeSide,
                  ]);
                }
              }
            }
          }
        }
      }
    }

    return map;
  }

  makeInventoryImage(): string {
    const closedSide = combine(this.texture, [
      ...parts.sideTop_TopHalf,
      ...parts.sideBottom_BottomHalf,
    ]);
    return closedSide;
    // const closedTop = combine(this.texture, [
    //   ...parts.top_NW_Corner_Quarter,
    //   ...parts.top_NE_Corner_Quarter,
    //   ...parts.top_SW_Corner_Quarter,
    //   ...parts.top_SE_Corner_Quarter,
    // ]);

    // return minetest.inventorycube(closedTop, closedSide, closedSide);
  }
}

const parts = {
  sideTop_TopHalf: [
    { tile: { x: 0, y: 0 }, subtile: { x: 0, y: 0 } },
    { tile: { x: 0, y: 0 }, subtile: { x: 1, y: 0 } },
  ],
  sideTop_BottomHalf: [
    { tile: { x: 0, y: 0 }, subtile: { x: 0, y: 1 } },
    { tile: { x: 0, y: 0 }, subtile: { x: 1, y: 1 } },
  ],
  sideBottom_TopHalf: [
    { tile: { x: 0, y: 1 }, subtile: { x: 0, y: 0 } },
    { tile: { x: 0, y: 1 }, subtile: { x: 1, y: 0 } },
  ],
  sideBottom_BottomHalf: [
    { tile: { x: 0, y: 1 }, subtile: { x: 0, y: 1 } },
    { tile: { x: 0, y: 1 }, subtile: { x: 1, y: 1 } },
  ],
  top_NW_Corner_Quarter: [{ tile: { x: 1, y: 0 }, subtile: { x: 0, y: 0 } }],
  top_N_Edge_NE_Quarter: [{ tile: { x: 1, y: 0 }, subtile: { x: 1, y: 0 } }],
  top_W_Edge_SW_Quarter: [{ tile: { x: 1, y: 0 }, subtile: { x: 0, y: 1 } }],
  top_SE_Quarter: [{ tile: { x: 1, y: 0 }, subtile: { x: 1, y: 1 } }],
  top_N_Edge_NW_Quarter: [{ tile: { x: 2, y: 0 }, subtile: { x: 0, y: 0 } }],
  top_NE_Corner_Quarter: [{ tile: { x: 2, y: 0 }, subtile: { x: 1, y: 0 } }],
  top_SW_Quarter: [{ tile: { x: 2, y: 0 }, subtile: { x: 0, y: 1 } }],
  top_E_Edge_SE_Quarter: [{ tile: { x: 2, y: 0 }, subtile: { x: 1, y: 1 } }],
  top_W_Edge_NW_Quarter: [{ tile: { x: 1, y: 1 }, subtile: { x: 0, y: 0 } }],
  top_NE_Quarter: [{ tile: { x: 1, y: 1 }, subtile: { x: 1, y: 0 } }],
  top_SW_Corner_Quarter: [{ tile: { x: 1, y: 1 }, subtile: { x: 0, y: 1 } }],
  top_S_Edge_SE_Quarter: [{ tile: { x: 1, y: 1 }, subtile: { x: 1, y: 1 } }],
  top_NW_Quarter: [{ tile: { x: 2, y: 1 }, subtile: { x: 0, y: 0 } }],
  top_E_Edge_NE_Quarter: [{ tile: { x: 2, y: 1 }, subtile: { x: 1, y: 0 } }],
  top_S_Edge_SW_Quarter: [{ tile: { x: 2, y: 1 }, subtile: { x: 0, y: 1 } }],
  top_SE_Corner_Quarter: [{ tile: { x: 2, y: 1 }, subtile: { x: 1, y: 1 } }],
  top_NW_InnerCornerQuarter: [
    { tile: { x: 3, y: 1 }, subtile: { x: 0, y: 0 } },
  ],
  top_NE_InnerCornerQuarter: [
    { tile: { x: 3, y: 1 }, subtile: { x: 1, y: 0 } },
  ],
  top_SW_InnerCornerQuarter: [
    { tile: { x: 3, y: 1 }, subtile: { x: 0, y: 1 } },
  ],
  top_SE_InnerCornerQuarter: [
    { tile: { x: 3, y: 1 }, subtile: { x: 1, y: 1 } },
  ],
};

function combine(
  texture: string,
  parts: { tile: Vector2D; subtile: Vector2D }[]
): string {
  return (
    '[combine:16x16:' +
    parts
      .map(
        ({ tile, subtile }) =>
          `${subtile.x * 8},${subtile.y * 8}=${texture}\\^[sheet\\:8x4\\:${
            tile.x * 2 + subtile.x
          },${tile.y * 2 + subtile.y}`
      )
      .join(':')
  );
}
