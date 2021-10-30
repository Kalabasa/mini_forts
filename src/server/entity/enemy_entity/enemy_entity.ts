import { IsNode } from 'common/block/is_node';
import { ActionResult } from 'server/ai/colony/action_result';
import { Path } from 'server/ai/pathfinder/path';
import { Pathfinder } from 'server/ai/pathfinder/pathfinder';
import { Paths } from 'server/ai/pathfinder/path_helper';
import { Entity, EntityProperties, EntityScript } from 'server/entity/entity';
import { Faction } from 'server/entity/faction';
import { Locomotion } from 'server/entity/locomotion/locomotion';
import { DecayPoofParticle } from 'server/particles/decay_poof/decay_poof';
import { inRange } from 'utils/math';
import { IntervalTimer } from 'utils/timer';

export abstract class EnemyEntityProperties extends EntityProperties {
  abstract readonly attackRange: number;
  abstract readonly attackInterval: number;
}

export type EnemyEntity = EnemyEntityScript;

export abstract class EnemyEntityScript<
  P extends EnemyEntityProperties = EnemyEntityProperties
> extends EntityScript<P> {
  protected pathfinder: Pathfinder = Pathfinder.get(
    this.context,
    this.locomotion
  );

  protected huntLocation: Vector3D | undefined;
  protected huntTarget: Entity | undefined;
  protected huntPath: Path | undefined;

  protected siegePos: Vector3D | undefined;

  private targetTimer = new IntervalTimer(1.0);
  private repathTimer = new IntervalTimer(4.0);
  private attackTimer: IntervalTimer;
  private targetTimerPassed = false;
  private repathTimerPassed = false;
  private attackTimerPassed = false;

  override coreActivate() {
    this.attackTimer = new IntervalTimer(this.properties.attackInterval);
    super.coreActivate();
  }

  override coreUpdate(dt: number, moveResult: CollisionInfo) {
    this.targetTimerPassed = this.targetTimer.updateAndCheck(dt);
    this.repathTimerPassed = this.repathTimer.updateAndCheck(dt);
    this.attackTimerPassed = this.attackTimer.updateAndCheck(dt);
    super.coreUpdate(dt, moveResult);
  }

  hunt(): boolean {
    if (!this.huntTarget && this.targetTimerPassed) {
      this.targetTimer.reset();
      this.huntTarget = this.context.entityStore.find({
        nearest: this.objRef.get_pos(),
        maxDistance: this.properties.attackRange,
        faction: Faction.Defenders,
        alive: true,
        damageable: true,
      });
    }

    if (this.huntTarget && !this.huntTarget.alive) {
      this.huntTarget = undefined;
    }

    if (this.huntTarget) {
      if (
        inRange(
          this.huntTarget.objRef.get_pos(),
          this.objRef.get_pos(),
          this.properties.attackRange
        )
      ) {
        this.targetLocation = undefined;
        if (this.attackTimerPassed) {
          this.attackTimer.reset();
          this.attackEntity(this.huntTarget);
        }
        return true;
      } else {
        this.huntTarget = undefined;
      }
    } else if (!this.huntPath) {
      this.huntLocation = this.context.getHomePosition();
      this.huntPath = this.pathfinder.findPath(
        this.getVoxelPosition(),
        this.huntLocation
      );
    } else if (!this.huntPath.exists()) {
      if (this.repathTimerPassed) {
        this.repathTimer.reset();
        this.huntPath.restart(this.getVoxelPosition());
      } else {
        this.targetLocation = undefined;
      }
    } else if (this.huntPath.hasNext()) {
      const result = Paths.followPath(this.huntPath, this);
      if (result === ActionResult.Stopped) {
        this.targetLocation = this.huntLocation;
      }
    } else {
      this.targetLocation = this.huntLocation;
    }

    return false;
  }

  siege(): boolean {
    if (this.siegePos) {
      const blockDef = this.context.blockManager.getDef(this.siegePos);
      if (
        !blockDef ||
        !blockDef.properties.hasHealth() ||
        !IsNode.real(minetest.get_node(this.siegePos))
      ) {
        this.siegePos = undefined;
      }
    } else if (
      this.targetLocation &&
      inRange(
        this.getVoxelPosition(),
        this.targetLocation,
        this.properties.attackRange
      )
    ) {
      const cost = this.locomotion.moveCost(this.targetLocation);
      if (Locomotion.solidNodeCost(cost) && Locomotion.passableNodeCost(cost)) {
        // Target location is solid, but passable (breakable)
        this.siegePos = this.targetLocation;
      }
    }

    if (this.siegePos) {
      if (
        inRange(
          this.getVoxelPosition(),
          this.siegePos,
          this.properties.attackRange
        )
      ) {
        this.targetLocation = undefined;
        if (this.attackTimerPassed) {
          this.attackTimer.reset();
          this.attackNode(this.siegePos);
        }
        return true;
      } else {
        this.targetLocation = this.siegePos;
      }
    }

    return false;
  }

  protected attackEntity(entity: Entity): void {
    // For override
  }

  protected attackNode(position: Vector3D): void {
    // For override
  }

  override onDecay(): void {
    // For override
    minetest.add_particle(
      DecayPoofParticle.createForEnemy(
        this.objRef.get_pos(),
        this.objRef.get_velocity()
      )
    );
  }
}
