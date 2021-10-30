import { BlockTag } from 'common/block/tag';
import { globals } from 'common/globals';
import { InteractionContext } from 'common/interaction/interaction_context';
import {
  InteractionMode,
  InteractionResult,
} from 'common/interaction/interaction_mode';
import { BuildMode } from 'common/interaction/modes/build_mode';
import { DigMode } from 'common/interaction/modes/dig_mode';
import { UnbuildMode } from 'common/interaction/modes/unbuild_mode';
import { UndigMode } from 'common/interaction/modes/undig_mode';
import { UseMode } from 'common/interaction/modes/use_mode';
import { Control, Player } from 'common/player/player';
import { throwError } from 'utils/error';
import { Logger } from 'utils/logger';
import { equalVectors } from 'utils/math';
import { CountdownTimer } from 'utils/timer';

export type InteractionConfig = {
  disableUse: boolean;
  disableDrop: boolean;
  disablePlace: boolean;
  disableDig: boolean;
  enableDrag: boolean;
  enableAutoRepeat: boolean;
};

export class InteractionController {
  private modes: InteractionMode[];
  private mode: InteractionMode | undefined;
  private timer: CountdownTimer = new CountdownTimer(0);
  private timerPassed = false;

  private isContinuing = false;
  private start: Vector3D | undefined;
  private cursor: Vector3D | undefined;

  private nextPointedNode: PointedNode | undefined;
  private nextControl: Control | undefined;

  constructor(
    readonly player: Player,
    private config: InteractionConfig,
    private readonly context: InteractionContext
  ) {
    this.initModes();
  }

  setConfig(config: InteractionConfig) {
    this.config = config;
    this.initModes();
  }

  private initModes() {
    this.modes = [];
    if (!this.config.disablePlace) {
      this.modes.push(new UndigMode(this.player, this.context));
      this.modes.push(new BuildMode(this.player, this.context));
    }
    if (!this.config.disableDig) {
      this.modes.push(new UnbuildMode(this.player, this.context));
      this.modes.push(new DigMode(this.player, this.context));
    }
    if (!this.config.disableUse) {
      this.modes.push(new UseMode(this.player, this.context));
    }
  }

  onUpdate(dt: number): void {
    this.timerPassed = this.timer.updateAndCheck(dt);

    let control: Control | undefined;
    if (this.nextControl !== undefined) {
      control = this.nextControl;
      this.nextControl = undefined;
    }

    let pointedNode: PointedNode | undefined;
    if (this.nextPointedNode) {
      pointedNode = this.nextPointedNode;
      this.nextPointedNode = undefined;
    } else {
      pointedNode = this.findPointedNode();
    }

    if (!this.mode) {
      if (!pointedNode) return;

      if (!control) {
        if (
          !this.config.disablePlace &&
          this.player.getControl(Control.Place)
        ) {
          control = Control.Place;
        } else if (
          !this.config.disableDig &&
          this.player.getControl(Control.Dig)
        ) {
          control = Control.Dig;
        } else if (
          !this.config.disableUse &&
          this.player.getControl(Control.Aux1)
        ) {
          control = Control.Aux1;
        }
      }

      let start: Vector3D | undefined;
      let startMode: InteractionMode | undefined;
      for (const mode of this.modes) {
        if (control === mode.options.control) {
          start = mode.getCursor(pointedNode);
          if (mode.canStart(start)) {
            startMode = mode;
            break;
          }
        }
      }

      if (startMode) {
        this.startInteraction(startMode, start!);
        if (this.isContinuing) {
          this.updateInteraction(start!);
        }
      }
    } else {
      const cursor = pointedNode && this.mode.getCursor(pointedNode);

      if (this.isContinuing) {
        this.updateInteraction(cursor);
      }

      if (!this.player.getControl(this.mode.options.control)) {
        this.endInteraction();
      }
    }
  }

  onDrop(): void {
    if (this.config.disableDrop) return;
    this.context.undo();
  }

  onPlace(pointedNode: PointedNode): void {
    if (this.config.disablePlace) return;
    this.nextControl = Control.Place;
    this.nextPointedNode = pointedNode;
    this.onUpdate(0);
  }

  onDig(pointedNode: PointedNode): void {
    if (this.config.disableDig) return;
    this.nextControl = Control.Dig;
    this.nextPointedNode = pointedNode;
    this.onUpdate(0);
  }

  private startInteraction(mode: InteractionMode, start: Vector3D) {
    if (this.mode) {
      throwError("Can't start new interaction while another is ongoing!");
    }

    Logger.trace('start', mode);
    this.mode = mode;
    this.start = start;
    this.cursor = start;

    const result = mode.onStart(start);
    if (
      result === InteractionResult.Apply ||
      result === InteractionResult.Cancel
    ) {
      if (result === InteractionResult.Apply) {
        mode.apply(start, start);
      }
      this.stopInteraction();
    } else if (result === InteractionResult.Continue) {
      this.isContinuing = true;
      if (mode.options.autoRepeatInterval) {
        this.timer.reset(mode.options.autoRepeatInterval);
      }
    }
  }

  private stopInteraction() {
    if (!this.mode) throwError('No mode!');
    Logger.trace('stop', this.mode);
    this.isContinuing = false;
  }

  private endInteraction() {
    if (!this.mode) throwError('No mode!');
    Logger.trace('stop', this.mode);

    if (this.isContinuing) {
      const result = this.mode.onEnd(this.start!, this.cursor!);
      if (result === InteractionResult.Apply) {
        if (this.config.enableDrag && this.mode.options.canDrag) {
          this.mode.apply(this.start!, this.cursor!);
        } else {
          this.mode.apply(this.cursor!, this.cursor!);
        }
      }
    }

    Logger.trace('end', this.mode);
    this.mode = undefined;
    this.start = undefined;
    this.cursor = undefined;

    this.isContinuing = false;
  }

  private updateInteraction(cursor: Vector3D | undefined) {
    if (!this.mode) throwError('No mode!');

    if (this.config.enableDrag && this.mode.options.canDrag) {
      const start = this.start!;

      // Special key locks horizontal position and changes Y position based on look pitch
      if (this.player.getControl(Control.Aux1)) {
        const eyePos = this.player.getEyePosition();
        const deltaH = vector.subtract(eyePos, this.cursor!);
        deltaH.y = 0;
        const distH = vector.length(deltaH);

        const lookY = this.player.getLookDir().y;
        const tangent = lookY / Math.sqrt(1 - lookY * lookY);
        const newY = eyePos.y + tangent * distH;

        this.cursor = vector.new(
          this.cursor!.x,
          Math.round(newY),
          this.cursor!.z
        );
      } else if (cursor) {
        const volume =
          (Math.abs(start.x - cursor.x) + 1) *
          (Math.abs(start.y - cursor.y) + 1) *
          (Math.abs(start.z - cursor.z) + 1);
        if (volume <= globals.interaction.maxSize) {
          this.cursor = cursor;
        } else {
          // todo: display message (selection too large)
        }
      }

      const result = this.mode.onUpdateDrag(start, this.cursor!);
      if (
        result === InteractionResult.Apply ||
        result === InteractionResult.Cancel
      ) {
        if (result === InteractionResult.Apply) {
          this.mode.apply(start, this.cursor!);
        }
        this.stopInteraction();
      }
    } else if (
      this.config.enableAutoRepeat &&
      this.mode.options.autoRepeatInterval &&
      this.timerPassed &&
      cursor
    ) {
      this.timer.reset(this.mode.options.autoRepeatInterval);

      this.cursor = cursor;

      const result = this.mode.onUpdateRepeat(cursor);
      if (result === InteractionResult.Apply) {
        this.mode.apply(cursor, cursor);
      } else if (result === InteractionResult.Cancel) {
        this.stopInteraction();
      }
    }
  }

  private findPointedNode(after?: PointedNode): PointedNode | undefined {
    const start = this.player.getEyePosition();
    const end = vector.add(
      start,
      vector.multiply(this.player.getLookDir(), globals.interaction.range)
    );

    const raycast = Raycast(start, end, false, false);
    let first: PointedNode | undefined;
    let foundAfter = false;
    for (const current of raycast) {
      if (!first) first = current;
      if (!after || foundAfter) return current;
      foundAfter =
        current === after || equalVectors(current.under, after.under);
    }

    if (after) {
      // Nothing was found, maybe we skipped everything?
      // Fall back to first node
      return first;
    }

    return undefined;
  }
}
