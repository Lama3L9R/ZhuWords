function sign(x: number) {
  return x > 0 ? 1 : x < 0 ? -1 : 0;
}

function solveQuad(a: number, b: number, c: number) {
  const D = (b ** 2) - 4 * a * c;
  return (-b + sign(a) * (D ** 0.5)) / (2 * a);
}

export class MonoDimensionTransitionControl {
  /** Start time of the current transition */
  private initialTime: number = 0;
  /** Time when the acceleration is reversed of the current transition */
  private reverseTime: number = 0;
  /** Value when the acceleration is reversed of the current transition */
  private reverseValue: number = 0;
  /** Velocity when the acceleration is reversed of the current transition */
  private reverseVelocity: number = 0;
  /** Start velocity of the current transition */
  private lastStartingVelocity: number = 0;
  /** Time when the current transition is finished */
  private finalTime: number = 0;
  /** Target value of the current transition */
  private finalValue: number = 0;
  /** Acceleration in unit per ms */
  private acceleration: number = 0;
  public constructor(
    /** Initial value */
    private lastValue: number,
    accelerationPerSecSq: number,
  ) {
    this.finalValue = lastValue;
    this.acceleration = accelerationPerSecSq / 1000 / 1000;
  }

  public setTarget(targetValue: number) {
    this.lastValue = this.getValue();
    const x = targetValue - this.lastValue;

    if (x === 0) {
      return;
    }

    const now = Date.now();
    const v = this.getVelocity(now);

    // Find a solution for reverse time
    let t = solveQuad(this.acceleration, 2 * v, 0.5 * (v ** 2) / this.acceleration - x);
    if (Number.isNaN(t) || t < 0) {
      // If a reverse time cannot be found with current sign of acceleration, try again with the opposite of acceleration
      this.acceleration = -this.acceleration;
      t = solveQuad(this.acceleration, 2 * v, 0.5 * (v ** 2) / this.acceleration - x);
    }
    const a = this.acceleration;

    this.initialTime = now;
    this.reverseTime = this.initialTime + t;
    this.reverseValue = this.lastValue + 0.5 * a * (t ** 2) + v * t;
    this.reverseVelocity = v + a * t;
    this.finalTime = this.reverseTime + t + v / a;
    this.lastStartingVelocity = v;
    this.finalValue = targetValue;
  }

  public getVelocity(now = Date.now()) {
    return now < this.reverseTime
      ? this.lastStartingVelocity + (now - this.initialTime) * this.acceleration
      : now < this.finalTime
        ? this.lastStartingVelocity + (2 * this.reverseTime - this.initialTime - now) * this.acceleration
        : 0;
  }

  public getValue(now = Date.now()) {
    if (now < this.reverseTime) {
      const t = now - this.initialTime;
      return this.lastValue + 0.5 * this.acceleration * (t ** 2) + this.lastStartingVelocity * t;
    } else if (now < this.finalTime) {
      const t = now - this.reverseTime;
      return this.reverseValue - 0.5 * this.acceleration * (t ** 2) + this.reverseVelocity * t;
    } else {
      return this.finalValue;
    }
  }
  public isFinished(now = Date.now()) {
    return now >= this.finalTime;
  }
}
