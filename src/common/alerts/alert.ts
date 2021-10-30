import { globals } from 'common/globals';
import { CONFIG } from 'utils/config';

export abstract class Alert {
  private api: {
    addHUD: (definition: HudDefinition) => number | undefined;
    removeHUD: (id: number) => void;
    changeHUD: (...params: Parameters<PlayerObject['hud_change']>) => void;
  };

  private id: number;
  private active = false;
  private lifeTime: number;

  protected motion:
    | {
        axis: Vector3D;
        magnitudeFunc: (this: void, t: number) => number;
        period: number;
      }
    | undefined;
  protected ttl: number = Infinity;

  constructor(private readonly image: string) {}

  init(api: {
    addHUD: (definition: HudDefinition) => number | undefined;
    removeHUD: (id: number) => void;
    changeHUD: (...params: Parameters<PlayerObject['hud_change']>) => void;
  }) {
    this.api = api;
    if (CONFIG.isServer) {
      this.motion = undefined;
    }
  }

  add(position: Vector3D) {
    const id = this.api.addHUD({
      hud_elem_type: 'image_waypoint',
      name: this.constructor.name,
      world_pos: position,
      offset: { x: 0, y: 0 },
      text: this.image,
      scale: { x: globals.ui.pixelScale },
      alignment: { x: 0.5, y: 0.5 },
    });

    if (!id) return;

    this.id = id;
    this.active = true;
    this.lifeTime = 0;
  }

  update(dt: number): void {
    if (!this.active) return;

    this.lifeTime += dt;

    if (this.lifeTime >= this.ttl) {
      this.remove();
    }
  }

  remove() {
    this.active = false;
    this.api.removeHUD(this.id);
  }
}
