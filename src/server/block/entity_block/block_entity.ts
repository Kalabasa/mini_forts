import { EntityProperties, EntityScript } from 'server/entity/entity';
import { BallisticLocomotion } from 'server/entity/locomotion/ballistic';

export abstract class BlockEntityProperties extends EntityProperties {
  override floats = true;
  locomotion = BallisticLocomotion.create();
}

export type BlockEntity = BlockEntityScript<BlockEntityProperties>;

export abstract class BlockEntityScript<
  P extends BlockEntityProperties = BlockEntityProperties
> extends EntityScript<P> {
  onDestroyBlock(): void {
    // For override
  }
}
