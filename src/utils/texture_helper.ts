import { stringGsub } from 'utils/string';

export const Textures = {
  escape,
  crop,
};

function escape(texture: string): string {
  let escaped = texture;
  escaped = stringGsub(escaped, '%^', '\\^');
  escaped = stringGsub(escaped, '%:', '\\:');
  return escaped;
}

function crop(texture: string, start: Vector2D, end: Vector2D): string {
  const base = escape(texture);
  return `([combine:${end.x - start.x}x${
    end.y - start.y
  }:${-start.x},${-start.y}=${base})`;
}
