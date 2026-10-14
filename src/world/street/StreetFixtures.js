import * as THREE from 'three';
import { LAYERS, LEVELS, LIGHT_COLORS } from '../../config/SceneConfig.js';
import { ToonMaterials } from '../../materials/ToonMaterials.js';
import { CreateLightConeMaterial } from '../../materials/LightConeMaterial.js';
import { CreatePoleSignTexture } from '../../textures/StoreSignTextures.js';
import { CreateBulletinTexture } from '../../textures/StreetSignTextures.js';
import { AddBoxFromBounds, AddCylinder, AddGroup, AddMesh, AddPlane, AddTube } from '../../utils/MeshKit.js';
import { AddGlowSprite } from '../../utils/GlowSprite.js';
import { HumValue } from '../../effects/Flicker.js';
import { LIGHT_RIG } from '../Lighting.js';

const GROUND = LEVELS.CURB;
/** White pipe guard fences as polylines [x, z] on raised pavements. */
const GUARD_FENCES = Object.freeze([
  [[-11.7, 5.86], [-8.5, 5.86]],
  [[-6.3, 5.86], [2.95, 5.86]],
  [[-11.7, 10.76], [2.6, 10.76]],
  [[6.8, 10.76], [11.7, 10.76]],
  [[11.16, -11.7], [11.16, 1.2]],
]);

/**
 * @param {THREE.Object3D} parent
 * @returns {{Update: (elapsed: number) => void}}
 */
export function BuildStreetFixtures(parent) {
  BuildStreetLamp(parent);
  GUARD_FENCES.forEach((points) => BuildGuardFence(parent, points));
  BuildCurveMirror(parent, [9.3, GROUND, 11.38], Math.PI + 0.3);
  BuildBulletinBoard(parent, [-10.35, GROUND, 3.95]);
  BuildBollard(parent, [-7.45, GROUND, 4.2]);
  return BuildPoleSign(parent, [6.95, GROUND, 0.55], 0.45);
}

/** Curved-arm LED street lamp with a soft volumetric cone. */
function BuildStreetLamp(parent) {
  const head = new THREE.Vector3(...LIGHT_RIG.streetLamp.head).add(new THREE.Vector3(0, 0.08, 0));
  const base = new THREE.Vector3(head.x, GROUND, 11.4);
  const steel = ToonMaterials.Get('#8f96a3');
  AddCylinder(parent, steel, 0.1, 0.065, 5.2, [base.x, base.y, base.z], { segments: 12, castShadow: true });
  AddCylinder(parent, steel, 0.16, 0.13, 0.5, [base.x, base.y, base.z], { segments: 12 });
  const arm = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(base.x, base.y + 5.18, base.z),
    new THREE.Vector3(base.x, base.y + 5.55, (base.z + head.z) / 2 + 0.3),
    new THREE.Vector3(head.x, head.y + 0.04, head.z + 0.18),
  );
  AddMesh(parent, new THREE.TubeGeometry(arm, 16, 0.045, 6, false), steel, [0, 0, 0], { castShadow: true });
  AddBoxFromBounds(parent, ToonMaterials.Get('#5d6573'), head.x - 0.15, head.y - 0.04, head.z - 0.32, head.x + 0.15, head.y + 0.06, head.z + 0.22, { castShadow: true });
  AddPlane(parent, ToonMaterials.Glow('#e8f4ff', 4.0), 0.24, 0.44, [head.x, head.y - 0.042, head.z - 0.05], { rotation: [Math.PI / 2, 0, 0] });
  AddGlowSprite(parent, LIGHT_COLORS.streetLamp, 1.9, [head.x, head.y - 0.12, head.z - 0.05], 1.0);

  const coneHeight = head.y - 0.06;
  const cone = new THREE.CylinderGeometry(0.14, 2.5, coneHeight, 36, 1, true).translate(0, coneHeight / 2, 0);
  const beam = AddMesh(parent, cone, CreateLightConeMaterial(LIGHT_COLORS.streetLamp, 0.16, coneHeight), [head.x, LEVELS.ROAD, head.z - 0.15], { layer: LAYERS.FX });
  beam.renderOrder = 5;
}

/** White pipe-type pedestrian guard fence along a straight run. */
function BuildGuardFence(parent, [start, end]) {
  const white = ToonMaterials.Get('#e8ebef', { selfLit: 0.05 });
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const posts = Math.max(2, Math.round(length / 1.8) + 1);
  for (let i = 0; i < posts; i++) {
    const t = i / (posts - 1);
    AddCylinder(parent, white, 0.032, 0.032, 0.82, [start[0] + (end[0] - start[0]) * t, GROUND, start[1] + (end[1] - start[1]) * t], { segments: 8, castShadow: true });
  }
  for (const height of [0.46, 0.8]) {
    AddTube(parent, white, new THREE.Vector3(start[0], GROUND + height, start[1]), new THREE.Vector3(end[0], GROUND + height, end[1]), 0.024, { castShadow: true });
  }
}

/** Orange convex traffic mirror on a post. */
function BuildCurveMirror(parent, position, rotationY) {
  const orange = ToonMaterials.Get('#ff7a1a', { selfLit: 0.1 });
  const group = AddGroup(parent, position, rotationY);
  AddCylinder(group, orange, 0.045, 0.045, 2.75, [0, 0, 0], { segments: 10, castShadow: true });
  const mirror = AddGroup(group, [0, 2.95, 0.08]);
  mirror.rotation.x = 0.12;
  AddMesh(mirror, new THREE.CircleGeometry(0.4, 28), ToonMaterials.Get('#d6e6f5', { selfLit: 0.45 }), [0, 0, 0.012]);
  AddMesh(mirror, new THREE.TorusGeometry(0.41, 0.035, 6, 28), orange, [0, 0, 0.01]);
  AddMesh(mirror, new THREE.CircleGeometry(0.42, 28), orange, [0, 0, -0.01], { rotation: [0, Math.PI, 0] });
  AddBoxFromBounds(group, orange, -0.03, 2.5, 0, 0.03, 2.62, 0.09);
}

/** Community notice board with a little roof. */
function BuildBulletinBoard(parent, position) {
  const group = AddGroup(parent, position);
  const wood = ToonMaterials.Get('#5a4030');
  for (const x of [-0.82, 0.82]) AddBoxFromBounds(group, wood, x - 0.05, 0, -0.05, x + 0.05, 1.95, 0.05, { castShadow: true });
  AddBoxFromBounds(group, wood, -0.88, 0.78, -0.06, 0.88, 1.84, 0.03);
  AddPlane(group, ToonMaterials.Get('#ffffff', { map: CreateBulletinTexture(), selfLit: 0.12 }), 1.62, 0.98, [0, 1.31, 0.035]);
  const roof = ToonMaterials.Get('#3d4656');
  AddBoxFromBounds(group, roof, -1.0, 1.95, -0.22, 1.0, 2.0, 0.3, { rotation: [0.18, 0, 0], castShadow: true });
}

function BuildBollard(parent, position) {
  AddCylinder(parent, ToonMaterials.Get('#e8ebef'), 0.075, 0.07, 0.8, position, { segments: 12, castShadow: true });
  AddCylinder(parent, ToonMaterials.Get('#e8343f', { selfLit: 0.3 }), 0.078, 0.078, 0.08, [position[0], position[1] + 0.6, position[2]], { segments: 12 });
}

/** Tall roadside brand sign; both faces share one humming glow material. */
function BuildPoleSign(parent, position, rotationY) {
  const group = AddGroup(parent, position, rotationY);
  const frame = ToonMaterials.Get('#eef0f2');
  for (const x of [-0.42, 0.42]) AddCylinder(group, frame, 0.075, 0.075, 5.05, [x, 0, 0], { segments: 12, castShadow: true });
  AddBoxFromBounds(group, frame, -0.68, 5.0, -0.2, 0.68, 6.62, 0.2, { castShadow: true });
  AddBoxFromBounds(group, ToonMaterials.Get('#2fbfa2', { selfLit: 0.3 }), -0.72, 6.62, -0.22, 0.72, 6.72, 0.22);
  const face = ToonMaterials.CreateGlow('#ffffff', 0.95, { map: CreatePoleSignTexture() });
  AddPlane(group, face, 1.2, 1.5, [0, 5.81, 0.203]);
  AddPlane(group, face, 1.2, 1.5, [0, 5.81, -0.203], { rotation: [0, Math.PI, 0] });
  return {
    Update(elapsed) {
      face.color.copy(face.userData.baseColor).multiplyScalar(face.userData.baseIntensity * HumValue(elapsed, 7.7));
    },
  };
}
