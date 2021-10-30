export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  for (const key of Object.keys(a)) {
    if (!deepEqual(a[key], b[key])) return false;
  }

  for (const key of Object.keys(b)) {
    if (!(key in a)) return false;
  }

  return true;
}
