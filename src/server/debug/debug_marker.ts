import { res, tex } from 'resource_id';
import { CONFIG } from 'utils/config';
import { ZERO_V } from 'utils/math';

const colorParams = {
  white: ['white', '#fff', '#000', '#fff'],
  red: ['red', '#f00', '#fff', '#c00'],
  green: ['green', '#0f0', '#fff', '#0c0'],
  blue: ['blue', '#00f', '#fff', '#00c'],
  yellow: ['yellow', '#ff0', '#000', '#ff0'],
  magenta: ['magenta', '#f0f', '#fff', '#c0c'],
  cyan: ['cyan', '#0ff', '#fff', '#0cc'],
} as const;

const pointTypes = {
  White: registerPointEntity(...colorParams.white),
  Red: registerPointEntity(...colorParams.red),
  Green: registerPointEntity(...colorParams.green),
  Blue: registerPointEntity(...colorParams.blue),
  Yellow: registerPointEntity(...colorParams.yellow),
  Magenta: registerPointEntity(...colorParams.magenta),
  Cyan: registerPointEntity(...colorParams.cyan),
};

const volumeTypes = {
  White: registerVolumeEntity(...colorParams.white),
  Red: registerVolumeEntity(...colorParams.red),
  Green: registerVolumeEntity(...colorParams.green),
  Blue: registerVolumeEntity(...colorParams.blue),
  Yellow: registerVolumeEntity(...colorParams.yellow),
  Magenta: registerVolumeEntity(...colorParams.magenta),
  Cyan: registerVolumeEntity(...colorParams.cyan),
};

type DebugMarkerProperties = {
  _timeToLive: number;
};

type DebugMarkerType = {
  name: DebugMarkerName;
  definition: LuaEntityProperties<DebugMarkerProperties>;
};

type DebugMarkerName = string & {
  _debugMarkerName: never;
};

let markers = new Set<LuaEntity>();

function registerPointEntity(
  id: string,
  color: string,
  fgcolor: string,
  bgcolor: string
): DebugMarkerType {
  if (CONFIG.isProd) return undefined as unknown as DebugMarkerType;

  const name = res(`debug_marker_pt__${id}`);

  const definition: LuaEntityProperties<DebugMarkerProperties> = {
    initial_properties: {
      physical: false,
      collide_with_objects: false,
      collisionbox: [0, 0, 0, 0, 0, 0],
      selectionbox: [-0.125, -0.125, -0.125, 0.125, 0.125, 0.125],
      pointable: true,
      visual: 'sprite',
      visual_size: { x: 0.125, y: 0.125, z: 0.125 },
      textures: [tex('debug_marker.png', `^[colorize:${color}:255`)],
      nametag_color: fgcolor,
      nametag_bgcolor: bgcolor,
      glow: -1,
      shaded: false,
      static_save: false,
    },

    _timeToLive: 1,

    on_activate: function (staticdata) {
      if (staticdata) {
        this._timeToLive = parseFloat(staticdata);
      }
      markers.add(this);
      minetest.after(this._timeToLive, () => {
        markers.delete(this);
        return this.object.remove();
      });
    },
  };

  minetest.register_entity(name, definition);
  return { name: name as DebugMarkerName, definition };
}

function registerVolumeEntity(
  id: string,
  color: string,
  fgcolor: string,
  bgcolor: string
): DebugMarkerType {
  if (CONFIG.isProd) return undefined as unknown as DebugMarkerType;

  const name = res(`debug_marker_vol__${id}`);
  const texture = tex('debug_volume.png', `^[colorize:${color}:255`);

  const definition: LuaEntityProperties<DebugMarkerProperties> = {
    initial_properties: {
      physical: false,
      collide_with_objects: false,
      collisionbox: [0, 0, 0, 0, 0, 0],
      selectionbox: [-0, -0, -0, 0, 0, 0],
      pointable: true,
      visual: 'cube',
      visual_size: { x: 1, y: 1, z: 1 },
      textures: [texture, texture, texture, texture, texture, texture],
      backface_culling: false,
      nametag_color: fgcolor,
      nametag_bgcolor: bgcolor,
      glow: -1,
      shaded: false,
      static_save: false,
    },

    _timeToLive: 1,

    on_activate: function (staticdata) {
      if (staticdata) {
        this._timeToLive = parseFloat(staticdata);
      }
      markers.add(this);
      minetest.after(this._timeToLive, () => {
        markers.delete(this);
        return this.object.remove();
      });
    },
  };

  minetest.register_entity(name, definition);
  return { name: name as DebugMarkerName, definition };
}

export const DebugMarker = {
  Point: pointTypes,
  Volume: volumeTypes,
  mark(
    position: Vector3D,
    {
      type = pointTypes.White,
      nametag,
      infotext,
      duration = 1,
      size,
    }: {
      type?: DebugMarkerType;
      nametag?: string;
      infotext?: string;
      duration?: number;
      size?: Vector3D;
    }
  ) {
    if (CONFIG.isProd) return;

    if (Object.values(pointTypes).includes(type) && !nametag && !infotext) {
      const properties = type.definition.initial_properties!;
      minetest.add_particle({
        pos: position,
        velocity: ZERO_V,
        acceleration: ZERO_V,
        expirationtime: duration,
        size: (size?.y ?? properties.visual_size!.y) * 10,
        texture: properties.textures![0],
        collision_removal: false,
        collisiondetection: false,
        object_collision: false,
        glow: properties.glow === -1 ? 14 : properties.glow,
      });
    } else {
      const objRef = minetest.add_entity(
        position,
        type.name,
        duration.toString()
      ) as LuaEntitySAO<DebugMarkerProperties>;
      objRef.set_properties({
        nametag,
        infotext,
        visual_size: size,
      });
    }
  },
};

if (CONFIG.isDev) {
  minetest.register_chatcommand('debug_clear', {
    func: (playerName, param) => {
      for (const marker of markers) {
        marker.object.remove();
      }
      markers.clear();
      return $multi(true);
    },
  });
}
