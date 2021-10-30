import { ChannelMessage } from 'common/channel/channel';

export class ConfigureInteractionMessage extends ChannelMessage<{
  clientControl: boolean;
  drag: boolean;
  autoRepeat: boolean;
}> {}

export class UseInteractionMessage extends ChannelMessage<{ pos: Vector3D }> {}

export class BuildInteractionMessage extends ChannelMessage<{
  toolName: string;
  min: Vector3D;
  max: Vector3D;
}> {}

export class UnbuildInteractionMessage extends ChannelMessage<{
  min: Vector3D;
  max: Vector3D;
}> {}

export class DigInteractionMessage extends ChannelMessage<{
  min: Vector3D;
  max: Vector3D;
}> {}

export class UndigInteractionMessage extends ChannelMessage<{
  min: Vector3D;
  max: Vector3D;
}> {}

export class SpawnMinionInteractionMessage extends ChannelMessage<{
  pos: Vector3D;
}> {}
