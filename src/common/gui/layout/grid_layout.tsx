import { GUI } from 'common/gui/gui';
import { createArray } from 'utils/array';
import { throwError } from 'utils/error';
import { floorDiv } from 'utils/math';

export type GridLayoutProps = {
  columns?: number;
  rows?: number;
  gap?: number;
  gapX?: number;
  gapY?: number;
  alignH?: 'left' | 'center' | 'right';
  alignV?: 'top' | 'middle' | 'bottom';
  children: GUI.Node[];
};

const hAnchorMap = {
  left: 0,
  center: 0.5,
  right: 1,
};

const vAnchorMap = {
  top: 0,
  middle: 0.5,
  bottom: 1,
};

export const GridLayout = ({
  columns = 1,
  rows = 1,
  gap = 0,
  gapX = gap,
  gapY = gap,
  alignH = 'left',
  alignV = 'middle',
  children,
}: GridLayoutProps) => {
  if (children.length > columns * rows) throwError('Too many children!');

  const anchorX = hAnchorMap[alignH];
  const anchorY = vAnchorMap[alignV];

  let columnSizes = createArray(columns, () => 0);
  let rowSizes = createArray(rows, () => 0);

  for (const [index, child] of children.entries()) {
    const c = index % columns;
    const r = floorDiv(index, columns);
    if (columnSizes[c] < child.size.x) columnSizes[c] = child.size.x;
    if (rowSizes[r] < child.size.y) rowSizes[r] = child.size.y;
  }

  const totalWidth =
    columnSizes.reduce((sum, current) => sum + current) + (columns - 1) * gapX;
  const totalHeight =
    rowSizes.reduce((sum, current) => sum + current) + (rows - 1) * gapY;

  let x = 0;
  let y = 0;
  return (
    <container width={totalWidth} height={totalHeight}>
      {children.map((child, index) => {
        const colWidth = columnSizes[index % columns];
        const rowHeight = rowSizes[floorDiv(index, columns)];

        const cell = (
          <container
            key={child.key}
            x={x + anchorX * (colWidth - child.size.x)}
            y={y + anchorY * (rowHeight - child.size.y)}
            width={colWidth}
            height={rowHeight}
          >
            {child}
          </container>
        );

        x += colWidth + gapX;
        if ((index + 1) % columns === 0) {
          x = 0;
          y += rowHeight + gapY;
        }

        return cell;
      })}
    </container>
  );
};
