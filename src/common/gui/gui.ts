import { throwError } from 'utils/error';
import { Logger } from 'utils/logger';
import { WeakRef } from 'utils/weak_ref';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      fragment: {
        children?: Children;
      };
      frame: {
        x: number;
        y: number;
        anchorX: number;
        anchorY: number;
        width: number;
        height: number;
        fixedContainer?: boolean;
        children?: Children;
      };
      container: IntrinsicElementProps & {
        children?: Children;
      };
      form: {
        name: string;
        children?: Children;
      };
      text: IntrinsicElementProps &
        RealElementProps & {
          color: number;
          fontSize: number;
          children: GUI.Value<Primitive>;
        };
      image: IntrinsicElementProps &
        RealElementProps & { texture: GUI.Value<string>; scale: number };
      button: IntrinsicElementProps &
        RealElementProps & {
          image?: string;
          background?: string;
          backgroundHovered?: string;
          backgroundPressed?: string;
          padding?: number;
          onPress?: () => void;
          closeOnPress?: boolean;
        };
    }
    interface ElementChildrenAttribute {
      children: never;
    }
  }
}

type IntrinsicElementProps = {
  key?: string;
  x?: number;
  y?: number;
  width: number;
  height: number;
};
type RealElementProps = {
  align?: 'left' | 'center' | 'right';
  vertAlign?: 'top' | 'middle' | 'bottom';
};

type Primitive = string | number | boolean | undefined;
type Children = Primitive | GUI.Node | Children[];

export namespace GUI {
  export type Component<T extends object | void = void> = {
    (props: T): Node;
  };

  export type Value<T> = T | State<T>;

  export type State<T> = {
    getValue(): T;
    map<U>(mapper: (value: T) => U): State<U>;
    onChange(callback: () => void);
  };

  export type Node = {
    key?: string;
    position: Vector2D;
    size: Vector2D;
    content: Content;
  };

  export type Content<
    Type extends keyof JSX.IntrinsicElements = keyof JSX.IntrinsicElements
  > = {
    type: Type;
    props: JSX.IntrinsicElements[Type] extends { children?: infer C }
      ? Omit<JSX.IntrinsicElements[Type], 'children'> & {
          children: C extends Array<any> ? C : C[];
        }
      : JSX.IntrinsicElements[Type];
    childNodes: GUI.Node[];
  };

  export function hasType<Type extends keyof JSX.IntrinsicElements>(
    content: Content,
    type: Type
  ): content is Content<Type> {
    return content.type === type;
  }

  export function factory<Type extends keyof JSX.IntrinsicElements>(
    component: Type,
    props?: JSX.IntrinsicElements[Type],
    ...children: Children[]
  ): Node;
  export function factory<Props extends object>(
    component: Component<Props>,
    props?: Props,
    ...children: Children[]
  ): Node;
  export function factory(
    component: keyof JSX.IntrinsicElements | Component<any>,
    props?: JSX.IntrinsicElements[keyof JSX.IntrinsicElements] &
      Partial<IntrinsicElementProps & RealElementProps> &
      object,
    ...children: Children[]
  ): Node {
    props = { ...props };

    if (children) {
      (props as any).children = children;
    }

    if (typeof component === 'function') {
      return component(props);
    }

    const content: Content<typeof component> = {
      type: component,
      props,
      childNodes: createChildNodes(children),
    };

    return {
      position: {
        x: props.x ?? 0,
        y: props.y ?? 0,
      },
      size: {
        x: props.width ?? 0,
        y: props.height ?? 0,
      },
      key: props.key,
      content,
    };
  }

  export const fragmentFactory = 'fragment';

  function createChildNodes(children: Children[]): Node[] {
    let nodes: Node[] = [];

    for (const child of children) {
      if (typeof child === 'object') {
        if ('content' in child) {
          if (child.content.type === 'fragment') {
            nodes.push(...child.content.childNodes);
          } else {
            nodes.push(child);
          }
        } else {
          nodes.push(...createChildNodes(child));
        }
      } else {
        // ignore primitives
        // primitive children should've been already absorbed as props
      }
    }

    for (const [index, node] of nodes.entries()) {
      if (!node.key) {
        node.key = autoGenerateChildKey(node, index);
      }
    }

    return nodes;
  }

  export interface MutableState<T> extends GUI.State<T> {
    setValue(value: T): void;
  }
}

export namespace GUI.Children {
  export function single<T>(
    children: T | (T & Array<any>)
  ): T extends Array<infer E> ? E | undefined : never {
    if (!Array.isArray(children)) {
      throwError('Children not an array!', children);
    }
    if (children.length > 1) {
      throwError(
        'Single child expected but multiple children detected!',
        children.length
      );
    }
    return children[0];
  }
}

export namespace GUI.State {
  export function fromValue<T>(value: GUI.Value<T>): GUI.State<T> {
    return value && 'getValue' in value ? value : createConstant(value);
  }

  export function getValue<T>(value: GUI.Value<T>): T {
    return value && 'getValue' in value ? value.getValue() : value;
  }

  export function createConstant<T>(value: T): GUI.State<T> {
    const state: GUI.State<T> = {
      getValue() {
        return value;
      },
      map(mapper) {
        return createMapper(state, mapper);
      },
      onChange() {},
    };
    return state;
  }

  export function createMutableState<T>(initialValue: T): GUI.MutableState<T> {
    let value = initialValue;
    const callbacks: WeakRef<Function>[] = [];

    return {
      getValue() {
        return value;
      },
      setValue(newValue) {
        value = newValue;
        for (const callback of callbacks) callback.deref()?.();
      },
      map(mapper) {
        return createMapper(this, mapper);
      },
      onChange(callback) {
        callbacks.push(new WeakRef(callback));
      },
    };
  }

  function createMapper<T, U>(
    state: GUI.State<T>,
    mapper: (value: T) => U
  ): GUI.State<U> {
    return {
      getValue() {
        return mapper(state.getValue());
      },
      map(mapper) {
        return createMapper(this, mapper);
      },
      onChange(callback) {
        state.onChange(callback);
      },
    };
  }
}

const keyForType: Record<keyof JSX.IntrinsicElements, string> = {
  button: 'b',
  container: 'c',
  form: 'q',
  fragment: '', // not used
  frame: 'f',
  image: 'i',
  text: 't',
};

function autoGenerateChildKey(
  node: GUI.Node,
  index: number
): string | undefined {
  return keyForType[node.content.type] + index.toString();
}
