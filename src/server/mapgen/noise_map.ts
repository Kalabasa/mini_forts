import { CONFIG } from 'utils/config';
import { throwError } from 'utils/error';
import { Logger } from 'utils/logger';
import { Area } from 'utils/space';

const defaultSize = 112;

export class NoiseMap2D {
  static readonly defaultSize = { x: defaultSize, y: defaultSize };

  // Lazy-initialized
  private noiseMap: PerlinNoiseMap2D | undefined = undefined;
  private cachedArea: Area | undefined = undefined;

  private readonly buffer: number[] = [];

  constructor(
    private readonly noiseParams: Omit<NoiseParams, 'offset' | 'scale'>,
    private readonly offset: Vector2D = { x: 0, y: 0 },
    private readonly size: Vector2D = NoiseMap2D.defaultSize
  ) {
    if (CONFIG.isDev) {
      // init so we catch errors early
      this.getNoiseMap();
    }
  }

  private getNoiseMap(): PerlinNoiseMap2D {
    return (this.noiseMap =
      this.noiseMap ??
      minetest.get_perlin_map(
        {
          ...this.noiseParams,
          ...computeOffsetScale(this.noiseParams),
        },
        this.size
      ));
  }

  getMap(area: Area): number[] {
    const size = area.getExtent();

    if (size.x > this.size.x || size.y > this.size.y) {
      throwError('Requested noise map too large');
    }

    const noiseMap = this.getNoiseMap();

    if (this.cachedArea == undefined || !this.cachedArea.containsArea(area)) {
      noiseMap.calc_2d_map({
        x: area.min.x + this.offset.x,
        y: area.min.y + this.offset.y,
      });
      this.cachedArea = new Area(area.min, {
        x: area.min.x + this.size.x - 1,
        y: area.min.y + this.size.y - 1,
      });
    }

    const offset = {
      x: area.min.x - this.cachedArea.min.x + 1,
      y: area.min.y - this.cachedArea.min.y + 1,
    };

    return noiseMap.get_map_slice(offset, size, this.buffer);
  }
}

// compute offset and scale such that the resulting noise would be in [0,1]
function computeOffsetScale({
  octaves,
  persistence,
}: Pick<NoiseParams, 'octaves' | 'persistence'>): {
  offset: number;
  scale: number;
} {
  // there's probably a quick equation for this
  let mag = 0;
  for (const i of $range(1, octaves)) {
    mag += persistence ** (i - 1);
  }

  return {
    offset: 0.5,
    scale: 0.5 / mag,
  };
}
