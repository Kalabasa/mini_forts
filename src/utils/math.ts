// todo: when Lua5.3, use native operator
export const floorDiv = (a: number, b: number) => Math.floor(a / b);

// todo: when Lua5.3, replace with native bitwise
export const getBit = (n: number, m: number) =>
  Math.floor((n % 2 ** (m + 1)) / 2 ** m);

export const ZERO_V: Readonly<Vector3D> = new (class {
  get x() {
    return 0;
  }
  get y() {
    return 0;
  }
  get z() {
    return 0;
  }
})();

export function px16Box(
  box: [number, number, number, number, number, number]
): [number, number, number, number, number, number] {
  return box.map((x) => x / 16) as [
    number,
    number,
    number,
    number,
    number,
    number
  ];
}

// because the built-in implementation is ???
vector.length = function (v: Vector3D) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
};

export function vectorFloorDiv(v: Vector3D, d: number): Vector3D {
  return {
    x: floorDiv(v.x, d),
    y: floorDiv(v.y, d),
    z: floorDiv(v.z, d),
  };
}

export function equalVectors(a: Vector3D, b: Vector3D): boolean {
  return a && b && a.x === b.x && a.y === b.y && a.z === b.z;
}

export function sortVectors(a: Vector3D, b: Vector3D): [Vector3D, Vector3D] {
  [a, b] = vector.sort(a, b);
  return [a, b];
}

export function sqDist(a: Vector3D, b: Vector3D): number {
  const d = vector.subtract(a, b);
  return d.x * d.x + d.y * d.y + d.z * d.z;
}

export function inRange(
  a: Vector3D,
  b: Vector3D,
  maxDistance: number
): boolean {
  return sqDist(a, b) <= maxDistance;
}

export function lerpVector(a: Vector3D, b: Vector3D, t: number): Vector3D {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

export function lerpVector2D(a: Vector2D, b: Vector2D, t: number): Vector2D {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
  };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function hypot(a: number, b: number): number {
  return Math.sqrt(a * a + b * b);
}

export function hypot2(a: number, b: number): number {
  return a * a + b * b;
}

export function sign(x: number): number {
  return x === 0 ? 0 : x < 0 ? -1 : 1;
}

export function clamp(min: number, max: number, x: number): number {
  if (x < min) return min;
  if (x > max) return max;
  return x;
}

export function randomInt(low: number, high: number): number {
  const _G_math = (globalThis as any).math as {
    random: (this: void, low: number, high: number) => number;
  };
  return _G_math.random(low, high);
}

export function seedRandom(seed: number): void {
  const _G_math = (globalThis as any).math as {
    randomseed: (this: void, seed: number) => number;
  };
  _G_math.randomseed(seed);
}
