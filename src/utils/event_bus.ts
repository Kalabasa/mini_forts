import { WeakRef } from 'utils/weak_ref';

type EventType<T> = {
  new (...args: any[]): T;
};

type Ref = WeakRef<unknown> | undefined;
type Callback<T> = (event: T) => void;

class Listener<T> {
  constructor(
    readonly type: EventType<T>,
    readonly ref: Ref,
    readonly callback: Callback<T>
  ) {}
}

export class EventBus {
  // todo: listeners list per type
  private listeners = new Set<Listener<any>>();

  on<T>(type: EventType<T>, callback: Callback<T>): void {
    this.listeners.add(new Listener(type, undefined, callback));
  }

  onFor<T>(
    type: EventType<T>,
    ref: unknown,
    callback: Callback<T>
  ): void {
    this.listeners.add(new Listener(type, new WeakRef(ref), callback));
  }

  off<T>(type: EventType<T>, callback: Callback<T>): void {
    for (const listener of this.listeners) {
      if (listener.type === type && listener.callback === callback) {
        this.listeners.delete(listener);
      }
    }
  }

  emit<T extends { constructor: Function }>(event: T): void {
    for (const listener of this.listeners) {
      if (listener.ref && !listener.ref.deref()) {
        this.listeners.delete(listener);
      } else if (event instanceof listener.type) {
        listener.callback(event);
      }
    }
  }
}
