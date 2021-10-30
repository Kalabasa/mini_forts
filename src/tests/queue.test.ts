import { Queue } from 'utils/queue';

describe('Queue', () => {
  it('counts the number of items', () => {
    const q = new Queue<number>();
    expect(q.size).toBe(0);
    q.push(30);
    expect(q.size).toBe(1);
    q.push(40);
    expect(q.size).toBe(2);
    q.push(20);
    expect(q.size).toBe(3);
    q.pop();
    expect(q.size).toBe(2);
    q.pop();
    expect(q.size).toBe(1);
    q.pop();
    expect(q.size).toBe(0);
  });

  it('does fifo', () => {
    const q = new Queue<number>();
    q.push(1);
    q.push(2);
    expect(q.pop()).toBe(1);
    q.push(3);
    q.push(9);
    expect(q.pop()).toBe(2);
    q.push(8);
    q.push(7);
    expect(q.pop()).toBe(3);
    q.push(4);
    q.push(5);
    q.push(6);
    expect(q.pop()).toBe(9);
    expect(q.pop()).toBe(8);
    expect(q.pop()).toBe(7);
    expect(q.pop()).toBe(4);
    expect(q.pop()).toBe(5);
    expect(q.pop()).toBe(6);
  });
});
