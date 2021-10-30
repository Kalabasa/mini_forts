import { floorDiv, randomInt } from 'utils/math';
import { Volume } from 'utils/space';
import { Stages } from 'server/world/stage_helper';

export enum BiomeType {
  Forest = 'forest',
}

export type StageData = {
  seed: number;
  index: number;
  biome: BiomeType;
};

export type StageMapgenParams = {
  data: number[];
  dataVolume: Volume;
  stageSlice: Volume;
};

type StageImpl = new (seed: number, index: number, biome: BiomeType) => Stage;

export abstract class Stage {
  static readonly size = { x: 208, y: 128, z: 208 };
  static readonly padding = 32;

  static create(
    options:
      | {
          data: StageData;
          implMap: {
            [K in BiomeType]: StageImpl;
          };
        }
      | { index: number; biome: BiomeType; impl: StageImpl }
  ): Stage {
    if ('data' in options) {
      const { data } = options;
      const impl = options.implMap[data.biome];
      return new impl(data.seed, data.index, data.biome);
    } else {
      const seed = randomInt(0, 10000);
      return new options.impl(seed, options.index, options.biome);
    }
  }

  readonly bounds: Volume;
  private seedCount: number = 0;

  constructor(
    protected readonly seed: number,
    private readonly index: number,
    private readonly biome: BiomeType
  ) {
    this.bounds = Stage.getBounds(this.index);
  }

  save(): StageData {
    return {
      seed: this.seed,
      index: this.index,
      biome: this.biome,
    };
  }

  abstract getHomePosition(): Vector3D;
  abstract generateMap(params: StageMapgenParams): void;

  protected nextSeed(): number {
    return this.seed + this.seedCount++;
  }

  static getBounds(stageIndex: number): Volume {
    const pos = Stages.getOverworldStagePosition(stageIndex);
    const min = {
      x: pos.x * (Stage.size.x + Stage.padding),
      y: -floorDiv(Stage.size.y, 2),
      z: pos.y * (Stage.size.z + Stage.padding),
    };
    const max = {
      x: min.x + Stage.size.x - 1,
      y: min.y + Stage.size.y - 1,
      z: min.z + Stage.size.z - 1,
    };
    return new Volume(min, max);
  }
}
