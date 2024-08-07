import { WeakRef } from 'utils/weak_ref';

type EventType<T> = {
  new (...args: unknown[]): T;
};

type Callback<T> = (event: T) => void;

class Listener<T> {
  constructor(readonly type: EventType<T>, readonly callback: Callback<T>) {}
}

export class EventBus {
  // todo: listeners list per type
  private listeners = new Set<Listener<unknown>>();

  on<T>(type: EventType<T>, callback: Callback<T>): void {
    this.listeners.add(new Listener(type, callback));
  }

  // add an object method as listener with a weak reference
  onFor<T, O extends object>(
    type: EventType<T>,
    obj: O,
    method: (this: O, event: T) => void
  ): void {
    const ref = new WeakRef(obj);

    const callback = (event: T) => {
      const objNow = ref?.deref();
      if (objNow) {
        method.call(objNow, event);
      } else {
        this.off(type, callback);
      }
    };

    this.on(type, callback);
  }

  off<T>(type: EventType<T>, callback: Callback<T>): void {
    for (const listener of this.listeners) {
      if (listener.type === type && listener.callback === callback) {
        this.listeners.delete(listener);
      }
    }
  }

  emit(event: object): void {
    for (const listener of this.listeners) {
      if (event instanceof listener.type) {
        listener.callback(event);
      }
    }
  }
}
