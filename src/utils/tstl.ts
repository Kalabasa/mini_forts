// TSTL bugs when using conditional type as return value
// So this is a hacky workaround
export function predicate<T, K extends T>(
  fn: (this: void, item: T) => item is K
): (this: void, item: T) => item is K {
  return function (this: never, item: T): item is K {
    return fn(item);
  } as unknown as (this: void, item: T) => item is K;
}
