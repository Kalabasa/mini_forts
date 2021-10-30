import conf from './conf.generated';
const { gameName } = conf;

/** @noSelf */
export function res(s) {
  return `${gameName}:${s}`;
}

// Could use webpack to import textures and generate texture names
/** @noSelf */
export function tex(name, ...append) {
  return `${gameName}_${name}` + append.join('');
}

/** @noSelf */
export function snd(name) {
  return `${gameName}_${name}`;
}

/** @noSelf */
export function metaKey(name) {
  return `${gameName}:${name}`;
}
