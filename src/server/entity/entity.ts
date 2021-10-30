import { Animation, AnimationMap } from 'server/entity/animation';
import { Faction } from 'server/entity/faction';
import { Locomotion } from 'server/entity/locomotion/locomotion';
import { GameContext } from 'server/game/context';
import { EntityDiedEvent } from 'server/game/events';
import { DecayPoofParticle } from 'server/particles/decay_poof/decay_poof';
import { HealthChangeParticle } from 'server/particles/health_change/health_change';
import { PowParticle } from 'server/particles/pow/pow';
import { throwError } from 'utils/error';
import { ID } from 'utils/id';
import { Immutable } from 'utils/immutable';
import { Logger } from 'utils/logger';
import { equalVectors, lerp, ZERO_V } from 'utils/math';
import { CountdownTimer } from 'utils/timer';

// general entity instance type
export type Entity = EntityScript;

// extract instance type from definition
export type EntityInstance<D extends EntityDefinition> =
  D extends EntityDefinition<any, infer S> ? S : never;

export type EntityDefinition<
  P extends EntityProperties = EntityProperties,
  S extends EntityScript<P> = EntityScript<P>
> = Readonly<{
  name: string;
  properties: P;
  script: EntityScriptConstructor<S>;
  registeredName: string;
  onRegister?: (this: void) => void;
}>;

export const EntityDefinition = {
  create<P extends EntityProperties, S extends EntityScript<P>>(
    name: string,
    properties: EntityPropertiesConstructor<P>,
    script: EntityScriptConstructor<S>,
    onRegister?: (this: void) => void
  ): EntityDefinition<P, S> {
    return {
      name,
      properties: new properties(),
      script,
      // will be populated on register
      registeredName: undefined as unknown as string,
      onRegister,

      [Logger.String]() {
        return `EntityDefinition(${name})`;
      },
    };
  },
};

type EntityPropertiesConstructor<P extends EntityProperties> = { new (): P };

type EntityScriptConstructor<S extends EntityScript> = {
  new (...params: ConstructorParameters<typeof EntityScript>): S;
};

export abstract class EntityProperties {
  abstract readonly faction: Faction;

  readonly health?: number;
  readonly floats?: boolean;

  readonly decayTime?: number;
  abstract readonly animations: Immutable<AnimationMap<'die'>>;
  abstract readonly locomotion: Immutable<Locomotion>;
  abstract readonly objectProperties: Immutable<ObjectProperties>;

  persist(dst: Partial<PersistentEntity>, src: PersistentEntity): void {
    EntityScript.asInternalEntity(src).persistCalled = true;
    dst['id'] = src['id'];
    dst['serializedHealth'] = src['serializedHealth'];
    dst['_animation'] = src['_animation'];
  }
}

export class EntityScript<P extends EntityProperties = EntityProperties> {
  static fromObjRef<E extends Entity>(
    objRef: ObjectRef | LuaEntitySAO<LuaEntityCustomProperties<E>>
  ): E | undefined {
    if (!('get_luaentity' in objRef)) return undefined;
    const luaEntity = objRef.get_luaentity();
    if (!luaEntity) return undefined;
    if (!(luaEntity._entity instanceof EntityScript)) return undefined;
    return luaEntity._entity;
  }

  static asInternalEntity(entity: object): InternalEntity {
    return entity as InternalEntity;
  }

  id: ID;
  readonly properties: P;
  private _active: boolean = true;

  private voxelTargetLocation: Vector3D | undefined;
  private preciseTargetLocation: Vector3D | undefined;

  private _health: number;
  private _alive: boolean = true;

  private readonly decayTimer: CountdownTimer;

  private setAnimation: Animation | undefined;
  private willRestartAnimation = false;
  private _animation: Animation | undefined;
  private animationTime: number = 0;
  private animationFrame: number = -1; // just a predicted value

  private readonly gravity;
  private boundingBox: { min: Vector3D; max: Vector3D } = {
    min: vector.new(0, 0, 0),
    max: vector.new(0, 0, 0),
  };
  collisionInfo: CollisionInfo = {
    collisions: [],
    collides: false,
    standing_on_object: false,
    touching_ground: false,
  };
  prevCollisionInfo: CollisionInfo = this.collisionInfo;

  private get serializedHealth(): number | 'inf' {
    if (this._health === Infinity) {
      return 'inf';
    } else {
      return this._health;
    }
  }

  private set serializedHealth(value: number | 'inf') {
    if (value === 'inf') {
      this._health = Infinity;
    } else {
      this._health = value;
    }
  }

  constructor(
    readonly definition: EntityDefinition<P, EntityScript<P>>,
    protected readonly context: GameContext,
    readonly objRef: LuaEntitySAO<any>
  ) {
    if (!objRef) throwError('Missing objRef!');

    this.properties = definition.properties;
    this._health = this.properties.health ?? Infinity;
    this.gravity = this.properties.floats ? ZERO_V : { x: 0, y: -10, z: 0 };
    this.decayTimer = new CountdownTimer(this.properties.decayTime ?? 1);
  }

  coreActivate() {
    this.resetGravity();

    if (this._animation) {
      this.setAnimation = this._animation;
      this.setSpriteAnimation(this._animation);
    }

    this.activate();
  }

  coreDeactivate() {
    this._active = false;
  }

  coreUpdate(dt: number, moveResult: CollisionInfo) {
    this.prevCollisionInfo = this.collisionInfo;
    this.collisionInfo = moveResult;

    if (this._alive) {
      this.locomotion.update(
        dt,
        this,
        this.collisionInfo,
        this.prevCollisionInfo,
        this.preciseTargetLocation
      );
    }

    this.update(dt);

    if (this._alive && this._health <= 0) {
      this._alive = false;

      this.setAnimation = this.getBaseAnimations().die;

      this.resetGravity();
      this.objRef.set_velocity(ZERO_V);

      this.onDeath();

      this.setSpriteAnimation(this.setAnimation);
      this.context.events.emit(new EntityDiedEvent(this));
    }

    if (this._alive) {
      if (this.setAnimation && this._animation !== this.setAnimation) {
        this._animation = this.setAnimation;
        this.setSpriteAnimation(this.setAnimation);
      } else if (this._animation && this.willRestartAnimation) {
        this.willRestartAnimation = false;
        this.setSpriteAnimation(this._animation);
      }

      // This should be client-side but there is no other way.
      if (this._animation?.frameDuration) {
        const loopDuration =
          this._animation.numFrames * this._animation.frameDuration;

        const frame = Math.floor(
          this._animation.numFrames * (this.animationTime / loopDuration)
        );

        if (this.animationFrame !== frame) {
          this.animationFrame = frame;

          if (this._animation.frameSounds) {
            const frameSound = this._animation.frameSounds[frame];
            if (frameSound) {
              Animation.playFrameSound(frameSound, this.objRef.get_pos());
            }
          }
        }

        this.animationTime += dt;
        if (this.animationTime >= loopDuration) {
          this.animationTime -= loopDuration;
        }
      }
    } else {
      if (this.decayTimer.updateAndCheck(dt)) {
        this.onDecay();
        this.objRef.remove();
      }
    }
  }

  set targetLocation(value: Vector3D | undefined) {
    if (value == undefined) {
      this.voxelTargetLocation = undefined;
      this.preciseTargetLocation = undefined;
    } else if (
      this.voxelTargetLocation == undefined ||
      !equalVectors(this.voxelTargetLocation, value)
    ) {
      this.voxelTargetLocation = value;

      const collisionBox = this.objRef.get_properties().collisionbox;

      this.preciseTargetLocation = {
        x: value.x - (collisionBox[0] + collisionBox[3]) * 0.5,
        y: value.y + collisionBox[4] - 0.5,
        z: value.z - (collisionBox[2] + collisionBox[5]) * 0.5,
      };
    }
  }

  get targetLocation(): Vector3D | undefined {
    return this.voxelTargetLocation;
  }

  get active(): boolean {
    return this._active;
  }

  get alive(): boolean {
    return this._alive;
  }

  get maxHealth(): number {
    return this.properties.health ?? Infinity;
  }

  get health(): number {
    return this._health;
  }

  damage(amount: number, source?: Entity | Vector3D): number {
    if (!this._alive) return 0;
    if (amount <= 0) return 0;

    this.onDamage({
      amount,
      reduce(delta: number): number {
        const old = amount;
        amount = Math.max(0, amount - delta);
        return old - amount;
      },
    });

    const pos = this.objRef.get_pos();
    let fxPos;
    if (source) {
      const sourcePos = 'z' in source ? source : source.objRef.get_pos();
      const box = this.getBoundingBox();
      const dir = vector.direction(pos, sourcePos);
      fxPos = {
        x: lerp(box.min.x, box.max.x, 0.5 + dir.x * 0.25),
        y: lerp(box.min.y, box.max.y, 0.5 + dir.y * 0.25),
        z: lerp(box.min.z, box.max.z, 0.5 + dir.z * 0.25),
      };
    } else {
      fxPos = pos;
    }

    amount = Math.floor(amount);

    minetest.add_particle(HealthChangeParticle.create(-amount, this));

    if (amount === 0) {
      minetest.add_particle(PowParticle.createBlocked(fxPos));
      return 0;
    }

    this._health -= amount;

    fxPos.y = Math.max(fxPos.y, pos.y + 0.05);
    minetest.add_particle(
      PowParticle.create(
        fxPos,
        vector.multiply(this.objRef.get_velocity(), 0.5)
      )
    );

    return amount;
  }

  heal(amount: number): number {
    if (!this._alive) return 0;
    if (!this.properties.health) return 0;
    if (amount <= 0 || this._health >= this.properties.health) return 0;
    minetest.add_particle(HealthChangeParticle.create(amount, this));
    this._health = Math.min(this.maxHealth, this._health + amount);
    return amount;
  }

  set animation(animation: Animation | undefined) {
    this.setAnimation = animation;
  }

  get animation(): Animation | undefined {
    return this.setAnimation;
  }

  private setSpriteAnimation(animation: Animation) {
    // Hack: Minetest does not reset the animation frame from the prev animation
    // This hopefully will reset the frame so we can start the next animation properly
    this.objRef.set_sprite(animation.startFrame, 0, 0);

    // delay must match server tick
    minetest.after(0.05, () => {
      this.objRef.set_sprite(
        animation.startFrame,
        animation.numFrames,
        animation.frameDuration,
        animation.perDirection
      );
      this.animationTime = 0;
    });
  }

  restartAnimation() {
    this.willRestartAnimation = true;
  }

  isHostile(entity: Entity): boolean {
    return this.faction !== entity.faction;
  }

  resetGravity(): void {
    this.objRef.set_acceleration(this.gravity);
  }

  getVoxelPosition(): Vector3D {
    return vector.round(this.objRef.get_pos());
  }

  getBoundingBox(): { min: Vector3D; max: Vector3D } {
    const pos = this.objRef.get_pos();
    const box = this.objRef.get_properties().collisionbox;
    this.boundingBox.min.x = pos.x + box[0];
    this.boundingBox.min.y = pos.y + box[1];
    this.boundingBox.min.z = pos.z + box[2];
    this.boundingBox.max.x = pos.x + box[3];
    this.boundingBox.max.y = pos.y + box[4];
    this.boundingBox.max.z = pos.z + box[5];
    return this.boundingBox;
  }

  protected activate() {
    // For override
  }

  protected update(dt: number) {
    // For override
  }

  protected onDamage(damage: EntityDamage): void {
    // For override
  }

  protected onDeath(): void {
    // For override
  }

  protected onDecay(): void {
    // For override
    minetest.add_particle(
      DecayPoofParticle.create(
        this.objRef.get_pos(),
        this.objRef.get_velocity()
      )
    );
  }

  get animations(): this['properties']['animations'] {
    return this.properties.animations;
  }

  get locomotion(): Locomotion {
    return this.properties.locomotion;
  }

  get faction(): Faction {
    return this.properties.faction;
  }

  private getBaseAnimations(): AnimationMap<'die'> {
    return this.properties.animations;
  }

  [Logger.String](): string {
    return `${this.constructor.name}('${this.id}')`;
  }
}

export type EntityDamage = {
  readonly amount: number;
  reduce(delta: number): number;
};

export type PersistentEntity = Record<
  string,
  number | string | boolean | undefined
> & {
  _persistentEntity: never;
};

export type InternalEntity = {
  persistCalled: boolean;
};

export interface LuaEntityCustomProperties<T extends Entity> {
  _entity: T | 'unset';
}
