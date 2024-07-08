import { Operable } from 'server/ai/colony/operable';
import { TaskPriority } from 'server/ai/colony/task';
import { BallistaDef } from 'server/block/ballista/def';

export class BallistaOperable extends Operable<typeof BallistaDef> {
  shouldOperate(): TaskPriority | undefined {
    const enemyInRange = this.context.entityStore.has(
      this.blockRef.entity.getTargetQuery()
    );

    return enemyInRange ? TaskPriority.High : undefined;
  }

  override getOperatorPositions(): Vector3D[] {
    return this.blockRef.entity.getOperatorPositions();
  }
}
