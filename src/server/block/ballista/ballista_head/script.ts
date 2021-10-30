import { IsNode } from 'common/block/is_node';
import { BallistaBolt } from 'server/block/ballista/ballista_head/ballista_bolt';
import { BallistaHeadProperties } from 'server/block/ballista/ballista_head/properties';
import { BlockEntityScript } from 'server/block/entity_block/block_entity';
import { Entity } from 'server/entity/entity';
import { Faction } from 'server/entity/faction';
import { DustParticle } from 'server/particles/dust/dust';
import { equalVectors, sqDist } from 'utils/math';
import { CountdownTimer } from 'utils/timer';

export enum ShotStage {
  Idle,
  Charge,
  Hold,
  Release,
}

export class BallistaHeadScript extends BlockEntityScript<BallistaHeadProperties> {
  operational = false;
  private shotStage: ShotStage = ShotStage.Idle;
  private shotTimer: CountdownTimer;

  override activate() {
    this.animation = this.animations.idle;
    this.objRef.set_rotation({
      x: Math.PI / 2,
      y: Math.random() * Math.PI * 2,
      z: 0,
    });
  }

  override update(dt: number) {
    const pos = this.getVoxelPosition();
    let target: Entity | undefined;

    if (
      this.operational &&
      this.context.hasResource(this.properties.ammunition)
    ) {
      let targetDist2 = Infinity;

      const nearbyEntities = this.context.entityStore.find(
        this.getTargetQuery()
      );

      for (const entity of nearbyEntities) {
        const dist2 = sqDist(pos, entity.objRef.get_pos());
        if (dist2 < targetDist2) {
          targetDist2 = dist2;
          target = entity;
        }
      }

      if (target) {
        const delta = vector.subtract(target.objRef.get_pos(), pos);
        const yaw = Math.atan2(delta.z, delta.x) + Math.PI / 4;
        this.objRef.set_rotation({
          x: Math.PI / 2,
          y: yaw,
          z: 0,
        });
      }
    }

    if (target) {
      if (this.shotStage === ShotStage.Idle) {
        let cooledDown = true;
        if (this.shotTimer) {
          cooledDown = this.shotTimer.updateAndCheck(dt);
        }

        if (cooledDown) {
          this.shotStage = ShotStage.Charge;
          this.shotTimer = new CountdownTimer(this.properties.chargeTime);
          this.animation = this.animations.charge;
        }
      } else if (this.shotStage === ShotStage.Charge) {
        if (this.shotTimer.updateAndCheck(dt)) {
          this.shotStage = ShotStage.Hold;
          this.shotTimer = new CountdownTimer(this.properties.holdTime);
          this.animation = this.animations.hold;
        }
      } else if (this.shotStage === ShotStage.Hold) {
        if (this.shotTimer.updateAndCheck(dt)) {
          this.context.subtractResource(this.properties.ammunition, pos);

          addShotParticles(pos, target.objRef.get_pos());
          const damage = target.damage(this.properties.shotDamage, pos);
          if (damage > 0) {
            BallistaBolt.create(target, pos);
          }

          this.shotStage = ShotStage.Release;
          this.shotTimer = new CountdownTimer(this.properties.releaseTime);
          this.animation = this.animations.release;
        }
      }
    } else if (
      this.shotStage !== ShotStage.Idle &&
      this.shotStage !== ShotStage.Release
    ) {
      this.shotStage = ShotStage.Idle;
      this.animation = this.animations.idle;
    }

    if (this.shotStage === ShotStage.Release) {
      if (this.shotTimer.updateAndCheck(dt)) {
        this.shotStage = ShotStage.Idle;
        this.shotTimer = new CountdownTimer(this.properties.cooldownTime);
        this.animation = this.animations.idle;
      }
    }
  }

  getTargetQuery() {
    return {
      sphereCenter: this.getVoxelPosition(),
      sphereRadius: this.properties.shotRange,
      faction: Faction.Attackers,
      alive: true,
      damageable: true,
      filter: (entity) => this.canTarget(entity, false),
    };
  }

  canTarget(entity: Entity, checkDistance: boolean = true): boolean {
    const origin = this.getVoxelPosition();
    const target = entity.objRef.get_pos();

    if (checkDistance) {
      const dist2 = sqDist(origin, target);
      if (dist2 > this.properties.shotRange ** 2) return false;
    }

    const raycast = Raycast(origin, target, false, false);

    for (const pointed of raycast) {
      if (!equalVectors(origin, pointed.under)) {
        const nodeUnder = minetest.get_node(pointed.under);
        if (IsNode.solid(nodeUnder)) {
          const nodeAbove = minetest.get_node(pointed.above);

          if (IsNode.solid(nodeAbove)) return false;

          const dir = vector.direction(origin, target);
          const forward = {
            x: Math.round(pointed.intersection_point.x + dir.x * 0.25),
            y: Math.round(pointed.intersection_point.y + dir.y * 0.25),
            z: Math.round(pointed.intersection_point.z + dir.z * 0.25),
          };

          if (equalVectors(forward, pointed.under)) return false;
        }
      }
    }

    return true;
  }
}

// this should be client-side
function addShotParticles(origin: Vector3D, target: Vector3D) {
  const distance = vector.distance(origin, target);
  const dir = {
    x: (target.x - origin.x) / distance,
    y: (target.y - origin.y) / distance,
    z: (target.z - origin.z) / distance,
  };

  let r = vector.rotate_around_axis(
    { x: 1, y: 0, z: 0 },
    {
      x: 2 - 1 * Math.random(),
      y: 2 - 1 * Math.random(),
      z: 2 - 1 * Math.random(),
    },
    2 * Math.PI * Math.random()
  );

  let d = 0.6;
  const p = vector.add(origin, vector.multiply(dir, d));
  while (d + 1 < distance) {
    const t = d / distance;

    const pos = {
      x: p.x + 0.05 - 0.1 * Math.random(),
      y: p.y + 0.05 - 0.1 * Math.random(),
      z: p.z + 0.05 - 0.1 * Math.random(),
    };

    const baseTime = 0.4 + 0.2 * t;
    const time = baseTime - 0.2 * Math.random() ** 0.5;

    const velocity = vector.multiply(dir, 0.2 + 4 / (3 + d));

    const acceleration = {
      x: velocity.x * (-1 / baseTime) + 0.8 * r.x,
      y: velocity.y * (-1 / baseTime) + 0.8 * r.y,
      z: velocity.z * (-1 / baseTime) + 0.8 * r.z,
    };

    minetest.add_particle(
      DustParticle.create(pos, time, velocity, acceleration)
    );

    r = vector.rotate_around_axis(
      r,
      {
        x: 2 - 1 * Math.random(),
        y: 2 - 1 * Math.random(),
        z: 2 - 1 * Math.random(),
      },
      0.8 - 1.6 * Math.random()
    );

    const step = 1 / 16 + 0.2 * (d * Math.random()) ** 2;
    p.x += dir.x * step;
    p.y += dir.y * step;
    p.z += dir.z * step;
    d += step;
  }
}
