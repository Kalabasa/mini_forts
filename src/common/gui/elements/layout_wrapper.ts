import { GUI } from 'common/gui/gui';

// Create a component that wraps a base element with layout that considers child sizes to calculate its own bounds
export function createLayoutWrapperComponent<
  T extends keyof JSX.IntrinsicElements
>(
  type: T
): (props: Omit<JSX.IntrinsicElements[T], 'width' | 'height'>) => GUI.Node {
  return (props) => {
    const { children, ...elementProps } = props as any;
    let width = 0;
    let height = 0;

    for (const child of children) {
      width = Math.max(width, child.position.x + child.size.x);
      height = Math.max(height, child.position.y + child.size.y);
    }

    return GUI.factory(type, { width, height, ...elementProps }, ...children);
  };
}
