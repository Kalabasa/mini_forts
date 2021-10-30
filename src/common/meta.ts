import { metaKey } from 'resource_id';
import { Logger } from 'utils/logger';
import { PositionalLRUCache } from 'utils/lru_cache';

export const Meta = {
  get: getMeta,
};

const metaKeys = {
  markedForDig: metaKey('marked_for_dig'),
  effectActive: metaKey('effect_active'),
};

export type NodeMeta = {
  hasDigMark: boolean;
  effectActive: boolean;
};

class MetaFacade implements NodeMeta {
  private readonly meta: NodeMetaRef;

  constructor(private readonly position: Vector3D) {
    this.meta = minetest.get_meta(this.position);
  }

  getMeta(): NodeMetaRef {
    return this.meta;
  }

  get hasDigMark(): boolean {
    return this.getMeta().get(metaKeys.markedForDig) === 'y';
  }

  set hasDigMark(value: boolean) {
    this.getMeta().set_string(metaKeys.markedForDig, value ? 'y' : '');
  }

  get effectActive(): boolean {
    return this.getMeta().get(metaKeys.effectActive) === 'y';
  }

  set effectActive(value: boolean) {
    this.getMeta().set_string(metaKeys.effectActive, value ? 'y' : '');
  }

  [Logger.Props]() {
    return {
      hasDigMark: this.hasDigMark,
      effectActive: this.effectActive,
    };
  }
}

const cache = new PositionalLRUCache<NodeMeta>(2);

function getMeta(position: Vector3D): NodeMeta {
  const cached = cache.get(position);
  if (cached) return cached;
  const meta = new MetaFacade(position);
  cache.set(position, meta);
  return meta;
}
