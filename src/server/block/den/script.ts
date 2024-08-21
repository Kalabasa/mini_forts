import { BlockCallbacks, BlockScript, BlockState } from 'server/block/block';
import { DenProperties } from 'server/block/den/properties';
import { Faction } from 'server/entity/faction';
import { randomInt } from 'utils/math';

const healInterval = 1;

export class DenScript
  extends BlockScript<DenProperties>
  implements BlockCallbacks<DenProperties>
{
  override initializeNode() {
    super.initializeNode(
      randomInt(0, 3) === 0
        ? 'default'
        : (('rot' + randomInt(1, 3)) as BlockState<DenProperties>)
    );
    this.getTimer().start(healInterval);
  }

  override activate() {
    const timer = this.getTimer();
    if (!timer.is_started()) {
      timer.start(healInterval);
    }
  }

  onTimer() {
    const ally = this.context.entityStore.find({
      nearest: this.position,
      maxDistance: Math.sqrt(2) / 2,
      alive: true,
      damageable: true,
      faction: Faction.Defenders,
      filter: (entity) => entity.health < entity.maxHealth,
    });

    if (ally) {
      ally.heal(1);
    }

    this.getTimer().start(healInterval);
  }
}
