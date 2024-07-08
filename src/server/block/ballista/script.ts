import { BallistaProperties } from 'server/block/ballista/properties';
import { BlockCallbacks } from 'server/block/block';
import { EntityBlockScript } from 'server/block/entity_block/enity_block';
import { equalVectors } from 'utils/math';

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

  override isOperable(fromPosition?: Vector3D): boolean {
    if (!super.isOperable(fromPosition)) return false;

    if (fromPosition == null) return true;

    const fromVoxelPosition = vector.round(fromPosition);
    return this.entity
      .getOperatorPositions()
      .some((pos) => equalVectors(pos, fromVoxelPosition));
  }
}
