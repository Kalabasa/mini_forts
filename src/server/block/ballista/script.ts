import { TaskPriority } from 'server/ai/colony/task';
import { BallistaProperties } from 'server/block/ballista/properties';
import { BlockCallbacks } from 'server/block/block';
import { EntityBlockScript } from 'server/block/entity_block/enity_block';
import { BallistaHeadDef } from 'server/block/ballista/ballista_head/def';

export class BallistaScript
  extends EntityBlockScript<BallistaProperties>
  implements BlockCallbacks<BallistaProperties>
{
  shouldOperate(): TaskPriority | undefined {
    if (!this.context.hasResource(BallistaHeadDef.properties.ammunition)) {
      return undefined;
    }
    const targeting = this.entity.getTargetingState();
    if (!targeting) return undefined;

    return targeting.withinRange ? TaskPriority.High : TaskPriority.Low;
  }

  getOperatePositions(): Vector3D[] {
    return this.entity.getTargetingState()?.operatePositions ?? [];
  }

  startOperation(): void {
    this.entity.operational = true;
  }

  endOperation(): void {
    this.entity.operational = false;
  }
}
