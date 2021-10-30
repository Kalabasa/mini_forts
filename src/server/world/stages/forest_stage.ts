import { BedrockDef } from 'server/block/bedrock/def';
import { FertileSoilDef } from 'server/block/fertile_soil/def';
import { OreDef } from 'server/block/ore/def';
import { RockDef } from 'server/block/rock/def';
import { SoilDef } from 'server/block/soil/def';
import { WoodDef } from 'server/block/wood/def';
import { DistributionMap3D } from 'server/mapgen/distribution_map';
import { FilterMap2D } from 'server/mapgen/filter_map';
import { NoiseMap2D } from 'server/mapgen/noise_map';
import { Stage, StageMapgenParams } from 'server/world/stage';
import { throwError } from 'utils/error';
import { Logger } from 'utils/logger';
import { hypot, hypot2, lerp } from 'utils/math';
import { Area, Volume } from 'utils/space';

const minTreeRadius = 4;
const maxTreeRadius = 8;
const treeInfluenceRadius = 80;

export class ForestStage extends Stage {
  private readonly bounds2D = [
    { x: this.bounds.min.x, y: this.bounds.min.z },
    { x: this.bounds.max.x, y: this.bounds.max.z },
  ] as const;

  private readonly terrainNoiseMap1 = new NoiseMap2D({
    octaves: 1,
    lacunarity: 2,
    persistence: 0.5,
    seed: this.nextSeed(),
    spread: { x: 10, y: 10, z: 10 },
  });
  private readonly terrainNoiseMap2 = new NoiseMap2D({
    octaves: 3,
    lacunarity: 2,
    persistence: 0.5,
    seed: this.nextSeed(),
    spread: { x: 15, y: 15, z: 15 },
  });
  private readonly terrainFilter = new FilterMap2D<{
    minY: number;
    terrainNoise1: number;
    terrainNoise2: number;
  }>(...this.bounds2D, function () {
    const radius = hypot(this.nx, this.ny);
    return (
      this.minY +
      Math.min(
        radius < 0.03 ? 8 : Infinity,
        Math.max(
          radius < 0.06 ? 8 : -Infinity,
          6 + (this.terrainNoise1 < 0.4 ? 0 : 1) * 2,
          6 +
            (this.terrainNoise2 < 0.8 ? 0 : 1) *
              (3 + Math.round(this.terrainNoise1 * 1.5))
        )
      )
    );
  });

  private readonly fertileSoilNoiseMap = new NoiseMap2D({
    octaves: 2,
    lacunarity: 4,
    persistence: 0.8,
    seed: this.nextSeed(),
    spread: { x: 15, y: 15, z: 15 },
  });

  private readonly fertileSoilFilter = new FilterMap2D<{
    minY: number;
    fertileSoilNoise: number;
  }>(...this.bounds2D, function () {
    return this.minY - 4 + this.fertileSoilNoise ** 2 * 15;
  });

  private readonly rockNoiseMap = new NoiseMap2D({
    octaves: 3,
    lacunarity: 4,
    persistence: 0.8,
    seed: this.nextSeed(),
    spread: { x: 20, y: 20, z: 20 },
  });

  private readonly rockFilter = new FilterMap2D<{
    minY: number;
    rockNoise: number;
  }>(...this.bounds2D, function () {
    return (
      this.minY +
      -10 +
      (1 / (1 + (this.rockNoise / (1 - this.rockNoise)) ** -3)) * 17
    );
  });

  private readonly bedrockNoiseMap = new NoiseMap2D({
    octaves: 3,
    lacunarity: 4,
    persistence: 0.8,
    seed: this.nextSeed(),
    spread: { x: 80, y: 80, z: 80 },
  });

  private readonly bedrockFilter = new FilterMap2D<{
    minY: number;
    bedrockNoise: number;
  }>(...this.bounds2D, function () {
    return (
      this.minY +
      2 +
      (1 / (1 + (this.bedrockNoise / (1 - this.bedrockNoise)) ** -3)) * 3
    );
  });

  private readonly rootNoiseMap1 = new NoiseMap2D({
    octaves: 1,
    lacunarity: 2,
    persistence: 0.5,
    seed: this.nextSeed(),
    spread: { x: 10, y: 10, z: 10 },
  });
  private readonly rootNoiseMap2 = new NoiseMap2D({
    octaves: 1,
    lacunarity: 2,
    persistence: 0.5,
    seed: this.nextSeed(),
    spread: { x: 12, y: 12, z: 12 },
  });
  private readonly treeDistributionMap = new DistributionMap3D(
    {
      density: (pos) => {
        const spawn = this.getHomePosition();
        if (hypot2(pos.x - spawn.x, pos.y - spawn.z) < 40 * 40) {
          return 0;
        } else {
          return 1;
        }
      },
      seed: this.nextSeed(),
      spread: { x: 60, y: 60, z: maxTreeRadius - minTreeRadius + 1 },
    },
    {
      x: DistributionMap3D.defaultSize.x,
      y: DistributionMap3D.defaultSize.y,
      z: maxTreeRadius - minTreeRadius + 1,
    }
  );
  private readonly woodFilter = new FilterMap2D<{
    minY: number;
    treeDistribution: Vector3D[];
    rootKernel1: number[];
    rootKernel2: number[];
  }>(...this.bounds2D, function () {
    if (hypot(this.nx, this.ny) < 0.03) return -Infinity;

    let nearestTreeDist = Infinity;
    for (const tree of this.treeDistribution) {
      const dist = hypot(tree.x - this.x, tree.y - this.y) - tree.z;
      if (dist < nearestTreeDist) {
        nearestTreeDist = dist;
        if (dist <= 0) break;
      }
    }
    nearestTreeDist = Math.max(0, nearestTreeDist);

    let rootNoise = Math.max(
      ...this.rootKernel1
        .map((n, i) => Math.abs(n - this.rootKernel2[i]))
        .map((n) => (1 - n) ** (4 + Math.floor(nearestTreeDist * 0.1)))
    );
    rootNoise = 1 / (1 + (rootNoise / (1 - rootNoise)) ** -4);
    const rootHeight =
      this.minY +
      -11 +
      rootNoise * (60 / (1 + nearestTreeDist) + 4800 / (240 + nearestTreeDist));

    const treeHeight =
      this.minY - 12 + (1 / (1 + nearestTreeDist * 700)) * 80 * Stage.size.y;

    return Math.max(rootHeight, treeHeight);
  });

  spawn: Vector3D | undefined;

  getHomePosition(): Vector3D {
    if (!this.spawn) {
      const minY = this.bounds.min.y;
      const center = {
        x: Math.round(lerp(this.bounds2D[0].x, this.bounds2D[1].x, 0.5)),
        y: Math.round(lerp(this.bounds2D[0].y, this.bounds2D[1].y, 0.5)),
      };
      const spawnArea = new Area(center, center);

      const terrainNoiseMap1 = this.terrainNoiseMap1.getMap(spawnArea);
      const terrainNoiseMap2 = this.terrainNoiseMap2.getMap(spawnArea);

      const index = spawnArea.index(center.x, center.y);
      const terrainNoise1 = terrainNoiseMap1[index];
      const terrainNoise2 = terrainNoiseMap2[index];
      const terrainHeight = this.terrainFilter.filter(
        {
          minY,
          terrainNoise1,
          terrainNoise2,
        },
        center.x,
        center.y
      );

      this.spawn = {
        x: center.x,
        y: terrainHeight + 1,
        z: center.y,
      };
    }

    return this.spawn;
  }

  override generateMap({ data, dataVolume, stageSlice }: StageMapgenParams) {
    const minY = this.bounds.min.y;

    stageSlice.forEachSlice({ z: 1 }, (slice) => {
      const floorSlice = new Area(
        { x: slice.min.x, y: slice.min.z },
        { x: slice.max.x, y: slice.max.z }
      );
      const rootMapSlice = Area.padded(floorSlice, 1, 1);
      const treeGenSpace = new Volume(
        {
          x: slice.min.x - treeInfluenceRadius,
          y: slice.min.z - treeInfluenceRadius,
          z: minTreeRadius,
        },
        {
          x: slice.max.x + treeInfluenceRadius,
          y: slice.max.z + treeInfluenceRadius,
          z: maxTreeRadius,
        }
      );

      const terrainNoiseMap1 = this.terrainNoiseMap1.getMap(floorSlice);
      const terrainNoiseMap2 = this.terrainNoiseMap2.getMap(floorSlice);
      const fertileSoilNoiseMap = this.fertileSoilNoiseMap.getMap(floorSlice);
      const rockNoiseMap = this.rockNoiseMap.getMap(floorSlice);
      const bedrockNoiseMap = this.bedrockNoiseMap.getMap(floorSlice);
      const rootNoiseMap1 = this.rootNoiseMap1.getMap(rootMapSlice);
      const rootNoiseMap2 = this.rootNoiseMap2.getMap(rootMapSlice);
      const treeDistribution = this.treeDistributionMap.getPoints(treeGenSpace);

      slice.forEachSlice({ x: 1, z: 1 }, (columnSlice) => {
        const column = columnSlice.min;
        if (!floorSlice.contains(column.x, column.z)) {
          throwError('Invalid floor position:', column);
        }

        const floorIndex = floorSlice.index(column.x, column.z);
        const rootKernelIndices = [
          rootMapSlice.index(column.x, column.z),
          rootMapSlice.index(column.x + 1, column.z),
          rootMapSlice.index(column.x, column.z + 1),
          rootMapSlice.index(column.x + 1, column.z + 1),
        ];

        const terrainNoise1 = terrainNoiseMap1[floorIndex];
        const terrainNoise2 = terrainNoiseMap2[floorIndex];
        const terrainHeight = this.terrainFilter.filter(
          { minY, terrainNoise1, terrainNoise2 },
          column.x,
          column.z
        );

        const fertileSoilNoise = fertileSoilNoiseMap[floorIndex];
        const fertileSoilHeight = this.fertileSoilFilter.filter(
          { minY, fertileSoilNoise },
          column.x,
          column.z
        );

        const rockNoise = rockNoiseMap[floorIndex];
        const rockHeight = this.rockFilter.filter(
          { minY, rockNoise },
          column.x,
          column.z
        );

        const bedrockNoise = bedrockNoiseMap[floorIndex];
        const bedrockHeight = this.bedrockFilter.filter(
          { minY, bedrockNoise },
          column.x,
          column.z
        );

        const rootKernel1 = rootKernelIndices.map((i) => rootNoiseMap1[i]);
        const rootKernel2 = rootKernelIndices.map((i) => rootNoiseMap2[i]);
        const woodHeight = this.woodFilter.filter(
          { minY, treeDistribution, rootKernel1, rootKernel2 },
          column.x,
          column.z
        );

        columnSlice.forEach((pos) => {
          const y = pos.y;
          const dataIndex = dataVolume.index(pos.x, y, pos.z);
          let nodeID;
          if (y <= bedrockHeight) {
            nodeID = BedrockDef.registry.states.default.id;
          } else if (y <= rockHeight && y <= terrainHeight) {
            const isOre = Math.random() < 0.15;
            if (y === rockHeight && y === terrainHeight) {
              nodeID = isOre
                ? OreDef.registry.states.grassy.id
                : RockDef.registry.states.grassy.id;
            } else {
              nodeID = isOre
                ? OreDef.registry.states.default.id
                : RockDef.registry.states.default.id;
            }
          } else if (y === woodHeight + 1 && y === terrainHeight + 1) {
            nodeID = SoilDef.registry.states.grassy.id;
          } else if (y <= woodHeight && y >= (minY + 6) * 2 - woodHeight) {
            nodeID = WoodDef.registry.states.default.id;
          } else if (y === terrainHeight) {
            if (y === fertileSoilHeight) {
              nodeID = FertileSoilDef.registry.states.grassy.id;
            } else if (y < fertileSoilHeight) {
              nodeID = FertileSoilDef.registry.states.default.id;
            } else {
              nodeID = SoilDef.registry.states.grassy.id;
            }
          } else if (y < terrainHeight) {
            nodeID = SoilDef.registry.states.default.id;
          } else {
            nodeID = minetest.CONTENT_AIR;
          }
          data[dataIndex] = nodeID;
        });
      });
    });
  }
}
