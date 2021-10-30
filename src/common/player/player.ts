export enum Control {
  Up,
  Down,
  Left,
  Right,
  Jump,
  Aux1,
  Sneak,
  Dig,
  Place,
  Zoom,
}

export interface Player {
  getName(): string;
  getTool(): ItemDefinition;
  getPosition(): Vector3D;
  getEyePosition(): Vector3D;
  getLookDir(): Vector3D;
  getControl(control: Control): boolean;
}
