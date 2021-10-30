export class IntervalTimer {
  count: number = 0;

  constructor(public seconds: number) {}

  reset(seconds?: number): void {
    this.count = 0;
    if (seconds) this.seconds = seconds;
  }

  updateAndCheck(dt: number): boolean {
    this.count += dt;
    if (this.count >= this.seconds) {
      this.count -= this.seconds;
      return true;
    }
    return false;
  }
}

export class CountdownTimer {
  count: number = 0;

  constructor(public seconds: number) {}

  reset(seconds?: number): void {
    this.count = 0;
    if (seconds) this.seconds = seconds;
  }

  updateAndCheck(dt: number): boolean {
    if (this.count < this.seconds) this.count += dt;
    return this.count >= this.seconds;
  }
}
