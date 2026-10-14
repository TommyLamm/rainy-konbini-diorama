import * as THREE from 'three';
import { LAYERS } from '../config/SceneConfig.js';
import { CreateRadialTexture } from '../textures/GroundTextures.js';

let haloTexture = null;

/** Lazily-created shared halo texture. */
function GetHaloTexture() {
  haloTexture ??= CreateRadialTexture([
    [0, 'rgba(255,255,255,1)'],
    [0.18, 'rgba(255,255,255,0.55)'],
    [0.5, 'rgba(255,255,255,0.12)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  return haloTexture;
}

/**
 * Additive halo sprite on the GLOW layer: blooms, reflects in puddles, never outlined.
 * @param {THREE.Object3D} parent
 * @param {string|number} color
 * @param {number} size - World-space diameter.
 * @param {number[]} position
 * @param {number} [intensity]
 * @returns {THREE.Sprite}
 */
export function AddGlowSprite(parent, color, size, position, intensity = 1) {
  const material = new THREE.SpriteMaterial({
    map: GetHaloTexture(),
    color: new THREE.Color(color).multiplyScalar(intensity),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  material.userData.baseColor = new THREE.Color(color);
  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(size);
  sprite.position.set(position[0], position[1], position[2]);
  sprite.layers.set(LAYERS.GLOW);
  sprite.renderOrder = 6;
  parent.add(sprite);
  return sprite;
}
