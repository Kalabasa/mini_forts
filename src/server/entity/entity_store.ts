import { Entity } from 'server/entity/entity';
import { Faction } from 'server/entity/faction';
import { throwError } from 'utils/error';
import { Logger } from 'utils/logger';
import { sqDist } from 'utils/math';

export type EntityQuery = (NearestQuery | VolumeQuery | SphereQuery) &
  EntityFilters;

type NearestQuery = {
  nearest: Vector3D;
  maxDistance: number;
};

type VolumeQuery = {
  volume: { min: Vector3D; max: Vector3D };
};

type SphereQuery = {
  sphereCenter: Vector3D;
  sphereRadius: number;
};

type EntityFilters = {
  alive?: boolean;
  faction?: Faction;
  damageable?: boolean;
  filter?: (this: void, entity: Entity) => boolean;
};

type QueryResult<T extends EntityQuery> = T extends NearestQuery
  ? Entity | undefined
  : IterableIterator<Entity>;

// Storage and query of entities
// Note: BlockEntities not included!
export class EntityStore {
  // entities are sorted by x position
  private readonly entities: ReadonlyArray<Entity> = [];
  private readonly additions = new Set<Entity>();
  private readonly removals = new Set<Entity>();

  private dirty = false;

  // when updating the array, temporarily setting undefined is allowed
  private mutateEntities(): (Entity | undefined)[] {
    return this.entities as (Entity | undefined)[];
  }

  add(entity: Entity): void {
    this.dirty = true;
    this.additions.add(entity);
  }

  remove(entity: Entity): void {
    this.dirty = true;
    this.removals.add(entity);
    this.additions.delete(entity);
  }

  clear(): void {
    this.dirty = false;
    this.mutateEntities().length = 0;
    this.additions.clear();
    this.removals.clear();
  }

  find<T extends EntityQuery>(query: T): QueryResult<T>;
  find(query: EntityQuery): QueryResult<any> {
    this.maybeRebuild();

    if (queryIsVolume(query)) {
      return this.findVolume(query);
    } else if (queryIsSphere(query)) {
      return this.findSphere(query);
    } else if (queryIsNearest(query)) {
      return this.findNearest(query);
    }
  }

  count(query: EntityQuery): number {
    this.maybeRebuild();

    if (queryIsNearest(query)) {
      return this.findNearest(query) ? 1 : 0;
    }

    const iterator = this.find(query);

    let count = 0;
    while (!iterator.next().done) count++;
    return count;
  }

  has(query: EntityQuery): boolean {
    this.maybeRebuild();

    if (queryIsNearest(query)) {
      return this.findNearest(query) != undefined;
    }

    return !this.find(query).next().done;
  }

  private findNearest(
    query: NearestQuery & EntityFilters
  ): QueryResult<NearestQuery> {
    const { nearest: center, maxDistance, ...filters } = query;

    const index = this.findIndex(center.x);

    let nearestDist2 = Infinity;
    let nearestEntity: Entity | undefined;

    let left = index - 1;
    let right = index;
    const length = this.entities.length;
    while (left >= 0 || right < length) {
      for (const entity of [this.entities[left], this.entities[right]]) {
        if (entity && entity.active && passesFilter(entity, filters)) {
          const entityPos = entity.objRef.get_pos();
          if (entityPos) {
            if (entityPos.x < center.x - nearestDist2) {
              left = -1;
            } else if (entityPos.x > center.x + nearestDist2) {
              right = length;
            } else {
              const dist2 = sqDist(center, entityPos);
              if (dist2 < nearestDist2) {
                nearestDist2 = dist2;
                nearestEntity = entity;
              }
            }
          }
        }
      }

      left--;
      right++;
    }

    if (maxDistance != undefined && nearestDist2 > maxDistance) {
      return undefined;
    }

    return nearestEntity;
  }

  private *findVolume(
    query: VolumeQuery & EntityFilters
  ): QueryResult<VolumeQuery> {
    const {
      volume: { min, max },
      ...filters
    } = query;

    let index = this.findIndex(min.x);
    const length = this.entities.length;
    while (index < length) {
      const entity = this.entities[index];
      const entityPos = entity.objRef.get_pos();

      if (entityPos) {
        if (entityPos.x > max.x) {
          break;
        }

        if (
          entity.active &&
          passesFilter(entity, filters) &&
          entityPos.y >= min.y &&
          entityPos.y <= max.y &&
          entityPos.z >= min.z &&
          entityPos.z <= max.z
        ) {
          yield entity;
        }
      }

      index++;
    }
  }

  private *findSphere(
    query: SphereQuery & EntityFilters
  ): QueryResult<SphereQuery> {
    const { sphereCenter, sphereRadius, ...filters } = query;

    const volume = {
      min: vector.subtract(vector.new(sphereCenter), sphereRadius),
      max: vector.add(vector.new(sphereCenter), sphereRadius),
    };

    const radius2 = sphereRadius * sphereRadius;

    for (const entity of this.findVolume({ volume, ...filters })) {
      const pos = entity.objRef.get_pos();
      if (sqDist(sphereCenter, pos) <= radius2) {
        yield entity;
      }
    }
  }

  onStep(dt: number) {
    this.dirty = true;
  }

  maybeRebuild(): void {
    if (!this.dirty) return;

    const mutableEntities = this.mutateEntities();

    // deactivated entities don't have positions anymore
    for (let i = 0; i < this.entities.length; i++) {
      const entity = this.entities[i];
      if (!entity.objRef.get_pos()) {
        mutableEntities[i] = undefined;
      } else {
        for (const removal of this.removals) {
          if (entity === removal) {
            mutableEntities[i] = undefined;
            break;
          }
        }
      }
    }

    this.removals.clear();

    // Pass through the list for
    // * sorting by x (insertion sort)
    // * collapsing removed items
    try {
      let sortedLen = 0;
      for (let i = 0; i < mutableEntities.length; i++) {
        const cur = mutableEntities[i];
        if (cur) {
          const curX = cur.objRef.get_pos().x;

          let j = sortedLen - 1;
          // all items to the left of j are sorted and defined
          while (j >= 0 && curX < mutableEntities[j]!.objRef.get_pos().x) {
            mutableEntities[j + 1] = mutableEntities[j];
            j--;
          }
          mutableEntities[j + 1] = cur;

          sortedLen++;
        }
      }

      mutableEntities.length = sortedLen;
    } catch (error) {
      Logger.error(
        'entities',
        mutableEntities.map(
          (e) =>
            e && {
              id: e.id,
              alive: e.alive,
              pos: e.objRef.get_pos(),
            }
        )
      );
      throwError(error);
    }

    for (const addition of this.additions) {
      if (!addition.objRef.get_pos()) {
        this.additions.delete(addition);
      }
    }

    // insert new items
    if (this.additions.size > 0) {
      for (let i = this.entities.length - 1; i >= -this.additions.size; i--) {
        let insert: Entity | undefined;

        const cur = this.entities[i];
        if (i >= 0) {
          const curX = cur.objRef.get_pos().x;
          for (const addition of this.additions) {
            if (curX < addition.objRef.get_pos().x) {
              insert = addition;
              break;
            }
          }
        } else {
          // i < 0
          insert = this.additions.values().next().value;
        }

        if (insert) {
          mutableEntities[++i] = insert;
          this.additions.delete(insert);

          if (this.additions.size === 0) break;
          i++; // reevaluate the newly added item
        } else {
          mutableEntities[i + this.additions.size] = cur;
        }
      }
    }

    this.dirty = false;
  }

  // returns index of the entity having the minimum x position that greater than or equal to the specified x position
  // if multiple entities have the same minimum x positions, the index of the entitiy with the lowest index is returned
  private findIndex(x: number): number {
    let l = 0;
    let r = this.entities.length;

    while (l < r) {
      const m = Math.floor((l + r) * 0.5);
      if (x > this.entities[m].objRef.get_pos().x) {
        l = m + 1;
      } else {
        r = m;
      }
    }

    return l;
  }
}

function queryIsNearest(query: EntityQuery): query is NearestQuery {
  return 'nearest' in query;
}

function queryIsVolume(query: EntityQuery): query is VolumeQuery {
  return 'volume' in query;
}

function queryIsSphere(query: EntityQuery): query is SphereQuery {
  return 'sphereCenter' in query;
}

function passesFilter(entity: Entity, filters: EntityFilters): boolean {
  return (
    (filters.faction == undefined || entity.faction === filters.faction) &&
    (filters.alive == undefined || entity.alive === filters.alive) &&
    (filters.damageable == undefined ||
      entity.health < Infinity === filters.damageable) &&
    (filters.filter == undefined || filters.filter(entity))
  );
}
