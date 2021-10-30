const weakValuesMetatable = { __mode: 'v' };

export class WeakRef<T> {
  private readonly ref: { content: T };

  constructor(target: T) {
    const _G_setmetatable = (globalThis as any).setmetatable as <O>(
      this: void,
      table: O,
      metatable: object
    ) => O;
    this.ref = _G_setmetatable({ content: target }, weakValuesMetatable);
  }

  deref(): T | undefined {
    return this.ref.content;
  }
}

export class WeakValueMap<K extends keyof any, T> {
  private readonly map: Partial<Record<K, T>>;

  constructor() {
    const _G_setmetatable = (globalThis as any).setmetatable as <O>(
      this: void,
      table: O,
      metatable: object
    ) => O;
    this.map = _G_setmetatable({}, weakValuesMetatable);
  }

  set(key: K, value: T): void {
    this.map[key] = value;
  }

  get(key: K): T | undefined {
    return this.map[key];
  }
}
