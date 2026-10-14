import * as THREE from 'three';
import { LIGHT_COLORS, STORE } from '../config/SceneConfig.js';
import { FlickerValue } from '../effects/Flicker.js';

/** Light rig positions (metres). Kept together so rain glints match the lamps. */
export const LIGHT_RIG = Object.freeze({
  interior: [
    { position: [-4.0, 2.75, -2.8], intensity: 5, distance: 7.2 },
    { position: [0.4, 2.75, -2.6], intensity: 5, distance: 7.2 },
  ],
  canopy: [
    { position: [-2.6, 2.62, 1.75], intensity: 4.2, distance: 6.2 },
    { position: [1.3, 2.62, 1.75], intensity: 4.2, distance: 6.2 },
  ],
  vending: { position: [-5.5, 1.15, 2.2], intensity: 3.2, distance: 4.6 },
  streetLamp: { head: [-7.6, 5.05, 10.15], target: [-7.3, 0, 8.6], intensity: 90, distance: 15 },
  cornerLamp: { position: [7.62, 4.45, 5.78], intensity: 3.5, distance: 7 },
  alley: { position: [-8.05, 2.65, -1.2], intensity: 2.4, distance: 4.8 },
});

/** Failing fluorescent tube in the alley; shared by its light and its glowing tube. */
export function AlleyFlicker(elapsed) {
  return FlickerValue(elapsed, 3.1, { burstChance: 0.5 });
}

function AddPointLight(parent, color, { position, intensity, distance }, decay = 1.25) {
  const light = new THREE.PointLight(color, intensity, distance, decay);
  light.position.set(...position);
  parent.add(light);
  return light;
}

/**
 * Builds the night lighting: cool ambient sky, warm store spill, cool street
 * lamp with the only shadow map, and small practical lights.
 * @param {THREE.Object3D} parent
 * @returns {{alleyLight: THREE.PointLight, streetLamp: THREE.SpotLight, Update: Function}}
 */
export function BuildLighting(parent) {
  parent.add(new THREE.HemisphereLight(LIGHT_COLORS.hemiSky, LIGHT_COLORS.hemiGround, 2.0));

  const skyFill = new THREE.DirectionalLight(LIGHT_COLORS.skyFill, 1.0);
  skyFill.position.set(-9, 15, 7);
  parent.add(skyFill, skyFill.target);

  LIGHT_RIG.interior.forEach((spec) => AddPointLight(parent, LIGHT_COLORS.interior, spec, 1.1));
  LIGHT_RIG.canopy.forEach((spec) => AddPointLight(parent, LIGHT_COLORS.canopy, spec, 1.3));
  AddPointLight(parent, LIGHT_COLORS.vending, LIGHT_RIG.vending, 1.4);
  AddPointLight(parent, LIGHT_COLORS.streetLamp, LIGHT_RIG.cornerLamp, 1.3);
  const alleyLight = AddPointLight(parent, LIGHT_COLORS.alley, LIGHT_RIG.alley, 1.4);

  const lamp = LIGHT_RIG.streetLamp;
  const streetLamp = new THREE.SpotLight(LIGHT_COLORS.streetLamp, lamp.intensity, lamp.distance, 0.82, 0.55, 1.5);
  streetLamp.position.set(...lamp.head);
  streetLamp.target.position.set(...lamp.target);
  streetLamp.castShadow = true;
  streetLamp.shadow.mapSize.set(2048, 2048);
  streetLamp.shadow.bias = -0.0005;
  streetLamp.shadow.normalBias = 0.03;
  streetLamp.shadow.camera.near = 0.5;
  streetLamp.shadow.camera.far = lamp.distance;
  parent.add(streetLamp, streetLamp.target);

  const alleyBase = LIGHT_RIG.alley.intensity;
  return {
    alleyLight,
    streetLamp,
    Update(elapsed) {
      alleyLight.intensity = alleyBase * AlleyFlicker(elapsed);
    },
  };
}

/**
 * Light sources that make nearby raindrops glint (consumed by the rain shader).
 * @returns {{positions: THREE.Vector4[], colors: THREE.Color[]}}
 */
export function GetRainGlintSources() {
  const storeFrontX = (STORE.minX + STORE.maxX) / 2;
  const sources = [
    { position: [storeFrontX, 1.8, STORE.maxZ + 1.4], radius: 5.2, color: LIGHT_COLORS.interior, strength: 1.1 },
    { position: [STORE.maxX + 1.2, 1.8, -1.6], radius: 3.6, color: LIGHT_COLORS.interior, strength: 0.8 },
    { position: LIGHT_RIG.vending.position, radius: 2.6, color: LIGHT_COLORS.vending, strength: 1.0 },
    { position: [-7.45, 2.6, 9.4], radius: 4.4, color: LIGHT_COLORS.streetLamp, strength: 1.6 },
    { position: [7.6, 3.2, 5.9], radius: 3.4, color: LIGHT_COLORS.streetLamp, strength: 1.0 },
    { position: [6.95, 5.4, 0.6], radius: 2.6, color: '#bff5e6', strength: 0.9 },
  ];
  return {
    positions: sources.map((source) => new THREE.Vector4(...source.position, source.radius)),
    colors: sources.map((source) => new THREE.Color(source.color).multiplyScalar(source.strength)),
  };
}
