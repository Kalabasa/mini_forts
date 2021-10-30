export interface Autotile {
  getName(adjacencyMap: AdjacencyMap): string;
  makeTiles(): Map<string, Tiles>;
  makeInventoryImage(): string;
}

// x-:west, x+:east, z-:south, z+:north
export type AdjacencyMap = {
  'x-': boolean;
  'x+': boolean;
  'y-': boolean;
  'y+': boolean;
  'z-': boolean;
  'z+': boolean;
  'x-y-': boolean;
  'x-y+': boolean;
  'x+y-': boolean;
  'x+y+': boolean;
  'x-z-': boolean;
  'x-z+': boolean;
  'x+z-': boolean;
  'x+z+': boolean;
  'y-z-': boolean;
  'y-z+': boolean;
  'y+z-': boolean;
  'y+z+': boolean;
};

export type Tiles = [string, string, string, string, string, string];

export const Autotile = {
  adjacencyOffsets: [
    { x: -1, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 0, z: -1 },
    { x: 0, y: 0, z: 1 },
    { x: -1, y: -1, z: 0 },
    { x: -1, y: 1, z: 0 },
    { x: 1, y: -1, z: 0 },
    { x: 1, y: 1, z: 0 },
    { x: -1, y: 0, z: -1 },
    { x: -1, y: 0, z: 1 },
    { x: 1, y: 0, z: -1 },
    { x: 1, y: 0, z: 1 },
    { x: 0, y: -1, z: -1 },
    { x: 0, y: -1, z: 1 },
    { x: 0, y: 1, z: -1 },
    { x: 0, y: 1, z: 1 },
  ],
  computeAdjacencyMap,
};

function computeAdjacencyMap(
  center: Vector3D,
  neighbors: Vector3D[]
): AdjacencyMap {
  const map = createAdjacencyMap();
  let rel = vector.new(0, 0, 0);
  for (const pos of neighbors) {
    rel.x = pos.x - center.x;
    rel.y = pos.y - center.y;
    rel.z = pos.z - center.z;
    if (
      rel.x >= -1 &&
      rel.x <= 1 &&
      rel.y >= -1 &&
      rel.y <= 1 &&
      rel.z >= -1 &&
      rel.z <= 1
    ) {
      const w = rel.x === -1;
      const e = rel.x === 1;
      const d = rel.y === -1;
      const u = rel.y === 1;
      const s = rel.z === -1;
      const n = rel.z === 1;
      map['x-'] ||= w && !d && !u && !s && !n;
      map['x+'] ||= e && !d && !u && !s && !n;
      map['y-'] ||= d && !w && !e && !s && !n;
      map['y+'] ||= u && !w && !e && !s && !n;
      map['z-'] ||= s && !w && !e && !d && !u;
      map['z+'] ||= n && !w && !e && !d && !u;
      map['x-y-'] ||= w && d && !s && !n;
      map['x-y+'] ||= w && u && !s && !n;
      map['x+y-'] ||= e && d && !s && !n;
      map['x+y+'] ||= e && u && !s && !n;
      map['x-z-'] ||= w && s && !d && !u;
      map['x-z+'] ||= w && n && !d && !u;
      map['x+z-'] ||= e && s && !d && !u;
      map['x+z+'] ||= e && n && !d && !u;
      map['y-z-'] ||= d && s && !w && !e;
      map['y-z+'] ||= d && n && !w && !e;
      map['y+z-'] ||= u && s && !w && !e;
      map['y+z+'] ||= u && n && !w && !e;
    }
  }
  return map;
}

function createAdjacencyMap(): AdjacencyMap {
  return {
    'x-': false,
    'x+': false,
    'y-': false,
    'y+': false,
    'z-': false,
    'z+': false,
    'x-y-': false,
    'x-y+': false,
    'x+y-': false,
    'x+y+': false,
    'x-z-': false,
    'x-z+': false,
    'x+z-': false,
    'x+z+': false,
    'y-z-': false,
    'y-z+': false,
    'y+z-': false,
    'y+z+': false,
  };
}
