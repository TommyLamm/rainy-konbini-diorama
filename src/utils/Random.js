/**
 * Small deterministic PRNG (mulberry32) so procedural details — product
 * colours, speckles, drop phases — are identical on every load.
 */
export class Random {
  /** @param {number} seed - Any 32-bit integer. */
  constructor(seed = 1) {
    this.state = seed >>> 0;
  }

  /** @returns {number} Uniform float in [0, 1). */
  Next() {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** @returns {number} Uniform float in [min, max). */
  Range(min, max) {
    return min + (max - min) * this.Next();
  }

  /** @returns {number} Integer in [min, max]. */
  Int(min, max) {
    return Math.floor(this.Range(min, max + 1));
  }

  /** @returns {boolean} True with the given probability. */
  Chance(probability) {
    return this.Next() < probability;
  }

  /**
   * @template T
   * @param {T[]} items
   * @returns {T} A random element.
   */
  Pick(items) {
    return items[Math.floor(this.Next() * items.length)];
  }
}
