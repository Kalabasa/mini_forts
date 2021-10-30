import { res } from 'resource_id';
import { BallistaHeadDef } from 'server/block/ballista/ballista_head/def';
import { CrystalShieldDef } from 'server/block/core_crystal/crystal_shield/def';
import { BlockEntityScript } from 'server/block/entity_block/block_entity';
import { BeetleDef } from 'server/entity/beetle/def';
import { CrystalExplosionDef } from 'server/entity/crystal_explosion/def';
import {
  EntityDefinition,
  EntityProperties,
  EntityScript,
  LuaEntityCustomProperties,
  PersistentEntity,
} from 'server/entity/entity';
import { EntityStore } from 'server/entity/entity_store';
import { MinionDef } from 'server/entity/minion/def';
import { SlugDef } from 'server/entity/slug/def';
import { SnailDef } from 'server/entity/snail/def';
import { AddEntityEvent, RemoveEntityEvent } from 'server/game/events';
import { Game } from 'server/game/game';
import { throwError } from 'utils/error';
import { createIDGenerator } from 'utils/id';
import { Mutable } from 'utils/immutable';
import { Logger } from 'utils/logger';

const defaultObjectProperties: Partial<ObjectProperties> = {
  pointable: false,
};

export function registerEntities(game: Game, entityStore: EntityStore) {
  Logger.info('Registering entities...');

  register(BallistaHeadDef);
  register(BeetleDef);
  register(CrystalExplosionDef);
  register(CrystalShieldDef);
  register(MinionDef);
  register(SlugDef);
  register(SnailDef);

  function register<
    P extends EntityProperties,
    S extends EntityScript<P>,
    D extends EntityDefinition<P, S>
  >(def: D) {
    const { name, properties, script } = def;

    const idGenerator = createIDGenerator('Entity', name);

    const objectProperties = Object.assign(
      {},
      defaultObjectProperties,
      properties.objectProperties
    );
    const entityDef: LuaEntityProperties<LuaEntityCustomProperties<S>> = {
      initial_properties: objectProperties,

      _entity: 'unset',

      on_activate: function (staticData: string, dtime: number) {
        Logger.info(`Activating entity ${name}...`);

        const entity = new script(def, game, this.object);
        this._entity = entity;

        try {
          if (staticData.length > 0) {
            Logger.info(`Loading ${name} entity data...`);
            const data = minetest.parse_json<PersistentEntity>(staticData);
            if (data) {
              properties.persist(entity as unknown as PersistentEntity, data);
              if (entity.id == undefined) {
                entity.id = idGenerator();
                Logger.warning(
                  `While loading entity ${name}, missing ID. Auto-generated:`,
                  entity.id
                );
              }
            } else {
              Logger.warning(
                `Invalid serialized staticdata for entity ${name}:`,
                staticData
              );
              entity.id = idGenerator();
            }
          } else {
            entity.id = idGenerator();
          }
        } catch (error) {
          Logger.warning(
            `Error parsing staticdata for entity ${name}:`,
            staticData
          );
          Logger.error(error);
        }

        if (!(entity instanceof BlockEntityScript)) {
          entityStore.add(entity);
        }

        entity.coreActivate();
        game.events.emit(new AddEntityEvent(entity));
      },

      on_deactivate: function () {
        Logger.info(`Deactivating entity ${name}...`);
        const entity = this._entity;
        if (entity === 'unset') {
          Logger.warning(
            `Can't deactivate entity ${name}; missing Entity instance!`
          );
          return;
        }

        if (!(entity instanceof BlockEntityScript)) {
          entityStore.remove(entity);
        }

        entity.coreDeactivate();

        game.events.emit(new RemoveEntityEvent(entity));
      },

      get_staticdata: function () {
        const entity = this._entity;
        if (entity === 'unset') {
          Logger.warning(`Can't save entity ${name}; missing Entity instance!`);
          return;
        }

        const internalEntity = EntityScript.asInternalEntity(entity);
        internalEntity.persistCalled = false;

        const data: Partial<PersistentEntity> = {};
        properties.persist(data, entity as unknown as PersistentEntity);

        if (data.id == undefined) {
          data.id = idGenerator();
          Logger.warning(
            `While saving entity ${name}, missing ID. Auto-generated:`,
            data.id
          );
        }

        if (!internalEntity.persistCalled) {
          throwError('super.persist() not called!');
        }

        const staticData = minetest.write_json(data);
        return staticData;
      },

      on_step: function (dtime: number, moveResult: CollisionInfo) {
        const entity = this._entity;
        if (entity === 'unset') {
          Logger.error(
            `Can't update entity ${name}; missing Entity instance! Forcing removal...`
          );
          this.object.remove();
          return;
        }

        entity.coreUpdate(dtime, moveResult);
      },
    };

    const registeredName = res(name);
    (def as Mutable<D>).registeredName = registeredName;
    minetest.register_entity(registeredName, entityDef);

    def.onRegister?.();
  }
}
