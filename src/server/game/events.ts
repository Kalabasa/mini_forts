import { BlockDefinition } from 'server/block/block';
import { Entity } from 'server/entity/entity';
import { ResourceType } from 'server/game/resources';
import { RemotePlayer } from 'server/player/remote_player';
import { Stage } from 'server/world/stage';
import { Volume } from 'utils/space';

export class AddPlayerEvent {
  constructor(readonly player: RemotePlayer) {}
}

export class RemovePlayerEvent {
  constructor(readonly player: RemotePlayer) {}
}

export class AddEntityEvent {
  constructor(readonly entity: Entity) {}
}

export class RemoveEntityEvent {
  constructor(readonly entity: Entity) {}
}

export class EntityDiedEvent {
  constructor(readonly entity: Entity) {}
}

export class AddBlockEvent {
  constructor(
    readonly position: Readonly<Vector3D>,
    readonly node: Readonly<Node>,
    readonly blockDef: BlockDefinition
  ) {}
}

export class RemoveBlockEvent {
  constructor(
    readonly position: Readonly<Vector3D>,
    readonly node: Readonly<Node>,
    readonly blockDef: BlockDefinition
  ) {}
}

export class AddGhostEvent {
  constructor(
    readonly position: Readonly<Vector3D>,
    readonly node: Readonly<Node>,
    readonly blockDef: BlockDefinition.WithGhost
  ) {}
}

export class RemoveGhostEvent {
  constructor(
    readonly position: Readonly<Vector3D>,
    readonly node: Readonly<Node>,
    readonly blockDef: BlockDefinition.WithGhost
  ) {}
}

export class LoadMapChunkEvent {
  constructor(readonly volume: Volume, readonly data: number[]) {}
}

export class StartStageLoadEvent {
  constructor() {}
}

export class LoadStageHomeEvent {
  constructor(readonly stage: Stage) {}
}

export class CompleteStageLoadEvent {
  constructor(readonly stage: Stage) {}
}

export class MarkDigEvent {
  constructor(readonly position: Readonly<Vector3D>) {}
}

export class UnmarkDigEvent {
  constructor(readonly position: Readonly<Vector3D>) {}
}

export class UpdateResourcesEvent {
  constructor(readonly resources: Readonly<Record<ResourceType, number>>) {}
}
