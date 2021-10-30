import {
  BlockCallbacks,
  BlockProperties,
  BlockScript,
  BlockScriptConstructor,
} from 'server/block/block';
import {
  BlockEntity,
  BlockEntityProperties,
} from 'server/block/entity_block/block_entity';
import {
  EntityDefinition,
  EntityInstance,
  EntityScript,
} from 'server/entity/entity';
import { throwError } from 'utils/error';

export function EntityBlockProperties<
  D extends EntityDefinition<BlockEntityProperties, BlockEntity>
>(entityDef: D) {
  abstract class EntityBlockProperties extends BlockProperties {
    override scriptCallbacks = this.defineCallbacks({
      onDestroy: true,
    });

    readonly entityDefinition: D = entityDef;
  }
  return EntityBlockProperties;
}

type PropertiesInstance = InstanceType<
  ReturnType<typeof EntityBlockProperties>
>;

// extract entity instance type
type PropertiesEntityInstance<P extends PropertiesInstance> = EntityInstance<
  P['entityDefinition']
>;

export class EntityBlockScript<P extends PropertiesInstance>
  extends BlockScript<P>
  implements BlockCallbacks<PropertiesInstance>
{
  static asClass2<P extends PropertiesInstance>() {
    return this as BlockScriptConstructor<EntityBlockScript<P>>;
  }

  entity: PropertiesEntityInstance<P>;

  override initializeNode(): void {
    super.initializeNode();

    this.entity = this.context.createEntity(
      this.properties.entityDefinition,
      this.position
    ) as PropertiesEntityInstance<P>;
  }

  onDestroy(): void {
    this.entity.onDestroyBlock();
    this.entity.objRef.remove();
  }

  override activate() {
    super.activate();

    if (!this.entity) {
      const nearbyObjects = minetest.get_objects_in_area(
        vector.subtract(this.position, 0.5),
        vector.add(this.position, 0.5)
      );

      for (const obj of nearbyObjects) {
        const entity = EntityScript.fromObjRef(obj);
        if (entity && entity.definition === this.properties.entityDefinition) {
          this.entity = entity as PropertiesEntityInstance<P>;
          break;
        }
      }

      if (!this.entity) {
        throwError('Missing block entity!', this.properties.entityDefinition);
      }
    }
  }
}
