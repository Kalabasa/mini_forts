This is an overview of features provided by the "engine" on top of Minetest.

## GUI Engine

The game includes a GUI engine that uses a functional reactive paradigm.

UI components are defined via [JSX](https://reactjs.org/docs/introducing-jsx.html). At runtime, this produces a tree of "primitive UI elements" (nodes such as containers, text, and images). These elements are rendered via a combination of Minetest's formspecs and HUD API.

In the future, [direct primitive 2D drawing](https://github.com/minetest/minetest/pull/10801) could be introduced to the Minetest API, and this engine would be able to use that instead of the HUD API for more control over rendering.

### Example UI: The game HUD

![gamehud](https://user-images.githubusercontent.com/3705081/139624336-6ebb24ff-3bdd-43f6-9bfe-e3baef5c57db.png)

This game HUD is described in [JSX functional code](https://github.com/Kalabasa/mini_forts/blob/0034d60cfd18f0b825e4b06d26e7537b62433c13/src/common/gui/game_hud/game_hud.tsx#L9-L60):

```tsx
export const GameHUD = ({ wood, stone, metal, spore }: GameHUDProps) => (
  <Frame x={1} y={0} margin={globals.ui.tinySize}>
    <GridLayout columns={2} rows={4} gap={globals.ui.miniSize}>
      <ResourceImage texture={tex('wood_icon.png')} />
      <ResourceNumber number={wood} />
      <ResourceImage texture={tex('stone_icon.png')} />
      <ResourceNumber number={stone} />
      <ResourceImage texture={tex('metal_icon.png')} />
      <ResourceNumber number={metal} />
      <ResourceImage texture={tex('spore_icon.png')} />
      <ResourceNumber number={spore} />
    </GridLayout>
  </Frame>
);
```

The above `GameHUD` component is then ["mounted" to the GUI engine and hooked up to game events](https://github.com/Kalabasa/mini_forts/blob/3e4d870c08ae4cc483ae293017d35d6ceb4b803f/src/server/register/register_hud.tsx#L14-L38). The `GUI.State` hook up in `getResourceState` is what makes it react to real-time game data.

```tsx
export function registerHUD(game: Game, guiManager: GUIManager) {
  game.events.on(AddPlayerEvent, (event) => {
    guiManager.mount(
      event.player,
      mountID,
      <GameHUD
        wood={getResourceState(game, ResourceType.Wood)}
        stone={getResourceState(game, ResourceType.Stone)}
        metal={getResourceState(game, ResourceType.Metal)}
        spore={getResourceState(game, ResourceType.Spore)}
      />
    );
  });
  game.events.on(RemovePlayerEvent, (event) => {
    guiManager.unmount(event.player, mountID);
  });
}

function getResourceState(game: Game, type: ResourceType): GUI.State<number> {
  const state = GUI.State.createMutableState(game.getResource(type));
  game.events.on(UpdateResourcesEvent, (event) => {
    state.setValue(event.resources[type]);
  });
  return state;
}
```

## Autotile

![autotile](https://user-images.githubusercontent.com/3705081/139624435-18715a2a-ecce-46ae-b496-6351cfbf75d9.gif)

`TO DO`

## Block abstraction

`TO DO`

## Pathfinding

`TO DO`
