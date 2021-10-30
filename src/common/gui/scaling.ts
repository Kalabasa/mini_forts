export const Scaling = {
  hudScaling,
  guiScaling,
  hud2guiFactor,
  displayDensity,
};

function hudScaling(): number {
  return 1.0; // todo: get from client's minetest.conf (`hud_scaling`)
}

function guiScaling(): number {
  return 1.0; // todo: get from client's minetest.conf (`gui_scaling`)
}

// 1 GUI unit = 0.5555 * displayDensity * 96 * gui_scaling
// 1 HUD unit = displayDensity * hud_scaling
function hud2guiFactor(): number {
  return hudScaling() / (0.5555 * 96 * guiScaling());
}

function displayDensity(): number {
  return 96 / 72; // todo: ??? get from engine ???
}
