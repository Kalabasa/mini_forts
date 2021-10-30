import { Animation } from 'server/entity/animation';
import { EnemyEntityScript } from 'server/entity/enemy_entity/enemy_entity';
import { Entity, EntityDamage } from 'server/entity/entity';
import { SnailProperties } from 'server/entity/snail/properties';
import { CountdownTimer } from 'utils/timer';

const hideTime = 2;

export class SnailScript extends EnemyEntityScript<SnailProperties> {
  private isHiding = false;
  private hideTimer = new CountdownTimer(hideTime);

  override update(dt: number): void {
    const hideTimeout = this.isHiding && this.hideTimer.updateAndCheck(dt);

    if (this.collisionInfo.touching_ground) {
      if (this.isHiding) {
        if (hideTimeout && Math.random() < 0.04) {
          this.unhide();
        }
        return;
      }

      if (this.siege()) return;
      if (this.hunt()) return;
    } else if (this.isHiding) {
      this.isHiding = false;
    }
  }

  protected override attackEntity(entity: Entity): void {
    this.animation = this.animations.attack;
    this.restartAnimation();
    entity.damage(2, this);
  }

  protected override attackNode(position: Vector3D) {
    this.animation = this.animations.attack;
    this.restartAnimation();

    const blockRef = this.context.blockManager.getRef(position);
    if (blockRef) {
      blockRef.damage(2, this);
    }
  }

  override onDamage(damage: EntityDamage) {
    if (this.isHiding) {
      if (this.hideTimer.count + 0.5 >= this.hideTimer.seconds) {
        this.hideTimer.reset(0.5);
      }

      damage.reduce(damage.amount);
      this.animateFlash();
    } else {
      minetest.after(0.1, () => {
        if (this.active && !this.isHiding) {
          this.hide();
        }
      });
    }
  }

  private hide() {
    this.targetLocation = undefined;
    this.isHiding = true;
    this.hideTimer.reset(hideTime);
    Animation.sequence(this, [
      { animation: this.animations.hide, skipLastFrames: 3 },
      this.animations.hiding,
    ]);
  }

  private unhide() {
    this.isHiding = false;
    this.animation = this.animations.stand;
  }

  private animateFlash() {
    Animation.sequence(this, [
      { animation: this.animations.flash, skipLastFrames: 2 },
      this.animations.hiding,
    ]);
  }
}
