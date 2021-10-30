import { CrystalExplosionProperties } from 'server/entity/crystal_explosion/properties';
import { EntityScript } from 'server/entity/entity';
import { Faction } from 'server/entity/faction';
import { sqDist, ZERO_V } from 'utils/math';
import { CountdownTimer } from 'utils/timer';

export class CrystalExplosionScript extends EntityScript<CrystalExplosionProperties> {
  get explodeTimerCount(): number {
    return this.explodeTimer.count;
  }

  set explodeTimerCount(value: number) {
    this.explodeTimer.count = value;
    this.lastRadius =
      this.properties.explodeRadius *
      (this.explodeTimer.count / this.explodeTimer.seconds);
  }

  private explodeTimer = new CountdownTimer(this.properties.explodeTime);
  private lastRadius = 0;

  override activate(): void {
    this.animation = this.properties.animations.explode;
    this.objRef.set_rotation({ x: Math.PI / 2, y: 0, z: 0 });
    minetest.add_particle(this.createParticle(this.objRef.get_pos()));
  }

  override update(dt: number): void {
    const sphereCenter = this.objRef.get_pos();

    let sphereRadius =
      this.properties.explodeRadius *
      (this.explodeTimer.count / this.explodeTimer.seconds);
    if (this.explodeTimer.updateAndCheck(dt)) {
      this.objRef.remove();
      sphereRadius = this.properties.explodeRadius;
    }

    const enemies = this.context.entityStore.find({
      sphereCenter,
      sphereRadius,
      faction: Faction.Attackers,
      alive: true,
      damageable: true,
    });

    for (const enemy of enemies) {
      const dist2 = sqDist(sphereCenter, enemy.objRef.get_pos());
      if (dist2 <= this.lastRadius) {
        enemy.damage(10 + 200 / (2 + dist2), sphereCenter);
      }
    }

    this.lastRadius = sphereRadius;
  }

  private createParticle(pos: Vector3D): ParticleDefinition {
    const time =
      this.properties.animations.explode.numFrames *
      this.properties.animations.explode.frameDuration;

    return {
      pos,
      acceleration: ZERO_V,
      velocity: ZERO_V,
      expirationtime: time,
      size: this.properties.explodeRadius * 20,
      texture: this.properties.texture,
      animation: {
        type: 'vertical_frames',
        aspect_w: 80,
        aspect_h: 80,
        length: time,
      },
      glow: 14,
    };
  }
}
