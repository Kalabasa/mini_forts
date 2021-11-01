This is an overview of features provided by the "engine" on top of Minetest.

## GUI Engine

The game includes a GUI engine that uses a functional reactive paradigm. UI components are defined via [JSX](https://reactjs.org/docs/introducing-jsx.html), which produce "primitive UI elements" or nodes (e.g., containers, text, images). These elements are rendered via a combination of Minetest's formspecs and HUD API.

#### Example UI: The game HUD

https://github.com/Kalabasa/mini_forts/blob/0034d60cfd18f0b825e4b06d26e7537b62433c13/src/common/gui/game_hud/game_hud.tsx#L9-L60

https://github.com/Kalabasa/mini_forts/blob/0034d60cfd18f0b825e4b06d26e7537b62433c13/src/server/register/register_hud.tsx#L14-L38


## Autotile

Description is WIP

## Block abstraction

Description is WIP

## Pathfinding

Description is WIP
