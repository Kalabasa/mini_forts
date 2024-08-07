import { CONFIG } from 'utils/config';
import { throwError } from 'utils/error';
import { createLogger, Logger } from 'utils/logger';
import { Queue } from 'utils/queue';

export abstract class ChannelMessage<T extends object> {
  constructor(readonly properties: T) {}
}

export type ChannelMessageType<T extends object> = {
  new (properties: T): ChannelMessage<T>;
};

export type ReceivedChannelMessage<T extends object> = {
  sender: string;
  properties: T;
};

// the encoded format (will be in JSON)
type FormattedMessage<T> = {
  name: string;
  p: T;
};

type Ref = WeakRef<unknown> | undefined;
type Callback<T extends object> = (message: ReceivedChannelMessage<T>) => void;

class Listener<T extends object> {
  constructor(
    readonly type: ChannelMessageType<T>,
    readonly ref: Ref,
    readonly callback: Callback<T>
  ) {}
}

enum ModChannelSignal {
  JoinOk = 0,
  JoinFailed = 1,
  LeaveOk = 2,
  LeaveFailed = 3,
  EventOnNotJoinedChannel = 4,
  StateChanged = 5,
}

const channels = new Map<string, Channel>();

export class Channel {
  private logger: Logger;
  private modChannel: ModChannel | undefined;
  private connected = false;
  private queue = new Queue<string>();
  private listeners = new Set<Listener<object>>();

  static initialize() {
    if (CONFIG.isClient) {
      minetest.register_on_modchannel_signal((channelName, signal) => {
        Logger.trace(
          'channel: Received signal',
          channelName,
          ModChannelSignal[signal]
        );
        const channel = channels.get(channelName);
        if (!channel) return;

        if (signal === ModChannelSignal.JoinOk) {
          channel.onConnect();
        } else {
          Logger.error(
            `channel: '${channelName}' received signal:`,
            ModChannelSignal[signal]
          );
          channel.onDisconnect();
        }
      });
    }

    minetest.register_on_modchannel_message((channelName, sender, message) => {
      Logger.trace('channel: Received modchannel message', sender, message);
      const channel = channels.get(channelName);
      if (!channel) return;

      channel.onReceiveMessage(message, sender);
    });
  }

  static get(channelName: string): Channel {
    const channel = channels.get(channelName);
    if (channel) return channel;

    const newChannel = new Channel(channelName);
    channels.set(channelName, newChannel);
    return newChannel;
  }

  private constructor(readonly channelName: string) {
    this.logger = createLogger(`Channel(${channelName})`);
  }

  join(): void {
    if (this.modChannel) throwError('Already joined!');
    this.modChannel = minetest.mod_channel_join(this.channelName);
    if (CONFIG.isServer) {
      this.connected = true;
      this.flush();
    }
  }

  leave(): void {
    if (!this.modChannel) throwError('Not joined!');
    this.modChannel.leave();
    this.connected = false;
    this.modChannel = undefined;
  }

  private onConnect() {
    this.connected = true;
    this.flush();
  }

  private onDisconnect() {
    this.connected = false;
  }

  on<T extends object>(
    type: ChannelMessageType<T>,
    callback: Callback<T>
  ): void {
    this.listeners.add(new Listener(type, undefined, callback));
  }

  off<T extends object>(
    type: ChannelMessageType<T>,
    callback: Callback<T>
  ): void {
    for (const listener of this.listeners) {
      if (listener.type === type && listener.callback === callback) {
        this.listeners.delete(listener);
      }
    }
  }

  emit<T extends ChannelMessage<object>>(message: T): void {
    this.send({
      name: message.constructor.name,
      p: message.properties,
    });
  }

  private send(message: FormattedMessage<unknown>): void {
    const text = minetest.write_json(message);

    if (this.connected) {
      this.logger.trace('Sending', text);
      this.modChannel!.send_all(text);
    } else {
      this.queue.push(text);
    }
  }

  private onReceiveMessage(message: string, sender: string) {
    let messageObj: FormattedMessage<object> | undefined;
    try {
      messageObj = minetest.parse_json<FormattedMessage<object>>(message);
    } catch (e) {
      this.logger.error('Error parsing message from ' + sender, message);
    }

    // todo: validate message
    if (messageObj) {
      for (const listener of this.listeners) {
        if (listener.ref && listener.ref.deref() == null) {
          this.listeners.delete(listener);
        } else if (messageObj.name === listener.type.name) {
          try {
            listener.callback({
              sender,
              properties: messageObj.p,
            });
          } catch (e) {
            this.logger.error('Error processing message from ' + sender, message);
            this.logger.error(e);
          }
        }
      }
    }
  }

  private flush(): void {
    while (this.queue.size > 0) {
      const text = this.queue.pop()!;
      this.logger.trace('Sending', text);
      this.modChannel!.send_all(text);
    }
  }
}

Channel.initialize();
