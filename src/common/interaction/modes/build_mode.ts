import { BlockPhysics } from 'common/block/physics';
import { BlockTag } from 'common/block/tag';
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
  tex('build_preview_marker.png')
);

export class BuildMode extends InteractionMode {
  readonly options = {
    control: Control.Place,
    canDrag: true,
    autoRepeatInterval: 0.25,
  };

  getCursor(pointedNode: PointedNode) {
    return pointedNode.above;
  }

  canStart(cursor: Vector3D) {
    return (
      this.context.canAddGhost(cursor) &&
      (this.canBuildMulti() || this.canBuild(cursor))
    );
  }

  onStart(position: Vector3D) {
    return this.canBuildMulti()
      ? InteractionResult.Continue
      : InteractionResult.Apply;
  }

  onUpdateRepeat(position: Vector3D) {
    return InteractionResult.Apply;
  }

  onUpdateDrag(start: Vector3D, end: Vector3D) {
    if (!this.canBuildMulti()) {
      end = start;
    }

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
    let volume: Volume;
    if (this.canBuildMulti()) {
      volume = new Volume(...sortVectors(start, end));
    } else {
      if (!this.canBuild(start)) {
        // todo: "can't build" message
        return;
      }
      volume = new Volume(start, start);
    }

    this.context.addGhost(volume, this.player.getTool().name);
  }

  private canBuild(pos: Vector3D): boolean {
    const tool = this.player.getTool();
    return BlockPhysics.canSupport(tool, pos, true);
  }

  private canBuildMulti(): boolean {
    const tool = this.player.getTool();
    const buildStyle = BlockTag.get(tool, BlockTag.BuildStyle);
    return buildStyle === BlockTag.BuildStyleMulti;
  }
}
