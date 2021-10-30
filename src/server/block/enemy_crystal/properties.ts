import { tex } from 'resource_id';
import { BlockProperties } from 'server/block/block';
import { createArray } from 'utils/array';
import { Textures } from 'utils/texture_helper';

const sheetTexMod = 'sheet:2x33';
const escapedSheetTexMod = Textures.escape(sheetTexMod);

const [topTile, sideTile, side2Tile] = makeTileSet('enemy_crystal.png');

export class EnemyCrystalProperties extends BlockProperties {
  nodeDefinition = this.defineNode({
    collision_box: {
      type: 'fixed',
      fixed: [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5],
    },
    selection_box: {
      type: 'fixed',
      fixed: [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5],
    },
    paramtype: 'light',
    drawtype: 'nodebox',
    node_box: {
      type: 'fixed',
      fixed: [
        [-5 / 16, -8 / 16, -5 / 16, 5 / 16, 8 / 16, 5 / 16],
        [-8 / 16, -8 / 16, -8 / 16, -2 / 16, 3 / 16, -2 / 16],
        [2 / 16, -8 / 16, 2 / 16, 8 / 16, 3 / 16, 8 / 16],
        [-7 / 16, -8 / 16, 7 / 16, -2 / 16, 2 / 16, 2 / 16],
        [2 / 16, -8 / 16, -2 / 16, 7 / 16, 2 / 16, -7 / 16],
      ],
    },
    use_texture_alpha: 'clip',
    tiles: [topTile, topTile, side2Tile, side2Tile, sideTile, sideTile],
    light_source: 15,
  });
}

function makeTileSet(png) {
  const texture = tex(png);

  const topTexture = tex(png, `^[${sheetTexMod}:0,0`);
  const sideTexture = tex(png, `^[${sheetTexMod}:1,0`);
  const side2Texture = tex(png, `^[${sheetTexMod}:1,0`, '^[transformFX');

  const topAnimTex = makeAnimTex(texture, topTexture, 1, 0, 32);
  const sideAnimTex = makeAnimTex(texture, sideTexture, 1, 1, 32);
  const side2AnimTex = makeAnimTex(
    texture + '^[transformFX',
    side2Texture,
    1,
    0,
    32
  );

  const topTile = {
    name: topAnimTex,
    animation: {
      type: 'vertical_frames',
      aspect_w: 16,
      aspect_h: 16,
      length: 2,
    },
  } as const;

  const sideTile = {
    name: sideAnimTex,
    animation: {
      type: 'vertical_frames',
      aspect_w: 16,
      aspect_h: 16,
      length: 2,
    },
  } as const;

  const side2Tile = {
    name: side2AnimTex,
    animation: {
      type: 'vertical_frames',
      aspect_w: 16,
      aspect_h: 16,
      length: 2,
    },
  } as const;

  return [topTile, sideTile, side2Tile];
}

function makeAnimTex(
  texture: string,
  base: string,
  rowStart: number,
  column: number,
  frames: number
): string {
  const escapedTexture = Textures.escape(texture);
  const escapedBase = Textures.escape(base);
  const width = 16;
  const height = frames * 16;
  const frameNumbers = createArray(frames, (i) => i);
  return (
    `[combine:${width}x${height}:` +
    frameNumbers
      .map((n) => {
        const row = rowStart + n;
        const coords = `${0},${n * 16}`;
        const part = `${escapedBase}\\^(${escapedTexture}\\^[makealpha\\:255,0,255\\^[${escapedSheetTexMod}\\:${column},${row})`;
        return coords + '=' + part;
      })
      .join(':')
  );
}
