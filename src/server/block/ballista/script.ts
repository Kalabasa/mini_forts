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

    const enemyInRange = this.context.entityStore.has(
      this.entity.getTargetQuery()
    );

    return enemyInRange ? TaskPriority.High : undefined;
  }

  getOperatorPositions(): Vector3D[] {
    return this.entity.getOperatorPositions();
  }

  startOperation(): void {
    this.entity.operational = true;
  }

  endOperation(): void {
    this.entity.operational = false;
  }
}
