import { globals } from 'common/globals';
import { GUI } from 'common/gui/gui';
import { tex } from 'resource_id';

export type RoundButtonProps = {
  image: string;
  onPress?: () => void;
  closeOnPress?: boolean;
};

const [normalTexture, hoveredTexture, pressedTexture] = getButtonTextures(
  tex('round_button.png')
);

export const RoundButton = ({
  image,
  onPress,
  closeOnPress,
}: RoundButtonProps) => (
  <button
    width={globals.ui.largeSize}
    height={globals.ui.largeSize}
    image={image}
    background={normalTexture}
    backgroundHovered={hoveredTexture}
    backgroundPressed={pressedTexture}
    padding={globals.ui.tinySize}
    onPress={onPress}
    closeOnPress={closeOnPress}
  />
);

function getButtonTextures(baseTexture: string): [string, string, string] {
  return [
    `${baseTexture}^[sheet:3x1:0,0]`,
    `${baseTexture}^[sheet:3x1:1,0]`,
    `${baseTexture}^[sheet:3x1:2,0]`,
  ];
}
