import { BlockCallbacks, BlockScript } from 'server/block/block';
import { EnemyCrystalProperties } from 'server/block/enemy_crystal/properties';

export class EnemyCrystalScript
  extends BlockScript<EnemyCrystalProperties>
  implements BlockCallbacks<EnemyCrystalProperties> {
  // todo: damage nearby Minions
}
