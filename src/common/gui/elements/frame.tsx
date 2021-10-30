import { GUI } from 'common/gui/gui';

export type FrameProps = {
  x: number;
  y: number;
  anchorX?: number;
  anchorY?: number;
  margin?: number;
  fixedContainer?: boolean;
  children: GUI.Node[];
};

export const Frame = ({
  x,
  y,
  anchorX,
  anchorY,
  margin = 0,
  fixedContainer,
  children,
}: FrameProps) => {
  let width = 0;
  let height = 0;

  for (const child of children) {
    width = Math.max(width, child.position.x + child.size.x);
    height = Math.max(height, child.position.y + child.size.y);
  }

  return (
    <frame
      x={x}
      y={y}
      anchorX={anchorX ?? x}
      anchorY={anchorY ?? y}
      width={width + margin * 2}
      height={height + margin * 2}
      fixedContainer={fixedContainer}
    >
      <container x={margin} y={margin} width={width} height={height}>
        {children}
      </container>
    </frame>
  );
};
