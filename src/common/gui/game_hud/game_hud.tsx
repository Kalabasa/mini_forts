import { globals } from 'common/globals';
import { Frame } from 'common/gui/elements/frame';
import { Font } from 'common/gui/font/font';
import { GUI } from 'common/gui/gui';
import { GridLayout } from 'common/gui/layout/grid_layout';
import { tex } from 'resource_id';
import { Textures } from 'utils/texture_helper';

export type GameHUDProps = {
  wood: GUI.State<number>;
  stone: GUI.State<number>;
  metal: GUI.State<number>;
  spore: GUI.State<number>;
};

export const GameHUD = ({ wood, stone, metal, spore }: GameHUDProps) => (
  <Frame x={1} y={0} margin={globals.ui.tinySize}>
    <GridLayout columns={2} rows={4} gap={globals.ui.miniSize}>
      <ResourceImage texture={tex('wood_icon.png')} />
      <ResourceNumber number={wood} />
      <ResourceImage texture={tex('stone_icon.png')} />
      <ResourceNumber number={stone} />
      <ResourceImage texture={tex('metal_icon.png')} />
      <ResourceNumber number={metal} />
      <ResourceImage texture={tex('spore_icon.png')} />
      <ResourceNumber number={spore} />
    </GridLayout>
  </Frame>
);

const ResourceImage = ({ texture }: { texture: string }) => (
  <image
    texture={texture}
    scale={globals.ui.pixelScale}
    width={globals.ui.tinySize}
    height={globals.ui.tinySize}
  />
);

const ResourceNumber = ({ number }: { number: GUI.State<number> }) => {
  const numberTex = number.map((value) => {
    const numberType = Font.createNumberCombineParts(value);
    return `\
[combine:\
${numberType.width}x${numberType.height}:\
${numberType.parts
  .map((part) => `${part.x},${part.y}=${Textures.escape(part.texture)}`)
  .join(':')}\
`;
  });

  return (
    <image
      texture={numberTex}
      scale={globals.ui.pixelScale}
      width={globals.ui.mediumSize}
      height={globals.ui.tinySize}
    />
  );
};
