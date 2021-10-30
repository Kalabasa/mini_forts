import { Game } from 'server/game/game';
import { globals } from 'common/globals';
import { RemotePlayer } from 'server/player/remote_player';
import { Logger } from 'utils/logger';
import { toColorString } from 'utils/string';
import { Stage } from 'server/world/stage';

export function registerPlayers(game: Game) {
  Logger.info('Registering player handlers...');

  minetest.register_on_joinplayer((playerObj, lastLogin) => {
    const name = playerObj.get_player_name();

    playerObj.set_physics_override({
      speed: 3,
      jump: 0,
      gravity: 0,
      sneak: true,
    });

    playerObj.set_armor_groups({ immortal: 1 });

    playerObj.hud_set_flags({
      healthbar: false,
      wielditem: false,
      breathbar: false,
      minimap: false,
    });

    playerObj.set_sky({
      type: 'plain',
      base_color: globals.colors.blue,
      clouds: true,
    });

    playerObj.set_clouds({
      color: toColorString(globals.colors.white),
      height: Stage.size.y / 2,
    });

    playerObj.set_sun({
      sunrise_visible: false,
    });

    playerObj.set_properties({
      eye_height: 0,
      pointable: false,
      collisionbox: [-0.125, -0.125, -0.125, 0.125, 0.125, 0.125],
      physical: false,
      collide_with_objects: false,
      visual: 'sprite',
      textures: [globals.textures.blank],
    });

    minetest.set_player_privs(name, {
      fly: true,
      fast: true,
    });

    playerObj.set_inventory_formspec(
      'size[3,1.5]label[0.05,0.05;https://github.com/Kalabasa/mini_forts]button_exit[0.8,0.8;1.5,0.8;close;Close]'
    );

    const player = new RemotePlayer(playerObj);
    player.connected = true;
    game.addPlayer(player, lastLogin == undefined);
  });

  minetest.register_on_leaveplayer((playerObj, timedOut) => {
    const player = game.findPlayerByObjRef(playerObj);
    if (!player) return;
    player.connected = false;
    game.removePlayer(player);
  });
}
