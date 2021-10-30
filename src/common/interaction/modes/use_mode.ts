import {
  InteractionMode,
  InteractionResult,
} from 'common/interaction/interaction_mode';
import { Control } from 'common/player/player';

export class UseMode extends InteractionMode {
  readonly options = {
    control: Control.Aux1,
  };

  getCursor(pointedNode: PointedNode) {
    return pointedNode.under;
  }

  canStart(cursor: Vector3D) {
    return true;
  }

  onStart(position: Vector3D) {
    return InteractionResult.Apply;
  }

  onUpdateRepeat(position: Vector3D) {
    return InteractionResult.Cancel;
  }

  onUpdateDrag(start: Vector3D, end: Vector3D) {
    return InteractionResult.Cancel;
  }

  onEnd(position: Vector3D) {
    return InteractionResult.Cancel;
  }

  apply(start: Vector3D, end: Vector3D): void {
    this.context.use(start);
  }
}
