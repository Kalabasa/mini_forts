import { IsNode } from 'common/block/is_node';
import {
  BlockCallbacks,
  BlockDefinition,
  BlockProperties,
  BlockScript,
  BlockState,
} from 'server/block/block';
import { MineableBlockState } from 'server/block/extractor/constants';
import { ExtractorProperties } from 'server/block/extractor/properties';
import { ResourceType } from 'server/game/resources';
import { equalVectors } from 'utils/math';

const mineInterval = 12;

const resourceTypeStateMap = defineResourceTypeStateMap({
  [ResourceType.Metal]: 'metal',
  [ResourceType.Spore]: 'spore',
  [ResourceType.Stone]: 'stone',
  [ResourceType.Wood]: 'wood',
});

export class ExtractorScript
  extends BlockScript<ExtractorProperties>
  implements BlockCallbacks<ExtractorProperties>
{
  private resourceType: ResourceType | undefined;

  override initializeNode() {
    const resourceType = this.findResourceType();
    this.resourceType = resourceType;

    super.initializeNode(stateFromResourceType(resourceType));
    this.takeRoot();

    this.getTimer().start(mineInterval);
  }

  override activate() {
    if (!this.resourceType) {
      this.resourceType = this.findResourceType();
    }

    const timer = this.getTimer();
    if (!timer.is_started()) {
      timer.start(mineInterval);
    }
  }

  onTimer() {
    this.updateState();

    if (this.resourceType) {
      let amount = 0;

      const y = this.position.y - 1;
      for (const x of $range(this.position.x - 1, this.position.x + 1)) {
        for (const z of $range(this.position.z - 1, this.position.z + 1)) {
          const groundPos = { x, y, z };
          const block = this.getMineableBlock(groundPos);
          if (block) {
            amount += 1;
          }
        }
      }

      this.context.addResource(
        { type: this.resourceType, amount },
        {
          x: this.position.x,
          y: this.position.y + 0.5,
          z: this.position.z,
        }
      );
    }

    this.getTimer().start(mineInterval);
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

    // todo: check remaining resources
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

  private updateState() {
    const resourceType = this.findResourceType();
    if (resourceType !== this.resourceType) {
      this.changeState(stateFromResourceType(resourceType));
      this.resourceType = resourceType;
    }
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

function stateFromResourceType(
  resourceType: ResourceType | undefined
): BlockState<ExtractorProperties> {
  return resourceType ? resourceTypeStateMap[resourceType] : 'default';
}

function defineResourceTypeStateMap<
  T extends Record<
    ResourceType,
    Exclude<BlockState<ExtractorProperties>, 'default'>
  >
>(map: T): T {
  return map;
}
