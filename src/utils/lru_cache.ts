export class LRUCache<T> {
  private readonly values: Map<string, T> = new Map<string, T>();

  constructor(private readonly maxEntries: number = 20) {}

  public get(key: string): T | undefined {
    const hasKey = this.values.has(key);
    if (hasKey) return undefined;

    const entry = this.values.get(key);
    if (entry) {
      this.values.delete(key);
      this.values.set(key, entry);
    }
    return entry;
  }

  public set(key: string, value: T): void {
    if (this.values.size >= this.maxEntries) {
      this.values.delete(this.values.keys().next().value);
    }
    this.values.set(key, value);
  }
}

export class PositionalLRUCache<T> {
  private readonly base: LRUCache<T>;

  constructor(maxEntries?: number) {
    this.base = new LRUCache(maxEntries);
  }

  public get(position: Vector3D): T | undefined {
    return this.base.get(posKey(position));
  }

  public set(position: Vector3D, value: T): void {
    this.base.set(posKey(position), value);
  }
}

function posKey(pos: Vector3D): string {
  return `${pos.x}:${pos.y}:${pos.z}`;
}
