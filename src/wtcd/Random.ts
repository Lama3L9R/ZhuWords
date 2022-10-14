/**
 * Convert a string to 32 bit hash
 * https://stackoverflow.com/a/47593316
 */
function xmur3(strSeed: string) {
  let h = 1779033703 ^ strSeed.length;
  for (let i = 0; i < strSeed.length; i++) {
    h = Math.imul(h ^ strSeed.charCodeAt(i), 3432918353),
    h = h << 13 | h >>> 19;
  }
  return () => {
    h = Math.imul(h ^ h >>> 16, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

/**
 * Create a seeded random number generator using the four passed in 32 bit
 * number as seeds.
 * https://stackoverflow.com/a/47593316
 *
 * @param a seed
 * @param b seed
 * @param c seed
 * @param d seed
 * @returns seeded random number generator
 */
function sfc32(a: number, b: number, c: number, d: number) {
    return () => {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      let t = (a + b) | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      d = d + 1 | 0;
      t = t + d | 0;
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    };
}

export class Random {
  private rng: () => number;
  public constructor(seed: string) {
    const seedFn = xmur3(seed);
    this.rng = sfc32(seedFn(), seedFn(), seedFn(), seedFn());
  }
  public next(low = 0, high = 1) {
    return this.rng() * (high - low) + low;
  }
  public nextBool() {
    return this.rng() < 0.5;
  }
  public nextInt(low: number, high: number) {
    return Math.floor(this.next(low, high));
  }
}
