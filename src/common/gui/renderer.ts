import { GUI } from 'common/gui/gui';

export interface Renderer {
  render(node: GUI.Node | undefined): void;
  onReceiveFields: (
    formName: string,
    fields: Record<string, string | undefined>
  ) => boolean;
  cleanup(): void;
}
