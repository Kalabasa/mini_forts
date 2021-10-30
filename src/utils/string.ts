export function stringGsub(str: string, find: string, replace: string): string {
  const _G_string = (globalThis as any).string as {
    gsub: (this: void, str: string, find: string, replace: string) => string;
  };
  return _G_string.gsub(str, find, replace);
}

export function toColorString(rgb: number): string {
  return rgb.toString(16).padStart(6, '0');
}
