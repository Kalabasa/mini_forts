import { IsNode } from 'common/block/is_node';
import { WorkerCapabilities } from 'server/ai/colony/worker_capabilities';
import { BallistaBolt } from 'server/block/ballista/ballista_head/ballista_bolt';
import { BallistaHeadProperties } from 'server/block/ballista/ballista_head/properties';
import { BlockEntityScript } from 'server/block/entity_block/block_entity';
import { DebugMarker } from 'server/debug/debug_marker';
import { Entity } from 'server/entity/entity';
import { Faction } from 'server/entity/faction';
import { DustParticle } from 'server/particles/dust/dust';
import { equalVectors, sqDist } from 'utils/math';
import { CountdownTimer, IntervalTimer } from 'utils/timer';

export enum ShotStage {
  Idle,
  Charge,
  Hold,
  Release,
}

type Targeting = {
  target: Entity;
  withinRange: boolean;
  clearShot: boolean;
  operatePositions: Vector3D[];
};

export class BallistaHeadScript extends BlockEntityScript<BallistaHeadProperties> {
  operational = false;
  private targeting: Targeting | undefined;
  private targetingTimer = new IntervalTimer(0.5);
  private idleTargetingTimer = new IntervalTimer(1.0);
  private shotStage = ShotStage.Idle;
  private shotTimer: CountdownTimer | undefined;

  override activate() {
    this.animation = this.animations.idle;
    this.objRef.set_rotation({
      x: Math.PI / 2,
      y: Math.random() * Math.PI * 2,
      z: 0,
    });
  }

  override update(dt: number) {
    const targetingTimerPassed = this.targetingTimer.updateAndCheck(dt);
    const idleTargetingTimerPassed = this.idleTargetingTimer.updateAndCheck(dt);
    if (this.operational ? targetingTimerPassed : idleTargetingTimerPassed) {
      this.updateTargeting();
    }

    if (
      this.operational &&
      this.context.hasResource(this.properties.ammunition)
    ) {
      if (
        this.targeting &&
        this.targeting.clearShot &&
        this.targeting.target.alive
      ) {
        const target = this.targeting.target;
        const pos = this.getVoxelPosition();
        const delta = vector.subtract(target.objRef.get_pos(), pos);
        const yaw = Math.atan2(delta.z, delta.x) + Math.PI / 4;
        this.objRef.set_rotation({
          x: Math.PI / 2,
          y: yaw,
          z: 0,
        });

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
          if (this.shotTimer!.updateAndCheck(dt)) {
            this.shotStage = ShotStage.Hold;
            this.shotTimer = new CountdownTimer(this.properties.holdTime);
            this.animation = this.animations.hold;
          }
        } else if (this.shotStage === ShotStage.Hold) {
          if (this.shotTimer!.updateAndCheck(dt)) {
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
      }
    }

    if (this.shotStage === ShotStage.Release) {
      if (this.shotTimer!.updateAndCheck(dt)) {
        this.shotStage = ShotStage.Idle;
        this.shotTimer = new CountdownTimer(this.properties.cooldownTime);
        this.animation = this.animations.idle;
      }
    } else if (!this.targeting && this.shotStage !== ShotStage.Idle) {
      this.shotStage = ShotStage.Idle;
      this.animation = this.animations.idle;
    }
  }

  getTargetingState(): Targeting | undefined {
    return this.targeting;
  }

  private updateTargeting() {
    const preAimBuffer = 2;

    if (this.targeting) {
      const target = this.targeting.target;
      if (!target.alive || !target.active) {
        this.targeting = undefined;
      }

      if (
        this.targeting &&
        sqDist(this.getVoxelPosition(), target.objRef.get_pos()) >
          (this.properties.shotRange + preAimBuffer) ** 2
      ) {
        this.targeting = undefined;
      }

      if (this.targeting) {
        Object.assign(this.targeting, this.computeTargeting(target));

        if (this.targeting.operatePositions.length === 0) {
          this.targeting = undefined;
        }
      }
    }

    if (!this.targeting) {
      const target = this.findTarget(preAimBuffer);
      if (!target) return null;

      this.targeting = {
        target,
        ...this.computeTargeting(target),
      };
    }
  }

  private computeTargeting(target: Entity): Omit<Targeting, 'target'> {
    const targetPos = target.objRef.get_pos();
    const pos = this.getVoxelPosition();

    const withinRange =
      sqDist(pos, targetPos) <= this.properties.shotRange ** 2;

    const operatePositions = WorkerCapabilities.getOperatePositions(pos).filter(
      (operatePos) => this.checkValidOperatePosition(targetPos, operatePos)
    );

    let clearShot = true;
    const dir = vector.direction(pos, targetPos);
    const tip = vector.offset(pos, dir.x * 0.45, 0.05, dir.z * 0.45);
    for (const pointed of Raycast(tip, targetPos, false, false)) {
      if (!equalVectors(pos, pointed.under)) {
        const nodeUnder = minetest.get_node(pointed.under);
        if (!IsNode.shootableThrough(nodeUnder)) {
          const nodeAbove = minetest.get_node(pointed.above);
          if (!IsNode.shootableThrough(nodeAbove)) {
            clearShot = false;
            break;
          }

          // can phase through thin walls
          const threshold = 0.15;
          const skip = {
            x: Math.round(pointed.intersection_point.x + dir.x * threshold),
            y: Math.round(pointed.intersection_point.y + dir.y * threshold),
            z: Math.round(pointed.intersection_point.z + dir.z * threshold),
          };
          if (equalVectors(skip, pointed.under)) {
            clearShot = false;
            break;
          }
        }
      }
    }

    return { withinRange, clearShot, operatePositions };
  }

  private checkValidOperatePosition(targetPos: Vector3D, operatePos: Vector3D) {
    if (!this.checkValidAngle(targetPos, operatePos)) return false;
    const node = minetest.get_node(operatePos);
    return !IsNode.solid(node);
  }

  private checkValidAngle(targetPos: Vector3D, operatePos: Vector3D) {
    const pos = this.getVoxelPosition();
    const dirToTarget = vector.direction(pos, targetPos);
    const dirToOperator = vector.direction(pos, operatePos);
    const dot = vector.dot(dirToTarget, dirToOperator);
    return dot < 0.71;
  }

  private findTarget(addRange: number = 0) {
    const shotRange = this.properties.shotRange;
    const home = this.context.getHomePosition();
    const pos = this.getVoxelPosition();

    let targetScore = Infinity;
    let target: Entity | undefined;

    const nearbyTargetCandidates = this.context.entityStore.find({
      sphereCenter: this.getVoxelPosition(),
      sphereRadius: shotRange + addRange,
      faction: Faction.Attackers,
      alive: true,
      damageable: true,
      filter: (entity) => this.canShoot(entity, { checkDistance: false }),
    });

    for (const targetCandidate of nearbyTargetCandidates) {
      const targetPos = targetCandidate.objRef.get_pos();
      const targetDist2 = sqDist(pos, targetPos);
      const score =
        targetDist2 +
        // prioritize targets near home
        sqDist(home, targetPos) * 4 +
        // prioritize targets within shot range
        (targetDist2 > shotRange ? 1e6 : 0);
      if (score < targetScore) {
        targetScore = score;
        target = targetCandidate;
      }
    }

    return target;
  }

  private canShoot(
    target: Entity,
    {
      checkDistance = true,
      checkOperatePositions = true,
    }: { checkDistance?: boolean; checkOperatePositions?: boolean } = {}
  ): boolean {
    const targeting = this.computeTargeting(target);
    if (checkDistance || checkOperatePositions) {
      if (checkDistance && !targeting.withinRange) return false;
      if (checkOperatePositions && targeting.operatePositions.length == 0) {
        return false;
      }
    }

    return targeting.clearShot;
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
  const p = vector.offset(origin, dir.x * d, dir.y * 0.2, dir.z * d);
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
