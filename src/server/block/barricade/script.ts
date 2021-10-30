import { BarricadeProperties } from 'server/block/barricade/properties';
import { BlockCallbacks, BlockDamage, BlockScript } from 'server/block/block';
import { createDamagedBlockScript } from 'server/block/damaged_block/damaged_block';
import { sqDist } from 'utils/math';

const DamagedScript = createDamagedBlockScript({
  base: BlockScript.asClass<BarricadeProperties>(),
});

export class BarricadeScript
  extends DamagedScript
  implements BlockCallbacks<BarricadeProperties>
{
  override onDamage(damage: BlockDamage): void {
    const { sourceEntity } = damage;

    if (!sourceEntity) return;
    if (sqDist(sourceEntity.objRef.get_pos(), this.position) > 1.5 ** 2) return;

    sourceEntity.damage(Math.ceil(damage.amount * 0.5), this.position);
  }
}
