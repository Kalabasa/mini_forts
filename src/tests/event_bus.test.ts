import { EventBus } from 'utils/event_bus';

class TestEvent {
  constructor(readonly value) {}
}

class TestEvent2 {}

describe('EventBus', () => {
  it('calls listener on event emission', () => {
    const eventBus = new EventBus();
    const callback = jest.fn();
    const event = new TestEvent(3);
    eventBus.on(TestEvent, callback);
    expect(callback).not.toBeCalled();
    eventBus.emit(event);
    expect(callback).toBeCalledWith(event);
  });

  it('does not call callbacks not matching emitted event', () => {
    const eventBus = new EventBus();
    const callback = jest.fn();
    eventBus.on(TestEvent, callback);
    eventBus.emit(new TestEvent2());
    expect(callback).not.toBeCalled();
  });

  it('calls listener method for object', () => {
    const eventBus = new EventBus();
    const values = jest.fn();
    const event = new TestEvent(3);
    const object = {};
    eventBus.onFor(TestEvent, object, function (event) {
      values(this, event);
    });
    eventBus.emit(event);
    expect(values).toBeCalledWith(object, event);
  });

  it('does not call listener methods for orphaned objects', async () => {
    const eventBus = new EventBus();
    const callback = jest.fn();
    const event = new TestEvent(3);
    eventBus.onFor(TestEvent, {}, callback);
    await delay(1);
    global.gc!();
    eventBus.emit(event);
    expect(callback).not.toBeCalled();
  });
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
