import { BlockDamage } from 'server/block/block';
import { CrystalShieldProperties } from 'server/block/core_crystal/crystal_shield/properties';
import { BlockEntityScript } from 'server/block/entity_block/block_entity';
import { Animation } from 'server/entity/animation';
import { CrystalExplosionDef } from 'server/entity/crystal_explosion/def';
import { CountdownTimer } from 'utils/timer';

const maxShieldEnergy = 100;
const shieldRegen = 1;
const shieldRespawnTime = 60;

export class CrystalShieldScript extends BlockEntityScript<CrystalShieldProperties> {
  get rechargeTimerCount(): number {
    return this.rechargeTimer.count;
  }

  set rechargeTimerCount(value: number) {
    this.rechargeTimer.count = value;
  }

  private energy = maxShieldEnergy;
  private rechargeTimer = new CountdownTimer(shieldRespawnTime);
  private broken = false;

  override activate() {
    this.animation = this.broken
      ? this.animations.broken
      : this.animations.idle;
  }

  override update(dt): void {
    if (this.broken) {
      if (this.rechargeTimer.updateAndCheck(dt)) {
        this.broken = false;
        this.energy = maxShieldEnergy * 0.33;
        this.animateFlash();
      }
    } else if (this.energy < maxShieldEnergy) {
      this.energy += dt * shieldRegen;
      if (this.energy > maxShieldEnergy) {
        this.energy = maxShieldEnergy;
      }
    }
  }

  onDamageCrystal(damage: BlockDamage): void {
    if (this.broken) return;

    if (this.energy <= 0) {
      this.break();
    } else {
      this.energy -= damage.reduce(damage.amount);
      this.animateFlash();
    }
  }

  override onDestroyBlock(): void {
    this.context.createEntity(CrystalExplosionDef, this.getVoxelPosition());
  }

  private break() {
    this.broken = true;
    this.rechargeTimer.reset();

    this.context.createEntity(CrystalExplosionDef, this.getVoxelPosition());

    this.animateBreakage();
  }

  private animateBreakage() {
    Animation.sequence(this, [
      { animation: this.animations.die, skipLastFrames: 2 },
      this.animations.broken,
    ]);
  }

  private animateFlash() {
    Animation.sequence(this, [
      { animation: this.animations.flash, skipLastFrames: 2 },
      this.animations.idle,
    ]);
  }
}
