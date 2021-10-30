import { tex } from 'resource_id';
import { floorDiv } from 'utils/math';

export const Font = {
  createNumberCombineParts,
};

const digitsPng = {
  default: 'font_digits.png',
  red: 'font_red_digits.png',
};

const digitWidth = 6;
const digitHeight = 8;

function createNumberCombineParts(
  number: number,
  style: 'default' | 'red' = 'default'
): {
  parts: { x: number; y: number; texture: string }[];
  width: number;
  height: number;
} {
  const png = digitsPng[style];

  const digitTextures: string[] = [];

  let left = number;
  do {
    const digit = left % 10;
    const texture = getDigitTexture(png, digit);
    digitTextures.push(texture);
    left = floorDiv(left, 10);
  } while (left > 0);

  const width = digitTextures.length * digitWidth;
  const height = digitHeight;

  const parts = digitTextures.map((texture, index) => {
    const x = (digitTextures.length - index - 1) * (digitWidth - 1);
    return { x, y: 0, texture };
  });

  return {
    parts,
    width,
    height,
  };
}

function getDigitTexture(png: string, digit: number): string {
  return tex(png, `^[sheet:10x1:${digit},0`);
}
