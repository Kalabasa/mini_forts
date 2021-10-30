export class FilterMap2D<Params extends Record<string, any> = never> {
  x: number;
  y: number;
  nx: number; // normalized
  ny: number; // normalized

  private readonly _centerX: number;
  private readonly _centerY: number;
  private readonly _halfWidth: number;
  private readonly _halfHeight: number;

  constructor(
    private readonly _min: Vector2D,
    private readonly _max: Vector2D,
    private readonly _filterFunction: (
      this: FilterMap2D<any> & Params
    ) => number
  ) {
    this._centerX = (this._min.x + this._max.x) * 0.5;
    this._centerY = (this._min.y + this._max.y) * 0.5;
    this._halfWidth = (this._max.x - this._min.x) * 0.5 + 1e-20;
    this._halfHeight = (this._max.y - this._min.y) * 0.5 + 1e-20;
  }

  filter(p: Params, x: number, y: number): number {
    const self = Object.assign(this, p);
    self.x = x;
    self.y = y;
    self.nx = (x - this._centerX) / this._halfWidth;
    self.ny = (y - this._centerY) / this._halfHeight;
    return Math.round(self._filterFunction());
  }
}
