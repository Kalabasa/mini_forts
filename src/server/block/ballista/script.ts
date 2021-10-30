import { BallistaProperties } from 'server/block/ballista/properties';
import { BlockCallbacks } from 'server/block/block';
import { EntityBlockScript } from 'server/block/entity_block/enity_block';

export class BallistaScript
  extends EntityBlockScript<BallistaProperties>
  implements BlockCallbacks<BallistaProperties>
{
  startOperation(): void {
    this.entity.operational = true;
  }

  endOperation(): void {
    this.entity.operational = false;
  }
}
