import { floorDiv } from 'utils/math';
import { Volume } from 'utils/space';

const defaultSize = 112;

type Params = {
  seed: number;
  density: number | ((pos: Vector3D) => number);
  spread: Vector3D;
};

type Cell = {
  position: Vector3D;
  points: Vector3D[];
};

/**
 * Random distribution of points
 */
export class DistributionMap3D {
  static readonly defaultSize = vector.new(
    defaultSize,
    defaultSize,
    defaultSize
  );

  private readonly cacheSize: Vector3D;
  private cachedCells: Cell[] | undefined = undefined;
  private cachedCellVolume: Volume | undefined = undefined;

  private readonly buffer: Cell[] = [];

  constructor(
    private readonly params: Params,
    size: Vector3D = DistributionMap3D.defaultSize
  ) {
    this.cacheSize = {
      x: Math.ceil(size.x / params.spread.x),
      y: Math.ceil(size.y / params.spread.y),
      z: Math.ceil(size.z / params.spread.z),
    };
  }

  getPoints(volume: Volume): Vector3D[] {
    const cellVolume = new Volume(
      {
        x: floorDiv(volume.min.x, this.params.spread.x),
        y: floorDiv(volume.min.y, this.params.spread.y),
        z: floorDiv(volume.min.z, this.params.spread.z),
      },
      {
        x: Math.ceil(volume.max.x / this.params.spread.x),
        y: Math.ceil(volume.max.y / this.params.spread.y),
        z: Math.ceil(volume.max.z / this.params.spread.z),
      }
    );

    if (
      !this.cachedCells ||
      !this.cachedCellVolume ||
      !this.cachedCellVolume.containsVolume(cellVolume)
    ) {
      this.cachedCellVolume = new Volume(cellVolume.min, {
        x: Math.max(cellVolume.max.x, cellVolume.min.x + this.cacheSize.x),
        y: Math.max(cellVolume.max.y, cellVolume.min.y + this.cacheSize.y),
        z: Math.max(cellVolume.max.z, cellVolume.min.z + this.cacheSize.z),
      });
      this.cachedCells = this.generateCells(this.cachedCellVolume, this.buffer);
    }

    return this.cachedCells
      .filter((cell) => cellVolume.containsPoint(cell.position))
      .flatMap((cell) => cell.points)
      .filter((pos) => volume.containsPoint(pos));
  }

  private generateCells(cellVolume: Volume, buffer: Cell[] = []): Cell[] {
    const { seed, density, spread } = this.params;
    const densityFn = typeof density === 'number' ? () => density : density;

    let lastIndex = -1;
    cellVolume.forEach((cellPos, index) => {
      const cellSeed = (seed + cellPos.x + cellPos.y * 131) % 1000;
      const random = PseudoRandom(cellSeed);

      const densityValue = densityFn({
        x: Math.round(cellPos.x * spread.x + spread.x * 0.5),
        y: Math.round(cellPos.y * spread.y + spread.y * 0.5),
        z: Math.round(cellPos.z * spread.z + spread.z * 0.5),
      });

      const points: Vector3D[] = [];
      for (const _ of $range(1, densityValue)) {
        points.push({
          x: cellPos.x * spread.x + random.next(0, spread.x - 1),
          y: cellPos.y * spread.y + random.next(0, spread.y - 1),
          z: cellPos.z * spread.z + random.next(0, spread.z - 1),
        });
      }

      buffer[index] = {
        position: cellPos,
        points,
      };
      lastIndex = index;
    });

    buffer.length = lastIndex + 1;
    return buffer;
  }
}
