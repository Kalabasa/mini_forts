import { InteractionContext } from 'common/interaction/interaction_context';
import { Control, Player } from 'common/player/player';

export enum InteractionResult {
  Continue,
  Cancel,
  Apply,
}

export abstract class InteractionMode {
  abstract readonly options: {
    control: Control;
    canDrag?: boolean;
    autoRepeatInterval?: number;
  };

  constructor(
    protected readonly player: Player,
    protected readonly context: InteractionContext
  ) {}

  abstract getCursor(pointedNode: PointedNode): Vector3D;
  abstract canStart(cursor: Vector3D): boolean;
  abstract onStart(position: Vector3D): InteractionResult;
  abstract onUpdateRepeat(position: Vector3D): InteractionResult;
  abstract onUpdateDrag(start: Vector3D, end: Vector3D): InteractionResult;
  abstract onEnd(start: Vector3D, end: Vector3D): InteractionResult;
  abstract apply(start: Vector3D, end: Vector3D): void;
}
