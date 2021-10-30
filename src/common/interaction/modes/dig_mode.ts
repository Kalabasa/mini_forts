import {
  InteractionMode,
  InteractionResult,
} from 'common/interaction/interaction_mode';
import {
  BuildPreviewParticle,
  previewTTL,
} from 'common/particles/build_prevew/build_preview';
import { Control } from 'common/player/player';
import { tex } from 'resource_id';
import { sortVectors } from 'utils/math';
import { Volume } from 'utils/space';

const previewParticle = BuildPreviewParticle.createParticle(
  tex('dig_preview_marker.png')
);

export class DigMode extends InteractionMode {
  readonly options = {
    control: Control.Dig,
    canDrag: true,
    autoRepeatInterval: 0.033,
  };

  getCursor(pointedNode: PointedNode) {
    return pointedNode.under;
  }

  canStart(cursor: Vector3D) {
    return true;
  }

  onStart(position: Vector3D) {
    return InteractionResult.Continue;
  }

  onUpdateRepeat(position: Vector3D) {
    return InteractionResult.Apply;
  }

  onUpdateDrag(start: Vector3D, end: Vector3D) {
    BuildPreviewParticle.addBox(
      this.player,
      previewParticle,
      previewTTL,
      start,
      end
    );
    return InteractionResult.Continue;
  }

  onEnd(start: Vector3D, end: Vector3D) {
    return InteractionResult.Apply;
  }

  apply(start: Vector3D, end: Vector3D): void {
    this.context.markDig(new Volume(...sortVectors(start, end)));
  }
}
