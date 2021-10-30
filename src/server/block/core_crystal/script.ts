import { BlockCallbacks, BlockDamage } from 'server/block/block';
import { CoreCrystalProperties } from 'server/block/core_crystal/properties';
import { createDamagedBlockScript } from 'server/block/damaged_block/damaged_block';
import { EntityBlockScript } from 'server/block/entity_block/enity_block';

const DamagedScript = createDamagedBlockScript({
  base: EntityBlockScript.asClass2<CoreCrystalProperties>(),
});

export class CoreCrystalScript
  extends DamagedScript
  implements BlockCallbacks<CoreCrystalProperties>
{
  override onDamage(damage: BlockDamage): void {
    this.entity.onDamageCrystal(damage);
  }
}
