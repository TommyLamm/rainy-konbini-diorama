/**
 * @typedef {{Update: (elapsed: number, delta: number) => void}} Animated
 */

/**
 * Central registry of per-frame updaters so the app loop stays agnostic of
 * individual effects (rain, doors, signals, flicker...).
 */
export class AnimationHub {
  /** @type {Animated[]} */
  #items = [];

  /**
   * @param {Animated | ((elapsed: number, delta: number) => void)} item
   * @returns {Animated}
   */
  Add(item) {
    const animated = typeof item === 'function' ? { Update: item } : item;
    if (animated?.Update) this.#items.push(animated);
    return animated;
  }

  /** @param {number} elapsed @param {number} delta */
  Update(elapsed, delta) {
    for (const item of this.#items) item.Update(elapsed, delta);
  }
}
