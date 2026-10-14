import * as THREE from 'three';

/**
 * Toon ramp sampled with dot(N, L) remapped to [0, 1]; eight texels = 0.25 steps.
 * Back-facing texels are zero so lights never leak through to the far side of walls.
 */
const TOON_RAMP = [0, 0, 0, 0.1, 0.62, 0.9, 1, 1];

/** Interior surfaces glow a little by themselves — the warm "conbini" fill light. */
const INTERIOR_SELF_LIT = Object.freeze({ color: '#ffe9cc', strength: 0.32 });

/**
 * @typedef {Object} ToonOptions
 * @property {THREE.Texture} [map]
 * @property {THREE.Texture} [emissiveMap]
 * @property {string|number} [emissive]
 * @property {number} [emissiveIntensity]
 * @property {number} [selfLit] - Strength of the colour-proportional fill term.
 * @property {string|number} [selfLitColor]
 * @property {boolean} [interior] - Shorthand for the warm interior fill preset.
 * @property {boolean} [transparent]
 * @property {number} [opacity]
 * @property {THREE.Side} [side]
 * @property {boolean} [vertexColors]
 * @property {string} [name]
 */

function CreateRampTexture(levels) {
  const data = new Uint8Array(levels.map((level) => Math.round(level * 255)));
  const texture = new THREE.DataTexture(data, levels.length, 1, THREE.RedFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Shared onBeforeCompile hook. Identical source for every material, so all toon
 * materials share one compiled program while keeping their own uniform value.
 * @this {THREE.MeshToonMaterial}
 */
function PatchSelfLit(shader) {
  shader.uniforms.uSelfLit = this.userData.selfLitUniform;
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform vec3 uSelfLit;')
    .replace(
      '#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += diffuseColor.rgb * uSelfLit;',
    );
}

/**
 * Factory + cache for the diorama's cel-shaded materials. Cached materials are
 * shared, which also lets the static merger batch geometry by material.
 */
export class ToonMaterials {
  static #cache = new Map();
  static #ramp = CreateRampTexture(TOON_RAMP);

  /** @returns {THREE.DataTexture} The shared toon ramp. */
  static get Ramp() {
    return ToonMaterials.#ramp;
  }

  /**
   * Returns a shared toon material for the colour/options combination.
   * @param {string|number} color
   * @param {ToonOptions} [options]
   * @returns {THREE.MeshToonMaterial}
   */
  static Get(color, options = {}) {
    const key = ToonMaterials.#KeyOf(color, options);
    if (!ToonMaterials.#cache.has(key)) ToonMaterials.#cache.set(key, ToonMaterials.Create(color, options));
    return ToonMaterials.#cache.get(key);
  }

  /** Shorthand for a warm self-lit interior material. */
  static Interior(color, options = {}) {
    return ToonMaterials.Get(color, { ...options, interior: true });
  }

  /**
   * Always creates a fresh material (use when its uniforms are animated).
   * @param {string|number} color
   * @param {ToonOptions} [options]
   * @returns {THREE.MeshToonMaterial}
   */
  static Create(color, options = {}) {
    const material = new THREE.MeshToonMaterial({
      color: new THREE.Color(color),
      gradientMap: ToonMaterials.#ramp,
      map: options.map ?? null,
      emissive: new THREE.Color(options.emissive ?? 0x000000),
      emissiveMap: options.emissiveMap ?? null,
      emissiveIntensity: options.emissiveIntensity ?? 1,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      side: options.side ?? THREE.FrontSide,
      vertexColors: options.vertexColors ?? false,
    });
    material.name = options.name ?? '';

    const selfLitStrength = options.interior ? INTERIOR_SELF_LIT.strength : options.selfLit ?? 0;
    const selfLitColor = options.selfLitColor ?? (options.interior ? INTERIOR_SELF_LIT.color : '#ffffff');
    material.userData.selfLitUniform = {
      value: new THREE.Color(selfLitColor).multiplyScalar(selfLitStrength),
    };
    material.onBeforeCompile = PatchSelfLit;
    return material;
  }

  /**
   * Unlit HDR colour for light panels, lamp bulbs and sign faces (feeds bloom).
   * @param {string|number} color
   * @param {number} [intensity]
   * @param {{map?: THREE.Texture, side?: THREE.Side, transparent?: boolean, opacity?: number}} [options]
   * @returns {THREE.MeshBasicMaterial}
   */
  static Glow(color, intensity = 1, options = {}) {
    const key = `glow|${new THREE.Color(color).getHexString()}|${intensity}|${options.map?.uuid ?? ''}|${options.side ?? 0}|${options.transparent ?? false}|${options.opacity ?? 1}`;
    if (!ToonMaterials.#cache.has(key)) ToonMaterials.#cache.set(key, ToonMaterials.CreateGlow(color, intensity, options));
    return ToonMaterials.#cache.get(key);
  }

  /** Non-cached variant of {@link ToonMaterials.Glow} for animated intensity. */
  static CreateGlow(color, intensity = 1, options = {}) {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(intensity),
      map: options.map ?? null,
      side: options.side ?? THREE.FrontSide,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
    });
    material.userData.baseColor = new THREE.Color(color);
    material.userData.baseIntensity = intensity;
    return material;
  }

  static #KeyOf(color, options) {
    return JSON.stringify([
      new THREE.Color(color).getHexString(),
      options.map?.uuid ?? null,
      options.emissiveMap?.uuid ?? null,
      options.emissive ?? null,
      options.emissiveIntensity ?? 1,
      options.selfLit ?? 0,
      options.selfLitColor ?? null,
      options.interior ?? false,
      options.transparent ?? false,
      options.opacity ?? 1,
      options.side ?? THREE.FrontSide,
      options.vertexColors ?? false,
    ]);
  }
}
