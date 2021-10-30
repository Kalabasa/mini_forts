import { Volume } from 'utils/space';

// interface for interaction controller to be able to access the world, regardless of role (client or server)
export interface InteractionContext {
  canUse(position: Vector3D): boolean;
  use(position: Vector3D): void;
  undo(): void;
  canAddGhost(position: Vector3D): boolean;
  canRemoveGhost(position: Vector3D): boolean;
  canMarkDig(position: Vector3D): boolean;
  canUnmarkDig(position: Vector3D): boolean;
  addGhost(volume: Volume, toolName: string): void;
  removeGhost(volume: Volume): void;
  markDig(volume: Volume): void;
  unmarkDig(volume: Volume): void;
  spawnMinion(denPosition: Vector3D): void;
}
