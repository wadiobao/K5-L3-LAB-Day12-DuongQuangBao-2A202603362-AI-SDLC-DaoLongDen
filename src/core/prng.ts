/**
 * @file prng.ts
 * @description Fast, deterministic 32-bit pseudo-random number generator (Mulberry32).
 * Ensures identical simulation behavior across platforms given the same seed.
 */

export class PRNG {
  private state: number;

  /**
   * Initializes the PRNG state using an integer seed.
   * @param seed 32-bit integer seed value.
   */
  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /**
   * Returns a deterministic pseudo-random float in [0, 1).
   */
  nextFloat(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a deterministic integer in range [min, max] inclusive.
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }
}
