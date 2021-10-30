import { BlockScript, BlockCallbacks } from 'server/block/block';
import { DenProperties } from 'server/block/den/properties';
import { Faction } from 'server/entity/faction';
import { Logger } from 'utils/logger';

const healInterval = 1;

export class DenScript
  extends BlockScript<DenProperties>
  implements BlockCallbacks<DenProperties>
{
  override initializeNode() {
    super.initializeNode();
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
