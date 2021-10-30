export type Immutable<T> = T extends ImmutablePrimitive
  ? T
  : T extends Map<infer K, infer V>
  ? ImmutableMap<K, V>
  : T extends Set<infer M>
  ? ImmutableSet<M>
  : ImmutableObject<T>;

export type Mutable<T> = T extends ImmutablePrimitive
  ? T
  : T extends Map<infer K, infer V>
  ? Map<K, V>
  : T extends Set<infer M>
  ? Set<M>
  : MutableObject<T>;

type ImmutablePrimitive =
  | undefined
  | null
  | boolean
  | string
  | number
  | Function;

type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;
type ImmutableSet<T> = ReadonlySet<Immutable<T>>;
type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> };

type MutableObject<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
