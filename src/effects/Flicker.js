/** Deterministic 1D hash in [0, 1). */
function Hash(value) {
  const x = Math.sin(value * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Failing-tube flicker: mostly steady, with short random bursts of rapid
 * on/off. Deterministic in time, so no per-frame state is needed.
 * @param {number} time - Seconds.
 * @param {number} seed - Distinguishes independent lights.
 * @param {{slotsPerSecond?: number, burstChance?: number, floor?: number}} [options]
 * @returns {number} Brightness multiplier in [floor, 1].
 */
export function FlickerValue(time, seed, options = {}) {
  const slotsPerSecond = options.slotsPerSecond ?? 0.22;
  const burstChance = options.burstChance ?? 0.35;
  const floor = options.floor ?? 0.12;
  const position = time * slotsPerSecond + seed * 17.0;
  const slot = Math.floor(position);
  if (Hash(slot + seed) > burstChance) return 1;
  const local = position - slot;
  const burstStart = 0.15 + 0.55 * Hash(slot * 1.31 + seed);
  const burstLength = 0.05 + 0.12 * Hash(slot * 2.17 + seed);
  if (local < burstStart || local > burstStart + burstLength) return 1;
  const flick = Hash(Math.floor(time * 28) + seed * 101);
  return flick > 0.45 ? 1 : floor + flick * 0.5;
}

/**
 * Gentle mains-hum shimmer for healthy lit signs.
 * @param {number} time
 * @param {number} seed
 * @returns {number} Multiplier around 1.
 */
export function HumValue(time, seed) {
  return 0.965 + 0.025 * Math.sin(time * 2.1 + seed) + 0.01 * Math.sin(time * 17.3 + seed * 3.0);
}
