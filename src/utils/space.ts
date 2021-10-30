// Because VoxelArea is meh
export class Volume {
  readonly yStride: number;
  readonly zStride: number;

  constructor(
    readonly min: Readonly<Vector3D>,
    readonly max: Readonly<Vector3D>
  ) {
    this.yStride = max.x - min.x + 1;
    this.zStride = this.yStride * (max.y - min.y + 1);
  }

  static padded(volume: Volume, x: number, y: number, z: number): Volume {
    return new Volume(
      { x: volume.min.x - x, y: volume.min.y - y, z: volume.min.z - z },
      { x: volume.max.x + x, y: volume.max.y + y, z: volume.max.z + z }
    );
  }

  index(x: number, y: number, z: number): number {
    return (
      (z - this.min.z) * this.zStride +
      (y - this.min.y) * this.yStride +
      (x - this.min.x)
    );
  }

  contains(x: number, y: number, z: number): boolean {
    return (
      x >= this.min.x &&
      x <= this.max.x &&
      y >= this.min.y &&
      y <= this.max.y &&
      z >= this.min.z &&
      z <= this.max.z
    );
  }

  containsPoint(p: Vector3D): boolean {
    return this.contains(p.x, p.y, p.z);
  }

  containsVolume(volume: Volume): boolean {
    return (
      volume.min.x >= this.min.x &&
      volume.max.x <= this.max.x &&
      volume.min.y >= this.min.y &&
      volume.max.y <= this.max.y &&
      volume.min.z >= this.min.z &&
      volume.max.z <= this.max.z
    );
  }

  intersects(min: Vector3D, max: Vector3D): boolean {
    return (
      max.x >= this.min.x &&
      min.x <= this.max.x &&
      max.y >= this.min.y &&
      min.y <= this.max.y &&
      max.z >= this.min.z &&
      min.z <= this.max.z
    );
  }

  getExtent(): Vector3D {
    return {
      x: this.max.x - this.min.x + 1,
      y: this.max.y - this.min.y + 1,
      z: this.max.z - this.min.z + 1,
    };
  }

  volume(): number {
    return (
      (this.max.x - this.min.x + 1) *
      (this.max.y - this.min.y + 1) *
      (this.max.z - this.min.z + 1)
    );
  }

  forEach(callback: (position: Vector3D, index: number) => void) {
    let index = 0;
    const pos: Vector3D = { x: 0, y: 0, z: 0 };
    for (const z of $range(this.min.z, this.max.z)) {
      for (const y of $range(this.min.y, this.max.y)) {
        for (const x of $range(this.min.x, this.max.x)) {
          pos.x = x;
          pos.y = y;
          pos.z = z;
          callback(pos, index);
          index++;
        }
      }
    }
  }

  forEachSlice(size: Partial<Vector3D>, callback: (slice: Volume) => void) {
    const extent = this.getExtent();
    const realSize = {
      x: size.x || extent.x,
      y: size.y || extent.y,
      z: size.z || extent.z,
    };
    const min = { x: 0, y: 0, z: 0 };
    const max = { x: 0, y: 0, z: 0 };
    for (const z of $range(this.min.z, this.max.z, realSize.z)) {
      for (const y of $range(this.min.y, this.max.y, realSize.y)) {
        for (const x of $range(this.min.x, this.max.x, realSize.x)) {
          min.x = x;
          min.y = y;
          min.z = z;
          max.x = Math.min(this.max.x, x + realSize.x - 1);
          max.y = Math.min(this.max.y, y + realSize.y - 1);
          max.z = Math.min(this.max.z, z + realSize.z - 1);
          const slice = new Volume(min, max);
          callback(slice);
        }
      }
    }
  }

  toString() {
    return `(${this.min.x},${this.min.y},${this.min.z}|${this.max.x},${this.max.y},${this.max.z})`;
  }
}

export class Area {
  readonly yStride: number;

  constructor(
    readonly min: Readonly<Vector2D>,
    readonly max: Readonly<Vector2D>
  ) {
    this.yStride = max.x - min.x + 1;
  }

  static padded(area: Area, x: number, y: number): Area {
    return new Area(
      { x: area.min.x - x, y: area.min.y - y },
      { x: area.max.x + x, y: area.max.y + y }
    );
  }

  index(x: number, y: number): number {
    return (y - this.min.y) * this.yStride + (x - this.min.x);
  }

  contains(x: number, y: number): boolean {
    return (
      x >= this.min.x && x <= this.max.x && y >= this.min.y && y <= this.max.y
    );
  }

  containsArea(area: Area): boolean {
    return (
      area.min.x >= this.min.x &&
      area.max.x <= this.max.x &&
      area.min.y >= this.min.y &&
      area.max.y <= this.max.y
    );
  }

  intersects(min: Vector2D, max: Vector2D): boolean {
    return (
      max.x >= this.min.x &&
      min.x <= this.max.x &&
      max.y >= this.min.y &&
      min.y <= this.max.y
    );
  }

  getExtent(): Vector2D {
    return {
      x: this.max.x - this.min.x + 1,
      y: this.max.y - this.min.y + 1,
    };
  }

  area(): number {
    return (this.max.x - this.min.x + 1) * (this.max.y - this.min.y + 1);
  }

  forEach(callback: (position: Vector2D, index: number) => void) {
    let index = 0;
    const pos: Vector2D = { x: 0, y: 0 };
    for (const y of $range(this.min.y, this.max.y)) {
      for (const x of $range(this.min.x, this.max.x)) {
        pos.x = x;
        pos.y = y;
        callback(pos, index);
        index++;
      }
    }
  }

  forEachSlice(size: Partial<Vector2D>, callback: (slice: Area) => void) {
    const extent = this.getExtent();
    const realSize = {
      x: size.x || extent.x,
      y: size.y || extent.y,
    };
    const min = { x: 0, y: 0 };
    const max = { x: 0, y: 0 };
    for (const y of $range(this.min.y, this.max.y, realSize.y)) {
      for (const x of $range(this.min.x, this.max.x, realSize.x)) {
        min.x = x;
        min.y = y;
        max.x = Math.min(this.max.x, x + realSize.x - 1);
        max.y = Math.min(this.max.y, y + realSize.y - 1);
        const slice = new Area(min, max);
        callback(slice);
      }
    }
  }

  toString() {
    return `(${this.min.x},${this.min.y}|${this.max.x},${this.max.y})`;
  }
}
