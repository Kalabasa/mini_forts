import { metaKey, res, tex } from 'resource_id';

const uiUnit = 4;

// global constants
export const globals = {
  interaction: {
    mainInventoryList: 'main',
    range: 20,
    maxSize: 144,
    channelName: 'mini_forts_interaction',
  },
  metaKeys: {
    gameData: metaKey('game_data'),
  },
  textures: {
    blank: tex('blank.png'),
  },
  markers: {
    digMarker: res('dig_marker'),
  },
  nodes: {
    barrier: res('barrier'),
  },
  colors: {
    uiBlue: 0x1359ff,
    uiRed: 0xfd3763,
    white: 0xfff4e5,
    blue: 0x87c5d4,
  },
  ui: {
    // Do not change values, unless all UI graphics are changed accordingly
    pixelScale: 4,
    unit: uiUnit,
    miniSize: uiUnit * 3,
    tinySize: uiUnit * 8,
    smallSize: uiUnit * 16,
    mediumSize: uiUnit * 32,
    largeSize: uiUnit * 48,
    veryLargeSize: uiUnit * 64,
  },
};
