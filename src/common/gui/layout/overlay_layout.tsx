import { Container } from 'common/gui/elements/container';
import { GUI } from 'common/gui/gui';

export type OverlayLayoutProps = {
  align?: 'left' | 'center' | 'right';
  vertAlign?: 'top' | 'middle' | 'bottom';
  children: GUI.Node[];
};

const horizAlignMap = {
  left: 0,
  center: 0.5,
  right: 1,
};

const vertAlignMap = {
  top: 0,
  middle: 0.5,
  bottom: 1,
};

export const OverlayLayout = ({
  align = 'left',
  vertAlign = 'top',
  children,
}: OverlayLayoutProps) => {
  let width = 0;
  let height = 0;

  for (const child of children) {
    width = Math.max(width, child.size.x);
    height = Math.max(height, child.size.y);
  }

  const alignX = horizAlignMap[align];
  const alignY = vertAlignMap[vertAlign];

  return (
    <container width={width} height={height}>
      {children.map((child) => {
        return (
          <Container
            x={(width - child.size.x) * alignX}
            y={(height - child.size.y) * alignY}
          >
            {child}
          </Container>
        );
      })}
    </container>
  );
};
