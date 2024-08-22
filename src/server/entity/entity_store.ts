import { Entity } from 'server/entity/entity';
import { Faction } from 'server/entity/faction';
import { CONFIG } from 'utils/config';
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

// used instead of null because when array elements are nil in Lua, things get weird
const EMPTY_MARKER = 'empty' as const;
type EmptyMarker = typeof EMPTY_MARKER;

// todo: unit tests
// Storage and query of entities
// Note: BlockEntities not included!
export class EntityStore {
  // entities are sorted by x position
  private readonly entities: ReadonlyArray<Entity> = [];
  private readonly additions = new Set<Entity>();
  private readonly removals = new Set<Entity>();

  private dirty = false;

  // when updating the array, EmptyMarker is used to mark empty items
  private mutateEntities(): (Entity | EmptyMarker)[] {
    return this.entities as (Entity | EmptyMarker)[];
  }

  add(entity: Entity): void {
    Logger.trace('ES: Add', entity);
    this.dirty = true;
    this.additions.add(entity);
  }

  remove(entity: Entity): void {
    Logger.trace('ES: Remove', entity);
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

    let nearestDist = Infinity;
    let nearestEntity: Entity | undefined;

    let left = index - 1;
    let right = index;
    const length = this.entities.length;
    while (left >= 0 || right < length) {
      for (const entity of [this.entities[left], this.entities[right]]) {
        if (entity && entity.active && passesFilter(entity, filters)) {
          const entityPos = entity.objRef.get_pos();
          if (entityPos) {
            if (entityPos.x < center.x - nearestDist) {
              left = -1;
            } else if (entityPos.x > center.x + nearestDist) {
              right = length;
            } else {
              const dist = vector.distance(center, entityPos);
              if (dist < nearestDist) {
                nearestDist = dist;
                nearestEntity = entity;
              }
            }
          }
        }
      }

      left--;
      right++;
    }

    if (maxDistance != undefined && nearestDist > maxDistance) {
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
          entityPos.y >= min.y &&
          entityPos.y <= max.y &&
          entityPos.z >= min.z &&
          entityPos.z <= max.z &&
          passesFilter(entity, filters)
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
      min: vector.subtract(sphereCenter, sphereRadius),
      max: vector.add(sphereCenter, sphereRadius),
    };

    const radius2 = sphereRadius * sphereRadius;

    for (const entity of this.findVolume({ volume })) {
      const pos = entity.objRef.get_pos();
      if (
        sqDist(sphereCenter, pos) <= radius2 &&
        passesFilter(entity, filters)
      ) {
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

    try {
      if (this.removals.size > 0) {
        for (let i = 0; i < mutableEntities.length; i++) {
          const entity = mutableEntities[i];
          if (entity !== EMPTY_MARKER) {
            if (!isActive(entity)) {
              mutableEntities[i] = EMPTY_MARKER;
            } else {
              for (const removal of this.removals) {
                if (entity === removal) {
                  mutableEntities[i] = EMPTY_MARKER;
                  break;
                }
              }
            }
          }
        }

        // Sanity check
        if (CONFIG.isDev) {
          for (const entity of mutableEntities) {
            if (entity !== EMPTY_MARKER && !isActive(entity)) {
              throwError('Inactive entity remained in list after removals');
            }
          }
        }
      }

      let emptyIndex = 0;

      if (this.additions.size > 0) {
        for (const addition of this.additions) {
          if (isActive(addition)) {
            while (mutableEntities[emptyIndex]) emptyIndex++;
            mutableEntities[emptyIndex] = addition;
          }
        }

        // Sanity check
        if (CONFIG.isDev) {
          for (const entity of mutableEntities) {
            if (entity !== EMPTY_MARKER && !isActive(entity)) {
              throwError(
                'Unexpected inactive entity found in list after additions'
              );
            }
          }
        }
      }

      // Fill in holes
      if (this.removals.size > 0) {
        let filledLen = 0;
        for (let i = 0; i < mutableEntities.length; i++) {
          const cur = mutableEntities[i];
          if (cur !== EMPTY_MARKER) mutableEntities[filledLen++] = cur;
        }
        mutableEntities.length = filledLen;

        // Sanity check: No holes
        if (CONFIG.isDev) {
          for (const entity of mutableEntities) {
            if (entity === EMPTY_MARKER) throwError('Unexpected empty element');
          }
        }
      }

      this.removals.clear();
      this.additions.clear();

      // Keep list sorted
      for (let i = 0; i < mutableEntities.length; i++) {
        const cur = mutableEntities[i];
        if (cur === EMPTY_MARKER) throwError('Unexpected empty element');

        const curX = cur.objRef.get_pos().x;

        // insertion sort
        let j = i - 1;
        while (
          j >= 0 &&
          curX < (mutableEntities[j] as Entity).objRef.get_pos().x
        ) {
          mutableEntities[j + 1] = mutableEntities[j];
          j--;
        }
        mutableEntities[j + 1] = cur;
      }

      // Sanity check: Sorted
      if (CONFIG.isDev) {
        let lastX = -Infinity;
        for (const entity of this.entities) {
          const x = entity.objRef.get_pos().x;
          if (lastX > x) {
            throwError('Invariant violation: entities list is unsorted');
          }
          lastX = x;
        }
      }

      this.dirty = false;
    } catch (error) {
      Logger.error(
        'entities dump',
        mutableEntities.map((e) =>
          e === EMPTY_MARKER
            ? e
            : {
                id: e.id,
                alive: e.alive,
                pos: e.objRef.get_pos(),
              }
        )
      );
      throwError(error);
    }
  }

  // returns index of the entity having the minimum x position that's greater than or equal to the specified x position
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

function isActive(entity: Entity): boolean {
  // deactivated entities don't have positions anymore
  return entity.objRef.get_pos() != null;
}
