import { IsNode } from 'common/block/is_node';
import { FertileSoilDef } from 'server/block/fertile_soil/def';
import { BeetleProperties } from 'server/entity/beetle/properties';
import { EnemyEntityScript } from 'server/entity/enemy_entity/enemy_entity';
import { Entity } from 'server/entity/entity';
import { ResourceType } from 'server/game/resources';
import { randomInt } from 'utils/math';
import { CountdownTimer } from 'utils/timer';

export class BeetleScript extends EnemyEntityScript<BeetleProperties> {
  private carrying = true;
  private placeTimer = new CountdownTimer(0.5);

  override get animations() {
    return this.carrying
      ? this.properties.carryingAnimations
      : this.properties.unburdenedAnimations;
  }

  override get locomotion() {
    return this.carrying
      ? this.properties.carryingLocomotion
      : this.properties.unburdenedLocomotion;
  }

  override update(dt: number): void {
    if (!this.placeTimer.updateAndCheck(dt)) return;
    if (this.collisionInfo.touching_ground) {
      if (this.siege()) return;
      if (this.hunt()) return;
    }
  }

  protected override canAttackEntities(): boolean {
    return !this.carrying;
  }

  protected override attackEntity(entity: Entity): void {
    this.animation = this.animations.attack;
    this.restartAnimation();
    entity.damage(1, this);
  }

  protected override attackBlock(position: Vector3D) {
    if (this.carrying) {
      if (this.isGoodPlacement(this.getVoxelPosition(), position)) {
        this.placeDung();
        this.siegePos = undefined;
        this.huntPath = undefined;
      }
      return;
    }

    this.animation = this.animations.attack;
    this.restartAnimation();

    const blockRef = this.context.blockManager.getRef(position);
    if (blockRef) {
      blockRef.damage(2, this);
    }
  }

  private isGoodPlacement(pos: Vector3D, obstaclePos: Vector3D): boolean {
    return (
      !IsNode.solid(minetest.get_node(vector.offset(pos, 0, 1, 0))) &&
      !IsNode.solid(minetest.get_node(vector.offset(pos, 0, 2, 0))) &&
      (this.locomotion.moveCost(vector.offset(obstaclePos, 0, 1, 0)) <
        Infinity ||
        this.locomotion.moveCost(vector.offset(obstaclePos, 0, 2, 0)) <
          Infinity)
    );
  }

  private placeDung(): boolean {
    if (!this.carrying) return false;
    const pos = this.getVoxelPosition();
    this.objRef.set_pos(vector.offset(pos, 0, 0.5, 0));
    this.context.setBlock(FertileSoilDef, pos);
    this.carrying = false;
    this.placeTimer.reset();
    this.animation = this.properties.unburdenedAnimations.stand;
    return true;
  }

  override onDecay(): void {
    this.context.addResource(
      { type: ResourceType.Spore, amount: randomInt(4, 6) },
      this.objRef.get_pos()
    );
  }
}
