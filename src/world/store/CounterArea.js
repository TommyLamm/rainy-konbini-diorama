import * as THREE from 'three';
import { LAYERS, PALETTE, STORE } from '../../config/SceneConfig.js';
import { ToonMaterials } from '../../materials/ToonMaterials.js';
import {
  CreateBackShelfTexture,
  CreateCounterFrontTexture,
  CreateLabelTexture,
  CreateMenuBoardTexture,
} from '../../textures/StoreSignTextures.js';
import { AddBoxFromBounds, AddCylinder, AddPlane } from '../../utils/MeshKit.js';

const FLOOR = STORE.floorY;
const COUNTER = Object.freeze({ minX: -1.3, maxX: 1.95, minZ: -4.65, maxZ: -4.0, topY: 1.02 });

/**
 * Register counter with hot food, coffee corner, staff back wall.
 * @param {THREE.Object3D} parent
 * @param {import('./ProductKit.js').ProductBatcher} batcher
 * @param {import('../../utils/Random.js').Random} random
 * @returns {{steamOrigins: THREE.Vector3[]}}
 */
export function BuildCounterArea(parent, batcher, random) {
  const white = ToonMaterials.Interior('#fbfbf8');
  const dark = ToonMaterials.Interior('#3a404c');
  const steel = ToonMaterials.Interior('#c3c8cf');

  BuildCounter(parent, white, dark);
  BuildRegisters(parent, dark);
  BuildHotSnackCase(parent, batcher, random, dark);
  const odenSteam = BuildOdenPot(parent, batcher, random, steel);
  const coffeeSteam = BuildCoffeeCorner(parent, white, dark);
  BuildStaffWall(parent, white, dark);
  return { steamOrigins: [odenSteam, coffeeSteam] };
}

function BuildCounter(parent, white, dark) {
  const { minX, maxX, minZ, maxZ, topY } = COUNTER;
  AddBoxFromBounds(parent, white, minX, FLOOR, minZ, maxX, topY, maxZ);
  AddBoxFromBounds(parent, ToonMaterials.Interior('#d9c3a0'), minX - 0.05, topY, minZ - 0.04, maxX + 0.05, topY + 0.045, maxZ + 0.06);
  AddBoxFromBounds(parent, dark, minX, FLOOR, maxZ - 0.02, maxX, FLOOR + 0.08, maxZ + 0.01);
  const front = ToonMaterials.Interior('#ffffff', { map: CreateCounterFrontTexture() });
  AddPlane(parent, front, maxX - minX - 0.2, (topY - FLOOR) * 0.62, [(minX + maxX) / 2, FLOOR + (topY - FLOOR) * 0.55, maxZ + 0.004]);
}

/** Two POS terminals: staff screen faces north, customer display faces south. */
function BuildRegisters(parent, dark) {
  const top = COUNTER.topY + 0.045;
  const screen = ToonMaterials.Glow('#9fd8ff', 1.4);
  const customer = ToonMaterials.Glow('#7dffb8', 1.6);
  for (const x of [-0.4, 0.62]) {
    const z = (COUNTER.minZ + COUNTER.maxZ) / 2;
    AddBoxFromBounds(parent, dark, x - 0.2, top, z - 0.17, x + 0.2, top + 0.09, z + 0.17);
    AddBoxFromBounds(parent, dark, x - 0.03, top + 0.09, z - 0.04, x + 0.03, top + 0.3, z + 0.02);
    AddBoxFromBounds(parent, dark, x - 0.17, top + 0.26, z - 0.14, x + 0.17, top + 0.5, z - 0.08);
    AddPlane(parent, screen, 0.3, 0.2, [x, top + 0.38, z - 0.145], { rotation: [0, Math.PI, 0] });
    AddBoxFromBounds(parent, dark, x - 0.09, top + 0.09, z + 0.12, x + 0.09, top + 0.2, z + 0.16);
    AddPlane(parent, customer, 0.15, 0.08, [x, top + 0.145, z + 0.162]);
    AddBoxFromBounds(parent, ToonMaterials.Interior('#5a6270'), x + 0.22, top, z + 0.04, x + 0.32, top + 0.04, z + 0.2);
  }
}

/** Heated glass case of karaage, croquettes and steamed buns. */
function BuildHotSnackCase(parent, batcher, random, dark) {
  const minX = 1.1;
  const maxX = 1.88;
  const minZ = COUNTER.minZ + 0.08;
  const maxZ = COUNTER.maxZ - 0.06;
  const base = COUNTER.topY + 0.045;
  const top = base + 0.5;
  AddBoxFromBounds(parent, dark, minX, base, minZ, maxX, base + 0.06, maxZ);
  AddBoxFromBounds(parent, dark, minX, top - 0.05, minZ, maxX, top, maxZ);
  AddPlane(parent, ToonMaterials.Glow('#ffb76b', 1.6), maxX - minX, top - base - 0.11, [(minX + maxX) / 2, (base + top) / 2, minZ + 0.01]);
  for (const x of [minX, maxX - 0.03]) AddBoxFromBounds(parent, dark, x, base, minZ, x + 0.03, top, maxZ);
  const shelfY = base + 0.25;
  AddBoxFromBounds(parent, ToonMaterials.Interior('#c3c8cf'), minX + 0.03, shelfY, minZ, maxX - 0.03, shelfY + 0.012, maxZ);
  for (let x = minX + 0.09; x < maxX - 0.06; x += 0.1) {
    batcher.Add('sphere', [x, base + 0.06, (minZ + maxZ) / 2 + random.Range(-0.05, 0.05)], [0.085, 0.07, 0.08], random.Pick(['#c8741e', '#b5651d', '#d9893a']));
    batcher.Add('sphere', [x, shelfY + 0.012, (minZ + maxZ) / 2], [0.09, 0.08, 0.09], random.Chance(0.6) ? '#fbf3e4' : '#e8b07a');
  }
  const glass = new THREE.MeshBasicMaterial({ color: '#ffe2b8', transparent: true, opacity: 0.14, depthWrite: false });
  const front = AddPlane(parent, glass, maxX - minX, top - base - 0.11, [(minX + maxX) / 2, (base + top) / 2, maxZ], { layer: LAYERS.FX });
  front.renderOrder = 3;
  const label = ToonMaterials.Interior('#ffffff', { map: CreateLabelTexture('からあげ・ホットスナック', { background: '#d6361b', width: 512, height: 64 }) });
  AddPlane(parent, label, maxX - minX, 0.06, [(minX + maxX) / 2, top - 0.025, maxZ + 0.003]);
}

/** Oden pot: steel tray of broth with daikon, eggs, konnyaku and tofu. */
function BuildOdenPot(parent, batcher, random, steel) {
  const minX = -1.24;
  const maxX = -0.78;
  const minZ = COUNTER.minZ + 0.1;
  const maxZ = COUNTER.maxZ - 0.08;
  const base = COUNTER.topY + 0.045;
  const brothY = base + 0.15;
  AddBoxFromBounds(parent, steel, minX, base, minZ, maxX, base + 0.18, maxZ);
  AddPlane(parent, ToonMaterials.Interior('#c98d3c'), maxX - minX - 0.04, maxZ - minZ - 0.04, [(minX + maxX) / 2, brothY, (minZ + maxZ) / 2], { rotation: [-Math.PI / 2, 0, 0] });
  AddBoxFromBounds(parent, steel, (minX + maxX) / 2 - 0.006, base, minZ, (minX + maxX) / 2 + 0.006, base + 0.185, maxZ);
  AddBoxFromBounds(parent, steel, minX, base, (minZ + maxZ) / 2 - 0.006, maxX, base + 0.185, (minZ + maxZ) / 2 + 0.006);
  const items = [
    { type: 'can', size: [0.07, 0.03, 0.07], color: '#f2e3c4' },
    { type: 'sphere', size: [0.05, 0.04, 0.06], color: '#d9a066' },
    { type: 'triangle', size: [0.07, 0.06, 0.03], color: '#6e6a7a' },
    { type: 'box', size: [0.06, 0.035, 0.06], color: '#f6ecd2' },
  ];
  for (let x = minX + 0.06; x < maxX - 0.04; x += 0.075) {
    for (let z = minZ + 0.06; z < maxZ - 0.04; z += 0.08) {
      const item = random.Pick(items);
      batcher.Add(item.type, [x, brothY - 0.012, z], item.size, item.color, random.Range(0, Math.PI));
    }
  }
  const sign = ToonMaterials.Interior('#ffffff', { map: CreateLabelTexture('おでん', { background: '#b0281c', width: 256, height: 96 }) });
  AddPlane(parent, sign, 0.3, 0.11, [(minX + maxX) / 2, base + 0.26, maxZ + 0.01]);
  AddBoxFromBounds(parent, steel, (minX + maxX) / 2 - 0.006, base + 0.18, maxZ, (minX + maxX) / 2 + 0.006, base + 0.21, maxZ + 0.01);
  return new THREE.Vector3((minX + maxX) / 2, brothY + 0.03, (minZ + maxZ) / 2);
}

/** Self-serve coffee machine on a cabinet by the east window. */
function BuildCoffeeCorner(parent, white, dark) {
  const minX = 1.96;
  const maxX = STORE.maxX - STORE.wall - 0.04;
  const minZ = -3.85;
  const maxZ = -3.25;
  const cabinetTop = FLOOR + 0.76;
  AddBoxFromBounds(parent, white, minX, FLOOR, minZ, maxX, cabinetTop, maxZ);
  const machineMinZ = minZ + 0.06;
  const machineMaxZ = minZ + 0.42;
  AddBoxFromBounds(parent, dark, minX + 0.04, cabinetTop, machineMinZ, maxX - 0.02, cabinetTop + 0.66, machineMaxZ);
  AddBoxFromBounds(parent, ToonMaterials.Interior('#1b1f27'), minX + 0.02, cabinetTop + 0.08, machineMinZ + 0.08, minX + 0.06, cabinetTop + 0.3, machineMaxZ - 0.08);
  AddPlane(parent, ToonMaterials.Glow('#ffd29a', 1.8), 0.2, 0.1, [minX + 0.035, cabinetTop + 0.48, (machineMinZ + machineMaxZ) / 2], { rotation: [0, -Math.PI / 2, 0] });
  const label = ToonMaterials.Interior('#ffffff', { map: CreateLabelTexture('COFFEE', { background: '#3b2418', color: '#ffd9a0', width: 256, height: 96 }) });
  AddPlane(parent, label, 0.3, 0.1, [minX + 0.035, cabinetTop + 0.6, (machineMinZ + machineMaxZ) / 2], { rotation: [0, -Math.PI / 2, 0] });
  const cup = ToonMaterials.Interior('#ffffff');
  for (let i = 0; i < 3; i++) AddCylinder(parent, cup, 0.035, 0.045, 0.2, [minX + 0.12, cabinetTop, machineMaxZ + 0.06 + i * 0.05], { segments: 10 });
  return new THREE.Vector3(minX + 0.02, cabinetTop + 0.18, (machineMinZ + machineMaxZ) / 2);
}

/** Back counter, cigarette wall, menu board and the STAFF ONLY door. */
function BuildStaffWall(parent, white, dark) {
  const wallZ = STORE.minZ + STORE.wall + 0.035;
  const minX = -1.2;
  const maxX = 2.3;
  AddBoxFromBounds(parent, white, minX, FLOOR, wallZ, maxX, FLOOR + 0.72, wallZ + 0.52);
  AddBoxFromBounds(parent, dark, 0.05, FLOOR + 0.72, wallZ + 0.08, 0.55, FLOOR + 1.0, wallZ + 0.42);
  AddPlane(parent, ToonMaterials.Interior('#1b1f27'), 0.32, 0.2, [0.26, FLOOR + 0.86, wallZ + 0.424]);
  AddPlane(parent, ToonMaterials.Glow('#7dffb8', 1.4), 0.08, 0.04, [0.48, FLOOR + 0.93, wallZ + 0.424]);

  AddBoxFromBounds(parent, dark, minX, FLOOR + 1.12, wallZ, maxX, FLOOR + 2.1, wallZ + 0.22);
  const shelf = ToonMaterials.Interior('#ffffff', { map: CreateBackShelfTexture() });
  AddPlane(parent, shelf, maxX - minX - 0.06, 0.92, [(minX + maxX) / 2, FLOOR + 1.61, wallZ + 0.224]);
  const menu = ToonMaterials.Glow('#ffffff', 1.15, { map: CreateMenuBoardTexture() });
  AddPlane(parent, menu, 2.6, 0.54, [(minX + maxX) / 2, FLOOR + 2.45, wallZ + 0.02]);

  const doorMinX = -2.32;
  const doorMaxX = -1.48;
  const doorTop = FLOOR + 2.05;
  AddBoxFromBounds(parent, dark, doorMinX - 0.06, FLOOR, wallZ, doorMaxX + 0.06, doorTop + 0.06, wallZ + 0.03);
  AddBoxFromBounds(parent, ToonMaterials.Interior('#8fa3b8'), doorMinX, FLOOR, wallZ + 0.03, doorMaxX, doorTop, wallZ + 0.06);
  AddBoxFromBounds(parent, ToonMaterials.Interior('#2a3240'), doorMinX + 0.25, FLOOR + 1.35, wallZ + 0.06, doorMaxX - 0.25, FLOOR + 1.75, wallZ + 0.065);
  AddBoxFromBounds(parent, ToonMaterials.Interior('#e9ecef'), doorMaxX - 0.16, FLOOR + 0.95, wallZ + 0.06, doorMaxX - 0.1, FLOOR + 1.2, wallZ + 0.08);
  const plate = ToonMaterials.Interior('#ffffff', { map: CreateLabelTexture('STAFF ONLY', { background: '#ffffff', color: '#3a404c', width: 256, height: 64 }) });
  AddPlane(parent, plate, 0.4, 0.1, [(doorMinX + doorMaxX) / 2, FLOOR + 1.88, wallZ + 0.066]);
  const clock = ToonMaterials.Interior('#ffffff');
  AddCylinder(parent, clock, 0.17, 0.17, 0.04, [(doorMinX + doorMaxX) / 2, FLOOR + 2.5, wallZ], { rotation: [Math.PI / 2, 0, 0], segments: 20 });
  AddBoxFromBounds(parent, ToonMaterials.Interior(PALETTE.frameDark), (doorMinX + doorMaxX) / 2 - 0.006, FLOOR + 2.5, wallZ + 0.045, (doorMinX + doorMaxX) / 2 + 0.006, FLOOR + 2.62, wallZ + 0.05);
}
