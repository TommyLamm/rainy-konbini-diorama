import * as THREE from 'three';
import { PALETTE, STORE } from '../../config/SceneConfig.js';
import { ToonMaterials } from '../../materials/ToonMaterials.js';
import { CreateInteriorFloorTexture } from '../../textures/GroundTextures.js';
import { CreateLabelTexture } from '../../textures/StoreSignTextures.js';
import { AddBoxFromBounds, AddCylinder, AddMesh, AddPlane, AddTube, ApplyPlanarUV } from '../../utils/MeshKit.js';

const FLOOR = STORE.floorY;
const INNER = Object.freeze({
  minX: STORE.minX + STORE.wall,
  maxX: STORE.maxX - STORE.wall,
  minZ: STORE.minZ + STORE.wall,
  maxZ: STORE.maxZ - STORE.wall,
});
const POP_SIGNS = Object.freeze([
  { text: 'ドリンク', color: '#2f6fe0', x: -4.4, z: -4.95 },
  { text: 'お菓子', color: '#ff5d73', x: -4.3, z: -3.0 },
  { text: '日用品', color: '#2fbfa2', x: -2.3, z: -3.0 },
  { text: 'レジ', color: '#ff9a3c', x: 0.35, z: -3.75 },
]);

/**
 * Floor, ceiling lights, hanging POP signs and service machines.
 * @param {THREE.Object3D} parent
 */
export function BuildInteriorDecor(parent) {
  const floorGeometry = new THREE.PlaneGeometry(INNER.maxX - INNER.minX, INNER.maxZ - INNER.minZ).rotateX(-Math.PI / 2);
  floorGeometry.translate((INNER.minX + INNER.maxX) / 2, 0, (INNER.minZ + INNER.maxZ) / 2);
  ApplyPlanarUV(floorGeometry, INNER);
  AddMesh(parent, floorGeometry, ToonMaterials.Interior('#ffffff', { map: CreateInteriorFloorTexture(INNER) }), [0, FLOOR + 0.001, 0]);

  BuildCeilingLights(parent);
  BuildPopSigns(parent);
  BuildServiceMachines(parent);
  BuildEntranceItems(parent);
}

function BuildCeilingLights(parent) {
  const panel = ToonMaterials.Glow('#fff2dc', 1.9);
  const housing = ToonMaterials.Interior('#e9e6df');
  for (const z of [-5.0, -3.25, -1.5, 0.15]) {
    for (const x of [-4.9, -2.1, 0.75]) {
      AddBoxFromBounds(parent, housing, x - 1.25, STORE.ceilingY - 0.06, z - 0.15, x + 1.25, STORE.ceilingY, z + 0.15);
      AddBoxFromBounds(parent, panel, x - 1.18, STORE.ceilingY - 0.075, z - 0.1, x + 1.18, STORE.ceilingY - 0.06, z + 0.1);
    }
  }
}

/** Double-sided aisle signs hanging on two wires. */
function BuildPopSigns(parent) {
  const wire = ToonMaterials.Interior('#8a909a');
  for (const sign of POP_SIGNS) {
    const material = ToonMaterials.Interior('#ffffff', { map: CreateLabelTexture(sign.text, { background: sign.color, width: 256, height: 96 }) });
    const y = 2.62;
    AddPlane(parent, material, 0.72, 0.27, [sign.x, y, sign.z + 0.006]);
    AddPlane(parent, material, 0.72, 0.27, [sign.x, y, sign.z - 0.006], { rotation: [0, Math.PI, 0] });
    AddBoxFromBounds(parent, ToonMaterials.Interior('#ffffff'), sign.x - 0.37, y - 0.15, sign.z - 0.004, sign.x + 0.37, y + 0.15, sign.z + 0.004);
    for (const dx of [-0.3, 0.3]) {
      AddTube(parent, wire, new THREE.Vector3(sign.x + dx, y + 0.13, sign.z), new THREE.Vector3(sign.x + dx, STORE.ceilingY, sign.z), 0.006, { segments: 4 });
    }
  }
}

/** Multi-copy machine and ATM in the front corner by the magazines. */
function BuildServiceMachines(parent) {
  const white = ToonMaterials.Interior('#f2f2ee');
  const dark = ToonMaterials.Interior('#3a404c');
  const copy = { minX: INNER.minX + 0.02, maxX: INNER.minX + 0.72, minZ: -0.4, maxZ: 0.4 };
  AddBoxFromBounds(parent, white, copy.minX, FLOOR, copy.minZ, copy.maxX, FLOOR + 1.0, copy.maxZ);
  AddBoxFromBounds(parent, dark, copy.minX, FLOOR + 1.0, copy.minZ, copy.maxX, FLOOR + 1.08, copy.maxZ);
  AddBoxFromBounds(parent, dark, copy.maxX - 0.05, FLOOR + 0.9, copy.minZ + 0.1, copy.maxX + 0.08, FLOOR + 1.02, copy.maxZ - 0.1);
  AddPlane(parent, ToonMaterials.Glow('#9fd8ff', 1.4), 0.2, 0.12, [copy.maxX + 0.082, FLOOR + 0.98, (copy.minZ + copy.maxZ) / 2], { rotation: [-0.5, Math.PI / 2, 0] });
  const copyLabel = ToonMaterials.Interior('#ffffff', { map: CreateLabelTexture('マルチコピー', { background: PALETTE.storeMint, width: 256, height: 64 }) });
  AddPlane(parent, copyLabel, 0.5, 0.12, [copy.maxX + 0.003, FLOOR + 0.72, (copy.minZ + copy.maxZ) / 2], { rotation: [0, Math.PI / 2, 0] });

  const atm = { minX: -5.55, maxX: -4.95, minZ: -0.02, maxZ: 0.5 };
  AddBoxFromBounds(parent, ToonMaterials.Interior('#5a6f8f'), atm.minX, FLOOR, atm.minZ, atm.maxX, FLOOR + 1.55, atm.maxZ);
  AddBoxFromBounds(parent, dark, atm.minX + 0.05, FLOOR + 0.95, atm.minZ - 0.12, atm.maxX - 0.05, FLOOR + 1.05, atm.minZ);
  AddPlane(parent, ToonMaterials.Glow('#9fd8ff', 1.5), 0.36, 0.26, [(atm.minX + atm.maxX) / 2, FLOOR + 1.25, atm.minZ - 0.004], { rotation: [0, Math.PI, 0] });
  const atmLabel = ToonMaterials.Interior('#ffffff', { map: CreateLabelTexture('ATM', { background: '#1f4fa0', width: 128, height: 64 }) });
  AddPlane(parent, atmLabel, 0.3, 0.13, [(atm.minX + atm.maxX) / 2, FLOOR + 1.47, atm.minZ - 0.004], { rotation: [0, Math.PI, 0] });
}

/** Basket stack and the bucket of vinyl umbrellas sold on rainy nights. */
function BuildEntranceItems(parent) {
  const basket = ToonMaterials.Interior('#2f6fe0');
  for (let i = 0; i < 6; i++) {
    AddBoxFromBounds(parent, basket, -0.82, FLOOR + 0.06 + i * 0.07, 0.05, -0.38, FLOOR + 0.12 + i * 0.07, 0.42);
  }
  AddBoxFromBounds(parent, ToonMaterials.Interior('#3a404c'), -0.85, FLOOR, 0.02, -0.35, FLOOR + 0.06, 0.45);

  const bucket = ToonMaterials.Interior('#c3c8cf');
  AddCylinder(parent, bucket, 0.16, 0.18, 0.42, [2.0, FLOOR, 0.25], { segments: 14 });
  const vinyl = ToonMaterials.Interior('#e3f1fb');
  const handle = ToonMaterials.Interior('#e9ecef');
  const hook = new THREE.TorusGeometry(0.045, 0.012, 6, 10, Math.PI);
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const x = 2.0 + Math.cos(angle) * 0.07;
    const z = 0.25 + Math.sin(angle) * 0.07;
    AddCylinder(parent, vinyl, 0.012, 0.055, 0.72, [x, FLOOR + 0.12, z], { segments: 8, rotation: [Math.cos(angle) * 0.08, 0, -Math.sin(angle) * 0.08] });
    AddMesh(parent, hook, handle, [x + 0.045, FLOOR + 0.9, z], { rotation: [0, angle, Math.PI] });
  }
  const sign = ToonMaterials.Interior('#ffffff', { map: CreateLabelTexture('傘 ¥550', { background: '#2d6fd1', width: 256, height: 96 }) });
  AddPlane(parent, sign, 0.3, 0.12, [2.0, FLOOR + 0.3, 0.433]);

  AddMesh(parent, new THREE.SphereGeometry(0.09, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), ToonMaterials.Interior('#2a2f3a'), [-0.4, STORE.ceilingY, -0.6], { rotation: [Math.PI, 0, 0] });
  AddMesh(parent, new THREE.CircleGeometry(0.28, 20), ToonMaterials.Interior('#dfe8f2'), [INNER.minX + 0.3, 2.55, INNER.minZ + 0.3], { rotation: [0, Math.PI / 4, 0] });
}
