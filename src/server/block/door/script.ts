import { BlockCallbacks, BlockScript } from 'server/block/block';
import { DoorProperties } from 'server/block/door/properties';
import { Entity } from 'server/entity/entity';
import { equalVectors } from 'utils/math';

export class DoorScript
  extends BlockScript<DoorProperties>
  implements BlockCallbacks<DoorProperties>
{
  private openers = new Set<Entity>();
  private isOpen: boolean;

  override activate() {
    this.isOpen = this.getState() === 'open';
  }

  onUseScript() {
    if (this.isOpen) {
      this.tryClose();
    } else {
      this.open();
    }
  }

  open(opener?: Entity): void {
    if (opener && this.openers.has(opener)) {
      return;
    }

    if (!this.valid) return;

    if (this.openers.size === 0) {
      this.changeState('open');
      this.isOpen = true;
    }

    if (opener) {
      this.openers.add(opener);
    }

    minetest.after(0.5, () => this.tryClose(opener));
  }

  tryClose(opener?: Entity) {
    if (
      opener &&
      opener.active &&
      equalVectors(this.position, opener.getVoxelPosition())
    ) {
      // Wait for the opener to leave the door
      minetest.after(0.2, () => this.tryClose(opener));
      return;
    }

    if (!this.valid) return;

    if (opener) {
      this.openers.delete(opener);
    }

    if (this.openers.size === 0) {
      this.changeState('default');
      this.isOpen = false;
    }
  }
}
