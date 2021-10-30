import { Logger } from 'utils/logger';
import { floorDiv } from 'utils/math';

// implemented using max heap
export class PriorityQueue<T> {
  private readonly array: (T | undefined)[] = [];
  private readonly compare: (a: T, b: T) => boolean;

  constructor(
    opts:
      | { compare: (a: T, b: T) => number }
      | { property: keyof T; ascending?: boolean }
  ) {
    if ('compare' in opts) {
      const { compare } = opts;
      this.compare = (a, b) => compare(a, b) > 0;
    } else {
      const { property, ascending } = opts;
      if (ascending) {
        this.compare = (a, b) => a[property] < b[property];
      } else {
        this.compare = (a, b) => a[property] > b[property];
      }
    }
  }

  get size(): number {
    return this.array.length;
  }

  contains(item: T): boolean {
    return this.array.includes(item);
  }

  add(item: T): void {
    this.sortUp(this.array.push(item) - 1);
  }

  top(): T | undefined {
    return this.array[0];
  }

  pop(): T {
    if (this.array.length > 1) {
      const top = this.array[0]!;
      this.array[0] = this.array.pop();
      this.sortDown(0);
      return top;
    } else if (this.array.length > 0) {
      return this.array.pop()!;
    } else {
      throw new Error('Empty queue!');
    }
  }

  remove(item: T): void {
    const index = this.array.indexOf(item);
    if (index < 0) return;
    if (index === this.array.length - 1) {
      this.array.pop();
    } else {
      this.array[index] = this.array.pop();
      this.sortDown(index);
    }
  }

  private sortUp(index: number) {
    if (index === 0) return;
    const current = this.array[index]!;
    const parentIndex = floorDiv(index, 2);
    const parent = this.array[parentIndex]!;
    if (this.compare(current, parent)) {
      this.array[index] = parent;
      this.array[parentIndex] = current;
      this.sortUp(parentIndex);
    }
  }

  private sortDown(index: number) {
    const leftIndex = index * 2 + 1;
    const rightIndex = index * 2 + 2;
    let topChildIndex = leftIndex;
    if (leftIndex < this.array.length) {
      if (
        rightIndex < this.array.length &&
        this.compare(this.array[rightIndex]!, this.array[leftIndex]!)
      ) {
        topChildIndex = rightIndex;
      }
      const current = this.array[index]!;
      const topChild = this.array[topChildIndex]!;
      if (this.compare(topChild, current)) {
        this.array[index] = topChild;
        this.array[topChildIndex] = current;
        this.sortDown(topChildIndex);
      }
    }
  }

  [Logger.Props]() {
    return {
      size: this.size,
      top: this.top(),
    };
  }
}
