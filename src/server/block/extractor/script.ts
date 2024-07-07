import { IsNode } from 'common/block/is_node';
import {
  BlockCallbacks,
  BlockDefinition,
  BlockProperties,
  BlockScript
} from 'server/block/block';
import { MineableBlockState } from 'server/block/extractor/constants';
import { ExtractorProperties } from 'server/block/extractor/properties';
import { ResourceType } from 'server/game/resources';
import { equalVectors } from 'utils/math';

const mineTime = 90;
const harvestTime = 2;

const resourceTypeToInitialState = {
  [ResourceType.Metal]: 'metal',
  [ResourceType.Spore]: 'spore',
  [ResourceType.Stone]: 'stone',
  [ResourceType.Wood]: 'wood',
} as const;

export class ExtractorScript
  extends BlockScript<ExtractorProperties>
  implements BlockCallbacks<ExtractorProperties>
{
  private resourceType: ResourceType | undefined;

  override initializeNode() {
    const resourceType = this.findResourceType();
    this.resourceType = resourceType;

    super.initializeNode(getState(resourceType, false));
    this.takeRoot();
  }

  override activate() {
    if (!this.resourceType) {
      this.resourceType = this.findResourceType();
    }

    if (!this.isRipe()) {
      const timer = this.getTimer();
      if (!timer.is_started()) {
        timer.start(mineTime);
      }
    }
  }

  onTimer() {
    if (!this.resourceType) return;

    if (this.isRipe()) {
      this.finishHarvest();
    } else {
      this.setRipe(true);
    }
  }

  startOperation() {
    if (!this.isRipe()) return;

    const timer = this.getTimer();
    if (!timer.is_started()) {
      timer.start(harvestTime);
    }
  }

  endOperation() {
    if (!this.isRipe()) return;

    this.getTimer().stop();
  }

  finishHarvest() {
    if (!this.resourceType || !this.isRipe()) return;

    let amount = 0;
    let depleted = false;

    const y = this.position.y - 1;
    for (const x of $range(this.position.x - 1, this.position.x + 1)) {
      for (const z of $range(this.position.z - 1, this.position.z + 1)) {
        const groundPos = { x, y, z };
        const block = this.getMineableBlock(groundPos);
        if (block) {
          const ref =
            this.context.blockManager.getRef<
              BlockScript<MineableBlockProperties>
            >(groundPos);
          const health = ref.getHealth();
          if (health === 1 && x === this.position.x && z === this.position.z) {
            depleted = true;
            this.remove();
          }
          if (health > 0) {
            ref.damage(1);
            amount += block.properties.miningResource.amount;
          }
        }
      }
    }

    if (amount > 0) {
      this.context.addResource(
        { type: this.resourceType, amount },
        {
          x: this.position.x,
          y: this.position.y + 0.5,
          z: this.position.z,
        }
      );
    }

    if (!depleted) {
      this.setRipe(false);
      this.getTimer().start(mineTime);
    }
  }

  private isRipe() {
    return this.getData().ripeExtractor;
  }

  private setRipe(ripe: boolean) {
    if (this.isRipe() !== ripe) {
      if (!this.resourceType) {
        this.changeState(getState(this.resourceType, ripe));
      }
      this.getData().ripeExtractor = ripe;
    }
  }

  private takeRoot() {
    if (!this.resourceType) return;

    const y = this.position.y - 1;
    for (const x of $range(this.position.x - 1, this.position.x + 1)) {
      for (const z of $range(this.position.z - 1, this.position.z + 1)) {
        this.tryTakeRootBlock({ x, y, z });
      }
    }
  }

  private tryTakeRootBlock(groundPos: Vector3D) {
    if (!this.getMineableBlock(groundPos)) return;

    const ref =
      this.context.blockManager.getRef<BlockScript<MineableBlockProperties>>(
        groundPos
      );

    ref.changeState(MineableBlockState.MYCELIAL);
  }

  private getMineableBlock(
    groundPos: Vector3D
  ): BlockDefinition<MineableBlockProperties> | undefined {
    if (!this.resourceType) return undefined;

    const abovePos = {
      x: groundPos.x,
      y: groundPos.y + 1,
      z: groundPos.z,
    };

    if (
      !equalVectors(abovePos, this.position) &&
      !IsNode.air(minetest.get_node(abovePos))
    ) {
      return undefined;
    }

    const def = this.context.blockManager.getDef(groundPos);
    if (!def) return undefined;

    const { properties } = def;

    if (!isMineable(properties)) return undefined;

    if (properties.miningResource.type !== this.resourceType) {
      return undefined;
    }

    return def as BlockDefinition<typeof properties>;
  }

  private findResourceType(): ResourceType | undefined {
    const blockUnder = this.context.blockManager.getDef({
      x: this.position.x,
      y: this.position.y - 1,
      z: this.position.z,
    });
    return blockUnder?.properties.miningResource?.type;
  }
}

type MineableBlockProperties = BlockProperties & {
  miningResource: NonNullable<BlockProperties['miningResource']>;
  nodeDefinition: {
    [MineableBlockState.MYCELIAL]: NodeDefinition;
    [MineableBlockState.EXMYCELIAL]: NodeDefinition;
  };
};

function isMineable(
  properties: BlockProperties
): properties is MineableBlockProperties {
  return (
    properties.miningResource != undefined &&
    properties.nodeDefinition[MineableBlockState.MYCELIAL] != undefined &&
    properties.nodeDefinition[MineableBlockState.EXMYCELIAL] != undefined
  );
}

function getState(resourceType: ResourceType | undefined, ripe: boolean) {
  const ripeSuffix = ripe ? 'Ripe' : '';
  return resourceType
    ? concat(resourceTypeToInitialState[resourceType], ripeSuffix)
    : 'default';
}

function concat<A extends string, B extends string>(a: A, b: B) {
  return (a + b) as `${A}${B}`;
}
