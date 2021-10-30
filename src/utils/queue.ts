import { Logger } from 'utils/logger';

const minQueueSize = 8;

export class Queue<T> {
  private array: (T | undefined)[] = [];
  private arrayLen = minQueueSize;

  private tail: number = 0;
  private count: number = 0;

  push(item: T): void {
    if (this.count >= this.arrayLen) {
      this.resize(Math.ceil((this.arrayLen + 1) * 2));
    }

    this.array[(this.tail + this.count) % this.arrayLen] = item;
    this.count++;
  }

  pop(): T | undefined {
    if (this.count === 0) return undefined;

    const item = this.array[this.tail]!;
    this.array[this.tail] = undefined;
    this.tail = (this.tail + 1) % this.arrayLen;
    this.count--;

    if (this.count < this.arrayLen * 0.2) {
      let newSize = Math.ceil(this.arrayLen * 0.5);
      if (newSize < minQueueSize) newSize = minQueueSize;
      if (newSize !== this.arrayLen) {
        this.resize(newSize);
      }
    }

    return item;
  }

  get size(): number {
    return this.count;
  }

  private resize(n: number) {
    if (this.count > n) throw new Error('Invalid resize!');

    const arr: (T | undefined)[] = [];

    let i = 0;
    let j = this.tail;
    while (i < this.count) {
      arr[i] = this.array[j];
      i++;
      j = (j + 1) % this.arrayLen;
    }

    this.array = arr;
    this.arrayLen = n;
    this.tail = 0;
  }

  [Logger.String]() {
    const contents: string[] = [];

    let i = 0;
    let j = this.tail;
    while (i < this.count) {
      contents[i] = Logger.format(this.array[j]);
      i++;
      j = (j + 1) % this.arrayLen;
    }

    return `Queue(${contents.join(', ')})`;
  }
}
