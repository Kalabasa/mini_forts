import { GUI } from 'common/gui/gui';
import { lerp } from 'utils/math';

export type RadialLayoutProps = {
  radius: number;
  startAngle: number;
  endAngle: number;
  children: GUI.Node[];
};

export const RadialLayout = ({
  radius,
  startAngle,
  endAngle,
  children,
}: RadialLayoutProps) => {
  let childTop = 0;
  let childBottom = 0;
  let childLeft = 0;
  let childRight = 0;

  let positions: Vector2D[] = [];

  const length = children.length;
  children.forEach((child, index) => {
    const angle = lerp(
      startAngle,
      endAngle,
      length <= 1 ? 0.5 : index / (length - 1)
    );

    const x = Math.sin(angle) * radius;
    const y = -Math.cos(angle) * radius;

    childLeft = Math.min(childLeft, child.position.x);
    childTop = Math.min(childTop, child.position.y);
    childRight = Math.max(childRight, child.position.x + child.size.x);
    childBottom = Math.max(childBottom, child.position.y + child.size.y);

    positions.push({ x, y });
  });

  return (
    <container
      width={radius * 2 + (childRight - childLeft)}
      height={radius * 2 + (childBottom - childTop)}
    >
      {children.map((child, index) => {
        const pos = positions[index];
        return (
          <container
            x={pos.x - childLeft + radius}
            y={pos.y - childTop + radius}
            width={child.position.x + child.size.x}
            height={child.position.y + child.size.y}
          >
            {child}
          </container>
        );
      })}
    </container>
  );
};
