![Defending](https://user-images.githubusercontent.com/3705081/139525275-db4eee61-e3c2-4df2-b79c-fce725f857af.gif)

# MiniForts

This is a game for [Minetest](https://www.minetest.net/).

A game about building a fort and defending against invaders.

![Building](https://user-images.githubusercontent.com/3705081/139525342-9cb4e45f-d0f4-45ec-b0af-45cad252ad1e.gif)

This project is not finished and development is paused.

**Important:** Read how to play below because this game is not finished (There are no in-game tutorials).

## How to install

0. Download and install Minetest.
1. Install from package or from source. (See next sections)
2. Enable `mini_forts` clientmod.
3. Play the game on Minetest.

#### From package

1. Download the release package from Github.
2. Extract the package.
3. Copy the contents of the extracted directory to Minetest's content directory. (i.e., copy `games` to `games`, `clientmods` to `clientmods`)
4. Enable `mini_forts` clientmod.

#### From source

1. Clone the repo.
2. Build the project.
    1. Run `yarn install` / `npm install`
    2. Run `yarn build` / `npm build`
3. Copy build outputs in `dist` to Minetest's corresponding directories.
    1. `ln -s /<repo_path>/dist/games/mini_forts /<minetest_path>/games/mini_forts`
    2. `ln -s /<repo_path>/dist/clientmods/mini_forts /<minetest_path>/clientmods/mini_forts`
4. Enable `mini_forts` clientmod.

## How to play

#### Controls

The controls are same as regular Minetest's controls, with some exceptions:

* Some blocks can be `Use`d.
* If you enabled the clientmod, building will use drag-n-drop gestures.

![Drag-build](https://user-images.githubusercontent.com/3705081/139525349-ed2056d0-b6ff-430f-8c98-49edd53ffac9.gif)

| Action | Key |
|---|---|
| Place build order / Cancel mine order | Build mouse button (default: Mouse2) |
| Place dig order / Cancel build order | Dig mouse button (default: Mouse1) |
| `Use` a block | Tap Special key (default: E) |
| While build-dragging: Lock along Y axis | Hold Special key (default: E) |
| Undo last build | Tap Drop key (default: Q) |

#### Resources

Some actions require resources. The types of resources are:

* Wood
* Stone
* Metal
* Spore

Resources can be extracted from blocks:

* Wood - from tree wood
* Stone - from ground rocks
* Metal - from ground ores (shiny rocks)
* Spore - from fertile soil (dark soil)

#### Blocks

1. **Barricade**

    Wooden spike barricade. Returns damage to attackers. Cannot be stacked.

2. **Wall**

    Stone wall.

3. **Door**

    Wooden door. Minions can pass through doors. Can be `Use`d to manually toggle.

4. **Den**

    A home for Minions. Heals wounded Minions. Can be `Use`d to spawn more Minions.

5. **Extractor**

    Extracts resources from the ground. Place directly on a resource block.

6. **Ballista**

    Weapon. Minions can operate this to defend the fort. Uses Metal as ammunition.

Player-built structures need support otherwise they will collapse.

![Collapse](https://user-images.githubusercontent.com/3705081/139525369-922885fd-4bdf-44a3-ba93-cda6be97ff8d.gif)

## License

I haven't figured this out yet. See `LICENSE` file for more information.
