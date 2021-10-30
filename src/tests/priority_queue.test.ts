import { PriorityQueue } from 'utils/priority_queue';

const max = (a: number, b: number) => a - b;
const min = (a: number, b: number) => b - a;

describe('PriorityQueue', () => {
  it('counts the number of items', () => {
    const q = new PriorityQueue<number>({ compare: max });
    expect(q.size).toBe(0);
    q.add(30);
    expect(q.size).toBe(1);
    q.add(40);
    expect(q.size).toBe(2);
    q.add(20);
    expect(q.size).toBe(3);
    q.pop();
    expect(q.size).toBe(2);
    q.pop();
    expect(q.size).toBe(1);
    q.pop();
    expect(q.size).toBe(0);
  });

  it('returns the top item', () => {
    const q = new PriorityQueue<number>({ compare: max });
    q.add(40);
    expect(q.top()).toBe(40);
    q.add(30);
    expect(q.top()).toBe(40);
    q.add(50);
    expect(q.top()).toBe(50);
    q.add(60);
    expect(q.top()).toBe(60);
    q.add(20);
    expect(q.top()).toBe(60);
  });

  it('pops the top item', () => {
    const q = new PriorityQueue<number>({ compare: min });
    q.add(3);
    q.add(3);
    q.add(3);
    expect(q.pop()).toBe(3);
    q.add(4);
    q.add(4);
    q.add(4);
    expect(q.pop()).toBe(3);
    q.add(4);
    q.add(4);
    q.add(4);
    expect(q.pop()).toBe(3);
    q.add(4);
    q.add(4);
    q.add(4);
    expect(q.pop()).toBe(4);
    q.add(5);
    q.add(5);
    expect(q.pop()).toBe(4);
    q.add(5);
    q.add(5);
    q.add(5);
    expect(q.pop()).toBe(4);
  });

  it('removes the specified item', () => {
    const q = new PriorityQueue<number>({ compare: min });
    q.add(3);
    q.add(4);
    q.add(5);
    q.add(6);
    q.add(7);

    q.remove(5);
    expect(q.contains(5)).toBe(false);
    expect(q.top()).toBe(3);

    q.remove(4);
    expect(q.contains(4)).toBe(false);
    expect(q.top()).toBe(3);

    q.remove(3);
    expect(q.contains(3)).toBe(false);
    expect(q.top()).toBe(6);
  });
});
