import { globals } from 'common/globals';
import { Form } from 'common/gui/elements/form';
import { Frame } from 'common/gui/elements/frame';
import { GUI } from 'common/gui/gui';
import { OverlayLayout } from 'common/gui/layout/overlay_layout';
import { RadialLayout } from 'common/gui/layout/radial_layout';
import { RoundButton } from 'common/gui/round_button/round_button';
import { tex } from 'resource_id';

export type DenMenuProps = {
  onSelectSpawnMinion: () => void;
};

export const DenMenu = ({ onSelectSpawnMinion }: DenMenuProps) => (
  <Frame x={0.5} y={0.5} fixedContainer={true}>
    <Form name='denMenu'>
      <RadialLayout
        radius={globals.ui.veryLargeSize}
        startAngle={-Math.PI * 0.5}
        endAngle={Math.PI * 0.5}
      >
        <Item
          texture={tex('minion.png', '^[sheet:5x2:0,0')}
          onPress={onSelectSpawnMinion}
        />
      </RadialLayout>
    </Form>
  </Frame>
);

const Item = ({
  onPress,
  texture,
}: {
  onPress: () => void;
  texture: string;
}) => (
  <OverlayLayout align='left' vertAlign='top'>
    <RoundButton image={texture} onPress={onPress} closeOnPress />
  </OverlayLayout>
);
