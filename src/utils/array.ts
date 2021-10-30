export function createArray<T>(
  length: number,
  value: (i: number) => NonNullable<T>
): T[] {
  const arr: T[] = [];
  for (let i = 0; i < length; i++) {
    arr[i] = value(i);
  }
  return arr;
}
