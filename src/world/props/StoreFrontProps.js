import * as THREE from 'three';
import { LEVELS, PALETTE, STORE } from '../../config/SceneConfig.js';
import { ToonMaterials } from '../../materials/ToonMaterials.js';
import { CreateDoormatTexture, CreateLabelTexture } from '../../textures/StoreSignTextures.js';
import { AddBoxFromBounds, AddCylinder, AddGroup, AddMesh, AddPlane, AddTube, MarkDynamic } from '../../utils/MeshKit.js';
import { BuildBicycle } from './Bicycle.js';
import { BuildVendingMachine } from './VendingMachine.js';

const GROUND = LEVELS.CURB;
const RECYCLE_BINS = Object.freeze([
  { label: 'かん・びん', color: '#2f6fe0' },
  { label: 'ペットボトル', color: '#ff9a3c' },
  { label: 'もえるゴミ', color: '#3fae6a' },
]);
const AC_UNITS = Object.freeze([
  { position: [STORE.minX - 0.16, 0.62, -5.1], rotationY: -Math.PI / 2 },
  { position: [STORE.minX - 0.16, 0.62, -3.7], rotationY: -Math.PI / 2 },
  { position: [-4.6, STORE.roofY, -5.2], rotationY: 0 },
  { position: [-3.5, STORE.roofY, -5.2], rotationY: 0 },
  { position: [-2.4, STORE.roofY, -5.2], rotationY: 0 },
]);

/**
 * Everything standing in front of / around the shop exterior.
 * @param {THREE.Object3D} parent
 * @returns {{Update: (elapsed: number, delta: number) => void}}
 */
export function BuildStoreFrontProps(parent) {
  BuildVendingMachine(parent, { position: [-6.0, GROUND, 1.2], bodyColor: '#d94a4a', seed: 11, banner: 'あったか~い はじめました' });
  BuildVendingMachine(parent, { position: [-5.0, GROUND, 1.2], bodyColor: '#f2f4f6', seed: 23, banner: 'つめた~い・あったか~い' });
  AddCylinder(parent, ToonMaterials.Get('#3a6fd8', { selfLit: 0.1 }), 0.17, 0.17, 0.75, [-4.35, GROUND, 1.05], { segments: 12, castShadow: true });

  BuildBicycle(parent, { position: [-4.0, GROUND, 2.45], rotationY: Math.PI / 2 + 0.12, frameColor: '#7fd6c2', umbrellaColor: '#22325c' });
  BuildBicycle(parent, { position: [-2.95, GROUND, 2.55], rotationY: Math.PI / 2 - 0.08, frameColor: '#f2e8d8' });

  BuildRecycleStation(parent);
  BuildUmbrellaStand(parent, [1.95, GROUND, 1.15]);
  BuildDoormat(parent);
  BuildWallServices(parent);
  BuildCrates(parent);
  const fans = AC_UNITS.map((unit) => BuildAirConditioner(parent, unit));
  return {
    Update(elapsed, delta) {
      fans.forEach((fan, index) => {
        fan.rotation.z -= delta * (5.5 + index * 0.7);
      });
    },
  };
}

function BuildRecycleStation(parent) {
  const body = ToonMaterials.Get('#e3e6ea', { selfLit: 0.1 });
  const hole = ToonMaterials.Get('#1b1f27');
  RECYCLE_BINS.forEach((bin, index) => {
    const x = -2.0 + index * 0.42;
    const z0 = STORE.maxZ + 0.06;
    AddBoxFromBounds(parent, body, x - 0.18, GROUND, z0, x + 0.18, GROUND + 0.9, z0 + 0.4, { castShadow: true });
    AddBoxFromBounds(parent, ToonMaterials.Get(bin.color, { selfLit: 0.15 }), x - 0.19, GROUND + 0.9, z0 - 0.01, x + 0.19, GROUND + 0.98, z0 + 0.42);
    AddMesh(parent, new THREE.CircleGeometry(0.075, 16), hole, [x, GROUND + 0.74, z0 + 0.402]);
    const label = ToonMaterials.Get('#ffffff', { map: CreateLabelTexture(bin.label, { background: bin.color, width: 256, height: 80 }), selfLit: 0.2 });
    AddPlane(parent, label, 0.3, 0.09, [x, GROUND + 0.55, z0 + 0.402]);
  });
}

/** Metal stand with four umbrellas, handles up. */
function BuildUmbrellaStand(parent, position) {
  const stand = AddGroup(parent, position);
  const steel = ToonMaterials.Get('#aeb4bd', { selfLit: 0.1 });
  AddBoxFromBounds(stand, steel, -0.28, 0, -0.12, 0.28, 0.06, 0.12);
  AddBoxFromBounds(stand, steel, -0.28, 0.42, -0.12, 0.28, 0.46, 0.12);
  for (const x of [-0.27, 0.25]) AddBoxFromBounds(stand, steel, x, 0, -0.11, x + 0.02, 0.46, 0.11);
  const colors = ['#e3f1fb', '#22325c', '#d94a4a', '#e3f1fb'];
  const handle = ToonMaterials.Get('#3a2a20');
  colors.forEach((color, index) => {
    const x = -0.2 + index * 0.13;
    const tilt = (index - 1.5) * 0.07;
    AddCylinder(stand, ToonMaterials.Get(color, { selfLit: 0.12 }), 0.01, 0.048, 0.78, [x, 0.04, 0], { segments: 8, rotation: [0, 0, tilt] });
    AddMesh(stand, new THREE.TorusGeometry(0.045, 0.012, 6, 10, Math.PI), handle, [x - Math.sin(tilt) * 0.82 + 0.045, 0.86, 0], { rotation: [0, 0, Math.PI] });
  });
}

function BuildDoormat(parent) {
  const { door } = STORE;
  AddBoxFromBounds(parent, ToonMaterials.Get('#2a2f38'), door.minX - 0.1, GROUND, STORE.maxZ + 0.02, door.maxX + 0.1, GROUND + 0.012, STORE.maxZ + 1.15);
  const mat = ToonMaterials.Get('#ffffff', { map: CreateDoormatTexture(), selfLit: 0.12 });
  AddPlane(parent, mat, door.maxX - door.minX + 0.1, 1.05, [(door.minX + door.maxX) / 2, GROUND + 0.014, STORE.maxZ + 0.585], { rotation: [-Math.PI / 2, 0, 0] });
}

/** Electric meter, conduit and refrigerant pipes on the alley wall. */
function BuildWallServices(parent) {
  const x = STORE.minX - 0.04;
  AddBoxFromBounds(parent, ToonMaterials.Get('#e9ecef'), x - 0.1, 1.3, -1.0, x, 1.65, -0.7);
  AddPlane(parent, ToonMaterials.Glow('#b8ffd0', 0.9), 0.12, 0.06, [x - 0.102, 1.55, -0.85], { rotation: [0, -Math.PI / 2, 0] });
  const pipe = ToonMaterials.Get('#d9d2bf');
  AddTube(parent, ToonMaterials.Get('#8f959e'), new THREE.Vector3(x - 0.05, 1.3, -0.85), new THREE.Vector3(x - 0.05, 3.4, -0.85), 0.02);
  for (const z of [-5.1, -3.7]) {
    AddTube(parent, pipe, new THREE.Vector3(x - 0.08, 0.95, z + 0.3), new THREE.Vector3(x - 0.08, 2.2, z + 0.3), 0.03);
  }
}

/** Stacked plastic drink crates in the alley. */
function BuildCrates(parent) {
  const colors = ['#e3b53c', '#d94a4a', '#e3b53c', '#3a6fd8'];
  colors.forEach((color, index) => {
    const material = ToonMaterials.Get(color, { selfLit: 0.08 });
    const z = -6.2 + (index > 2 ? 0.5 : 0);
    const level = index > 2 ? 0 : index;
    AddBoxFromBounds(parent, material, -8.05, GROUND + level * 0.3, z - 0.22, -7.5, GROUND + level * 0.3 + 0.28, z + 0.22, { castShadow: true });
  });
}

/**
 * Outdoor AC unit; returns its fan pivot for animation.
 * @returns {THREE.Group}
 */
function BuildAirConditioner(parent, unit) {
  const group = AddGroup(parent, unit.position, unit.rotationY);
  const casing = ToonMaterials.Get('#d7dade', { selfLit: 0.08 });
  const dark = ToonMaterials.Get('#2a2f3a');
  AddBoxFromBounds(group, casing, -0.42, 0, -0.15, 0.42, 0.6, 0.15, { castShadow: true });
  AddMesh(group, new THREE.CircleGeometry(0.22, 20), dark, [-0.1, 0.3, 0.152]);
  AddMesh(group, new THREE.RingGeometry(0.2, 0.235, 20), ToonMaterials.Get('#9aa0aa'), [-0.1, 0.3, 0.158]);
  for (let i = 0; i < 5; i++) AddBoxFromBounds(group, ToonMaterials.Get('#b9bec5'), 0.18, 0.08 + i * 0.1, 0.15, 0.38, 0.1 + i * 0.1, 0.158);
  const fan = MarkDynamic(AddGroup(group, [-0.1, 0.3, 0.155]));
  for (let i = 0; i < 3; i++) {
    const blade = AddBoxFromBounds(fan, ToonMaterials.Get('#6b717c'), -0.03, 0, -0.004, 0.03, 0.19, 0.004);
    blade.rotation.z = (i / 3) * Math.PI * 2;
  }
  AddBoxFromBounds(group, ToonMaterials.Get('#8f959e'), -0.4, -0.06, -0.12, 0.4, 0, 0.12);
  return fan;
}
