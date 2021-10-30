import { formspecReset } from 'common/gui/formspec_reset';
import { GUI } from 'common/gui/gui';
import { Renderer } from 'common/gui/renderer';
import { Scaling } from 'common/gui/scaling';
import { deepEqual } from 'utils/deep_equals';
import { throwError } from 'utils/error';
import { Logger } from 'utils/logger';

const ZERO = { x: 0, y: 0 };

type HUDHandle = {
  id: number;
  cache: Partial<HudDefinition>;
  stateHooks: Function[];
  renderCount: number;
};

type FormHandle = {
  onPress?: () => void;
  closeOnPress: boolean;
  renderCount: number;
};

export class GUIEngine implements Renderer {
  private hudHandles = new Map<string, HUDHandle>();
  private formHandles = new Map<string, FormHandle>();

  private frameOrigin: Vector2D | undefined;

  private hudFrameOffset: Vector2D | undefined;

  private formName: string | undefined;
  private formRenderCount = -1;

  private formspecFrame:
    | {
        size: Vector2D;
        fixed: boolean;
        position: Vector2D;
        anchor: Vector2D;
      }
    | undefined;
  private formspecStyles: string[] = [];
  private formspecElements: string[] = [];

  private renderCount = 0;

  private hud2guiScaleFactor = Scaling.hud2guiFactor();

  constructor(
    private readonly api: {
      addHUD: (definition: HudDefinition) => number | undefined;
      removeHUD: (id: number) => void;
      changeHUD: (...params: Parameters<PlayerObject['hud_change']>) => void;
      showFormspec: (name: string, spec: string) => void;
    }
  ) {}

  cleanup(): void {
    this.render(undefined);
  }

  onReceiveFields(
    formName: string,
    fields: Record<string, string | undefined>
  ): boolean {
    if (this.formName !== formName) return false;

    let close = fields['quit'] === 'true';

    for (const [name, value] of Object.entries(fields)) {
      if (value) {
        const key = getFormHandleKey(formName, name);
        const handle = this.formHandles.get(key);
        handle?.onPress?.();
        close = close || (handle != undefined && handle.closeOnPress);
      }
    }

    if (close) {
      this.render(undefined);
    }

    return true;
  }

  render(node: GUI.Node | undefined) {
    this.renderCount++;

    this.formName = undefined;
    this.formRenderCount = -1;
    this.formspecFrame = undefined;
    this.formspecStyles = [];
    this.formspecElements = [];

    if (node) {
      this.renderNode([node], ZERO);
    }

    if (this.formName && this.formspecElements.length > 0) {
      const formspecItems = [
        formspecReset,
        ...this.formspecStyles,
        ...this.formspecElements,
      ];

      const size = this.toFormCoords(this.formspecFrame!.size);
      const { fixed, position, anchor } = this.formspecFrame!;
      const formspec = `\
formspec_version[4]
size[${size},${fixed ? 'true' : 'false'}]
position[${position.x},${position.x}]
anchor[${anchor.x},${anchor.y}]
real_coordinates[true]
${formspecItems.join('\n')}\
`;

      this.api.showFormspec(this.formName, formspec);

      Logger.trace('Test formspec shown!', this.formName);
      for (const line of formspec.split('\n')) {
        Logger.trace(line);
      }
    }

    for (const [key, handle] of this.hudHandles.entries()) {
      if (handle.renderCount < this.renderCount) {
        this.hudHandles.delete(key);
        this.onRemoveHUDElement(handle);
      }
    }

    for (const [key, handle] of this.formHandles.entries()) {
      if (handle.renderCount < this.renderCount) {
        this.formHandles.delete(key);
      }
    }
  }

  private renderNode(path: GUI.Node[], offset: Vector2D) {
    const node = path[path.length - 1];
    const { content } = node;
    // Logger.trace('renderNode', getPathString(path));
    // Logger.trace(offset, this.formName);
    // debug(node);

    if (GUI.hasType(content, 'container')) {
      this.renderContainer(path, content, offset);
    } else if (GUI.hasType(content, 'frame')) {
      this.renderFrame(path, content);
    } else if (GUI.hasType(content, 'form')) {
      this.renderForm(path, content, offset);
    } else if (GUI.hasType(content, 'image')) {
      this.renderImage(path, content, offset);
    } else if (GUI.hasType(content, 'text')) {
      this.renderText(path, content, offset);
    } else if (GUI.hasType(content, 'button')) {
      this.renderButton(path, content, offset);
    } else {
      throwError('Unrecognized element type:', content.type);
    }
  }
  private renderContainer(
    path: GUI.Node[],
    content: GUI.Content<'container'>,
    parentOffset: Vector2D
  ) {
    const node = path[path.length - 1];
    for (const child of content.childNodes) {
      this.renderNode(path.concat(child), add(parentOffset, node.position));
    }
  }

  private renderFrame(path: GUI.Node[], content: GUI.Content<'frame'>) {
    if (this.frameOrigin) {
      throwError('<frame> cannot be inside another <frame>!');
    }

    const node = path[path.length - 1];

    const frameOrigin = {
      x: content.props.x,
      y: content.props.y,
    };
    const anchor = {
      x: content.props.anchorX ?? content.props.x,
      y: content.props.anchorY ?? content.props.y,
    };

    this.frameOrigin = frameOrigin;
    this.hudFrameOffset = {
      x: node.size.x * -anchor.x,
      y: node.size.y * -anchor.y,
    };

    this.formspecFrame = {
      size: node.size,
      fixed: content.props.fixedContainer ?? false,
      position: frameOrigin,
      anchor,
    };

    for (const child of content.childNodes) {
      this.renderNode(path.concat(child), ZERO);
    }

    this.frameOrigin = undefined;
    this.hudFrameOffset = undefined;
  }

  private renderImage(
    path: GUI.Node[],
    content: GUI.Content<'image'>,
    parentOffset: Vector2D
  ) {
    this.checkFrame();

    const node = path[path.length - 1];

    const alignment = getHUDAlignment(content.props);
    const offset = add(
      this.hudFrameOffset!,
      parentOffset,
      node.position,
      boxAlign(alignment, node.size)
    );
    const textureState = GUI.State.fromValue(content.props.texture);

    this.updateHUDElement(
      path,
      {
        name: getPathString(path),
        hud_elem_type: 'image',
        position: this.frameOrigin!,
        alignment,
        offset,
        scale: { x: content.props.scale, y: content.props.scale },
        text: textureState.getValue(),
      },
      {
        text: textureState,
      }
    );
  }

  private renderForm(
    path: GUI.Node[],
    content: GUI.Content<'form'>,
    parentOffset: Vector2D
  ) {
    if (!this.formspecFrame) throwError('Missing <frame>!');

    if (this.formName && this.formRenderCount === this.renderCount) {
      throwError('Cannot have multiple <form>s in one render!');
    }

    if (!this.formspecFrame.fixed) {
      // Due to positioning and scaling issues, we need fixed=true for forms
      throwError(
        'A <form> can only appear inside a <frame> with fixedContainer=true'
      );
    }

    if (
      this.formspecFrame.position.x !== 0.5 ||
      this.formspecFrame.position.y !== 0.5 ||
      this.formspecFrame.anchor.x !== 0.5 ||
      this.formspecFrame.anchor.y !== 0.5
    ) {
      // Due to positioning and scaling issues, we need centered forms
      throwError('A <form> can only appear inside a <frame> that is centered');
    }

    this.formName = content.props.name;
    this.formRenderCount = this.renderCount;

    for (const child of content.childNodes) {
      this.renderNode(path.concat(child), parentOffset);
    }
  }

  private renderText(
    path: GUI.Node[],
    content: GUI.Content<'text'>,
    parentOffset: Vector2D
  ) {
    this.checkFrame();

    const node = path[path.length - 1];

    const alignment = getHUDAlignment(content.props);
    const offset = add(
      this.hudFrameOffset!,
      parentOffset,
      node.position,
      boxAlign(alignment, node.size)
    );
    const textState = GUI.State.fromValue(content.props.children[0]).map(
      (v) => v?.toString() ?? ''
    );

    this.updateHUDElement(
      path,
      {
        name: getPathString(path),
        hud_elem_type: 'text',
        position: this.frameOrigin!,
        alignment,
        offset,
        scale: node.size,
        number: content.props.color,
        size: { x: content.props.fontSize },
        text: textState.getValue(),
      },
      {
        text: textState,
      }
    );
  }

  private renderButton(
    path: GUI.Node[],
    content: GUI.Content<'button'>,
    parentOffset: Vector2D
  ) {
    if (!this.checkFormFirstRender()) return;

    const node = path[path.length - 1];
    const pathString = minetest.formspec_escape(getPathString(path));

    const pos = this.toFormCoords(add(parentOffset, node.position));
    const size = this.toFormCoords(node.size);

    const {
      closeOnPress,
      onPress,
      image,
      padding,
      background,
      backgroundHovered,
      backgroundPressed,
    } = content.props;

    // const child = GUI.Children.single(props.children);
    // const label = child
    //   ? minetest.formspec_escape(GUI.State.getValue(child)?.toString() ?? '')
    //   : '';

    const element = closeOnPress ? 'image_button_exit' : 'image_button';

    this.formspecElements.push(`${element}[${pos};${size};;${pathString};]`);
    this.formspecStyles.push(
      style(pathString, {
        bgcolor: background && '',
        fgimg: image,
        bgimg: background,
        padding: padding, // todo: scale
      })
    );
    if (backgroundHovered) {
      this.formspecStyles.push(
        style(pathString + ':hovered', { bgimg: backgroundHovered })
      );
    }
    if (backgroundPressed) {
      this.formspecStyles.push(
        style(pathString + ':pressed', { bgimg: backgroundPressed })
      );
    }

    const handleKey = getFormHandleKey(this.formName!, pathString);
    let handle = this.formHandles.get(handleKey);
    if (handle === undefined) {
      handle = {
        closeOnPress: closeOnPress ?? false,
        onPress: onPress,
        renderCount: this.renderCount,
      };
      this.formHandles.set(handleKey, handle);
    }
  }

  private updateHUDElement(
    path: GUI.Node[],
    def: HudDefinition,
    dynamicDef?: { [K in keyof HudDefinition]?: GUI.State<HudDefinition[K]> }
  ) {
    const pathString = getPathString(path);
    const handle = this.hudHandles.get(pathString);
    if (handle === undefined) {
      const id = this.api.addHUD(def);
      if (!id) throwError("Can't add HUD element!");

      const newHandle: HUDHandle = {
        id,
        cache: def,
        renderCount: this.renderCount,
        stateHooks: [],
      };

      if (dynamicDef) {
        for (const [key, state] of Object.entries(dynamicDef)) {
          const onChange = () => {
            if (this.hudHandles.get(pathString) === newHandle) {
              this.api.changeHUD(id, key as any, state.getValue() as any);
            }
          };
          newHandle.stateHooks.push(onChange);
          state.onChange(onChange);
        }
      }

      this.hudHandles.set(pathString, newHandle);
    } else {
      for (const [key, value] of Object.entries(def)) {
        if (!deepEqual(value, handle.cache[key])) {
          handle.cache[key] = value;
          handle.renderCount = this.renderCount;
          this.api.changeHUD(handle.id, key as any, value as any);
        }
      }
    }
  }

  private onRemoveHUDElement(handle: HUDHandle) {
    handle.stateHooks = [];
    this.api.removeHUD(handle.id);
  }

  private checkFrame() {
    if (!this.frameOrigin || !this.hudFrameOffset) {
      throwError("Can't render elements outside a <frame>!");
    }
  }

  private checkFormFirstRender(): boolean {
    if (!this.formName) {
      throwError("Can't render form elements outside a <form>!");
    }

    return this.formRenderCount === this.renderCount;
  }

  private toFormCoords(coordinates: Vector2D): string {
    return `${this.toFormUnits(coordinates.x)},${this.toFormUnits(
      coordinates.y
    )}`;
  }

  private toFormUnits(units: number): number {
    return Math.round(units * this.hud2guiScaleFactor * 10) / 10;
  }
}

function style(
  name: string,
  properties: Record<string, string | boolean | number | undefined>
): string {
  return `style[${name};${Object.entries(properties)
    .filter(([k, v]) => v)
    .map(([k, v]) => `${k}=${minetest.formspec_escape(v!.toString())}`)
    .join(';')}]`;
}

const horizAlignmentMap = {
  left: 1,
  center: 0,
  right: -1,
};

const vertAlignmentMap = {
  top: 1,
  middle: 0,
  bottom: -1,
};

function getHUDAlignment({
  align,
  vertAlign,
}: {
  align?: 'left' | 'center' | 'right';
  vertAlign?: 'top' | 'middle' | 'bottom';
}): Vector2D {
  return {
    x: horizAlignmentMap[align ?? 'left'],
    y: vertAlignmentMap[vertAlign ?? 'top'],
  };
}

function boxAlign(
  hudAlignment: Vector2D,
  size: Vector2D,
  childSize?: Vector2D
): Vector2D {
  return {
    x: (1 - hudAlignment.x) * 0.5 * (size.x - (childSize?.x ?? 0)),
    y: (1 - hudAlignment.y) * 0.5 * (size.y - (childSize?.y ?? 0)),
  };
}

function add(
  a: Vector2D,
  b: Vector2D,
  c: Vector2D = ZERO,
  d: Vector2D = ZERO
): Vector2D {
  return {
    x: a.x + b.x + c.x + d.x,
    y: a.y + b.y + c.y + d.y,
  };
}

function getPathString(path: GUI.Node[]): string {
  return path.map((n) => n.key ?? '').join('.');
}

function getFormHandleKey(formName: string, fieldName: string): string {
  return `${formName}:${fieldName}`;
}

function debug(
  node: GUI.Node,
  firstPrefix: string = '╶── ',
  restPrefix: string = '    '
) {
  Logger.trace(firstPrefix + 'type:', node.content.type);
  Logger.trace(restPrefix + 'key:', node.key);
  Logger.trace(restPrefix + 'layout:', node.position, node.size);
  const { children, ...props } = node.content.props as any;
  Logger.trace(restPrefix + 'props:', props);
  if (node.content.childNodes.length > 0) {
    Logger.trace(restPrefix + 'childNodes:');
    const childNodes = node.content.childNodes;
    for (const [index, child] of childNodes.entries()) {
      const isLast = index === childNodes.length - 1;
      const childFirstPrefix = isLast ? '└── ' : '├── ';
      const childRestPrefix = isLast ? '    ' : '│   ';
      debug(child, restPrefix + childFirstPrefix, restPrefix + childRestPrefix);
    }
  } else if (children) {
    Logger.trace(restPrefix + 'props.children:', children);
  }
}
