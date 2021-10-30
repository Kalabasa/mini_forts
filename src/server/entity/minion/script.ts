import { IsNode } from 'common/block/is_node';
import { BlockPhysics } from 'common/block/physics';
import { snd } from 'resource_id';
import { WorkerCapabilities } from 'server/ai/colony/worker_capabilities';
import { BlockDefinition } from 'server/block/block';
import { DoorDef } from 'server/block/door/def';
import { DoorScript } from 'server/block/door/script';
import { EntityScript } from 'server/entity/entity';
import { MinionProperties } from 'server/entity/minion/properties';
import { WorkDustParticle } from 'server/particles/work_dust/work_dust';
import { throwError } from 'utils/error';
import { equalVectors, inRange } from 'utils/math';

export enum MinionAction {
  Move = 'move',
  Build = 'build',
  Dig = 'dig',
  Operate = 'operate',
}

type Action =
  | {
      type: MinionAction.Move;
    }
  | {
      type: MinionAction.Build;
      buildPos: Vector3D;
      buildTarget: BlockDefinition.WithGhost;
      buildTime: number;
    }
  | {
      type: MinionAction.Dig;
      digPos: Vector3D;
      digTime: number;
    }
  | {
      type: MinionAction.Operate;
      operatePos: Vector3D;
    };

type ActionWithType<T extends MinionAction> = Action & {
  type: T;
};

type SerializedAction = {
  type: MinionAction;
  buildPos: Vector3D | undefined;
  buildTargetName: string | undefined;
  buildTime: number | undefined;
  digPos: Vector3D | undefined;
  digTime: number | undefined;
  operatePos: Vector3D | undefined;
};

export class MinionScript extends EntityScript<MinionProperties> {
  private _action: Action = {
    type: MinionAction.Move,
  };

  get action(): Readonly<Action> {
    return this._action;
  }

  override activate() {
    if (this._action.type === MinionAction.Build) {
      const def = this.context.blockManager.getDef(this._action.buildPos);
      if (def?.hasGhost()) {
        this._action.buildTarget = def;
      } else {
        this.endAction();
      }
    }
  }

  override update(dt: number) {
    if (this.alive) {
      if (this._action.type === MinionAction.Dig) {
        this.performDig(dt, this._action);
      } else if (this._action.type === MinionAction.Build) {
        this.performBuild(dt, this._action);
      } else if (this._action.type === MinionAction.Operate) {
        this.performOperate(dt, this._action);
      }

      const pos = this.getVoxelPosition();
      if (this.context.blockManager.getDef(pos) === DoorDef) {
        const door = this.context.blockManager.getRef<DoorScript>(pos);
        if (door) {
          door.open(this);
        }
      }
      if (
        this.targetLocation &&
        inRange(pos, this.targetLocation, 1) &&
        this.context.blockManager.getDef(this.targetLocation) === DoorDef
      ) {
        const door = this.context.blockManager.getRef<DoorScript>(
          this.targetLocation
        );
        if (door) {
          door.open(this);
        }
      }
    }
  }

  private performDig(dt: number, action: ActionWithType<MinionAction.Dig>) {
    if (!WorkerCapabilities.inWorkRange(action.digPos, this.objRef.get_pos())) {
      return this.endAction();
    }

    // stand in place
    this.targetLocation = this.getVoxelPosition();
    if (
      !this.collisionInfo.touching_ground ||
      vector.length(this.objRef.get_velocity()) > 1
    ) {
      return;
    }

    const blockRef = this.context.blockManager.getRef(action.digPos);
    if (!blockRef) {
      return this.endAction();
    }

    this.animation = this.animations.dig;
    if (action.digTime < blockRef.properties.digTime) {
      action.digTime += dt;
    } else {
      blockRef.remove();
      if (blockRef.properties.resource) {
        this.context.addResource(blockRef.properties.resource, action.digPos);
      }

      minetest.add_particle(WorkDustParticle.create(action.digPos));
      minetest.sound_play(
        snd('minion_dig'),
        { pos: action.digPos, gain: 0.2, pitch: 0.9 + Math.random() * 0.2 },
        true
      );

      return this.endAction();
    }
  }

  private performBuild(dt: number, action: ActionWithType<MinionAction.Build>) {
    if (
      !WorkerCapabilities.inWorkRange(action.buildPos, this.objRef.get_pos())
    ) {
      return this.endAction();
    }

    // stand in place
    this.targetLocation = this.getVoxelPosition();
    if (
      !this.collisionInfo.touching_ground ||
      vector.length(this.objRef.get_velocity()) > 1
    ) {
      return;
    }

    const node = minetest.get_node(action.buildPos);
    if (!IsNode.ghost(node)) {
      return this.endAction();
    }

    const blockDef = this.context.blockManager.getDefByNodeName(
      node.name,
      true
    );
    if (blockDef !== action.buildTarget) {
      return this.endAction();
    }

    if (
      blockDef.properties.resource &&
      !this.context.hasResource(blockDef.properties.resource)
    ) {
      return this.endAction();
    }

    this.animation = this.animations.build;
    if (action.buildTime < action.buildTarget.properties.ghost.buildTime) {
      action.buildTime += dt;
    } else {
      // Check clear of obstructions (entities)
      if (this.isBuildObstructed(action.buildPos)) {
        return this.endAction();
      }

      if (!BlockPhysics.canSupport(blockDef, action.buildPos)) {
        return this.endAction();
      }

      // Remove the ghost
      minetest.remove_node(action.buildPos);

      const resource = blockDef.properties.resource;
      if (resource) {
        this.context.subtractResource(
          resource,
          vector.new(
            action.buildPos.x,
            action.buildPos.y + 0.5,
            action.buildPos.z
          )
        );
      }
      this.context.setBlock(action.buildTarget, action.buildPos);

      addSmallWorkDustParticles(action.buildPos);
      minetest.sound_play(
        snd('minion_build'),
        { pos: action.buildPos, gain: 0.3, pitch: 0.9 + Math.random() * 0.2 },
        true
      );

      return this.endAction();
    }
  }

  private isBuildObstructed(pos: Vector3D) {
    return this.context.entityStore.has({
      volume: {
        min: vector.subtract(pos, 0.5),
        max: vector.add(pos, 0.5),
      },
    });
  }

  private performOperate(
    dt: number,
    action: ActionWithType<MinionAction.Operate>
  ) {
    if (
      !WorkerCapabilities.inOperateRange(
        action.operatePos,
        this.objRef.get_pos()
      )
    ) {
      return this.endAction();
    }

    // stand in place
    this.targetLocation = this.getVoxelPosition();
    if (
      !this.collisionInfo.touching_ground ||
      vector.length(this.objRef.get_velocity()) > 1
    ) {
      return;
    }

    const blockRef = this.context.blockManager.getRef(action.operatePos);
    if (!blockRef || !blockRef.isOperable()) {
      return this.endAction();
    }

    this.animation = this.animations.operate;
    blockRef.startOperation();
  }

  endAction() {
    if (this._action.type === MinionAction.Operate) {
      const blockRef = this.context.blockManager.getRef(
        this._action.operatePos
      );
      if (blockRef && blockRef.isOperable()) {
        blockRef.endOperation();
      }
    }

    this._action.type = MinionAction.Move;

    if (this.alive) {
      this.animation = this.animations.stand;
    }
  }

  protected override onDeath() {
    this.endAction();
  }

  startDigging(position: Vector3D): void {
    if (!this.collisionInfo.touching_ground) return;
    if (!WorkerCapabilities.inWorkRange(position, this.objRef.get_pos())) return;

    if (
      this._action.type !== MinionAction.Dig ||
      !equalVectors(this._action.digPos, position)
    ) {
      const node = minetest.get_node(position);

      if (!IsNode.diggable(node)) return;

      this._action = {
        type: MinionAction.Dig,
        digPos: position,
        digTime: 0,
      };
    }
  }

  startBuilding(position: Vector3D): void {
    if (!this.collisionInfo.touching_ground) return;
    if (!WorkerCapabilities.inWorkRange(position, this.objRef.get_pos())) return;

    if (
      this._action.type !== MinionAction.Build ||
      !equalVectors(this._action.buildPos, position)
    ) {
      const node = minetest.get_node(position);

      if (!IsNode.ghost(node)) return;
      if (this.isBuildObstructed(position)) return;

      const block = this.context.blockManager.getDefByNodeName(
        node.name,
        true
      ) as BlockDefinition.WithGhost;

      if (!BlockPhysics.canSupport(block, position)) return;

      this._action = {
        type: MinionAction.Build,
        buildPos: position,
        buildTarget: block,
        buildTime: 0,
      };
    }
  }

  startOperating(position: Vector3D): void {
    if (!this.collisionInfo.touching_ground) return;
    if (!WorkerCapabilities.inOperateRange(position, this.objRef.get_pos()))
      return;

    if (
      this._action.type !== MinionAction.Operate ||
      !equalVectors(this._action.operatePos, position)
    ) {
      const node = minetest.get_node(position);

      if (!IsNode.operable(node)) return;

      this._action = {
        type: MinionAction.Operate,
        operatePos: position,
      };
    }
  }

  get serializedAction(): SerializedAction {
    const action = this._action;
    const buildAction = this._action as Partial<Action> & {
      type: MinionAction.Build;
    };
    const digAction = this._action as Partial<Action> & {
      type: MinionAction.Dig;
    };
    const operateAction = this._action as Partial<Action> & {
      type: MinionAction.Operate;
    };
    return {
      type: action.type,
      buildPos: buildAction.buildPos,
      buildTargetName: buildAction.buildTarget?.name,
      buildTime: buildAction.buildTime,
      digPos: digAction.digPos,
      digTime: digAction.digTime,
      operatePos: operateAction.operatePos,
    };
  }

  set serializedAction(obj: SerializedAction) {
    const {
      type,
      buildPos,
      buildTargetName,
      buildTime,
      digPos,
      digTime,
      operatePos,
    } = obj;

    if (type == MinionAction.Move) {
      this._action = {
        type,
      };
    } else if (type === MinionAction.Build) {
      const buildTarget =
        buildTargetName &&
        this.context.blockManager.getDefByName(buildTargetName);
      if (
        !buildTarget ||
        !buildTarget.hasGhost() ||
        buildTarget.registry.ghost.name !== minetest.get_node(buildPos!).name
      ) {
        throwError('Invalid build target!', buildTargetName);
      }
      this._action = {
        type,
        buildPos: buildPos!,
        buildTarget,
        buildTime: buildTime ?? 0,
      };
    } else if (type === MinionAction.Dig) {
      this._action = {
        type,
        digPos: digPos!,
        digTime: digTime ?? 0,
      };
    } else if (type === MinionAction.Operate) {
      this._action = {
        type,
        operatePos: operatePos!,
      };
    } else {
      throwError('Invalid type!', type);
    }
  }
}

function addSmallWorkDustParticles(pos: Vector3D) {
  const r = 0.525;
  for (const x of $range(-1, 1, 2)) {
    for (const z of $range(-1, 1, 2)) {
      const corner = vector.new(pos.x + x * r, pos.y - 0.4, pos.z + z * r);
      minetest.add_particle(
        WorkDustParticle.createSmall(corner, { x: x * 0.2, y: 0, z: z * 0.2 })
      );
    }
  }
}
