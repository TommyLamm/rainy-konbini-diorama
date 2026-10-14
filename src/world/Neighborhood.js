import * as THREE from 'three';
import { LAYOUT, LEVELS, PALETTE } from '../config/SceneConfig.js';
import { ToonMaterials } from '../materials/ToonMaterials.js';
import { CreateAwningTexture, CreateBlockWallTexture, CreateLitWindowTexture } from '../textures/BuildingTextures.js';
import { CreateClosedNoticeTexture, CreateKissatenSignTexture, CreateShutterTexture } from '../textures/StreetSignTextures.js';
import { AddBoxFromBounds, AddCylinder, AddGroup, AddMesh, AddPlane, AddTube } from '../utils/MeshKit.js';
import { AddGlowSprite } from '../utils/GlowSprite.js';
import { AlleyFlicker, LIGHT_RIG } from './Lighting.js';

const GROUND = LEVELS.CURB;
const SHOP = Object.freeze({ ...LAYOUT.NEIGHBOR_WEST, height: 5.6 });
/** minZ leaves room for the roof overhang inside the base edge. */
const HOUSE = Object.freeze({ minX: 3.4, maxX: 7.1, minZ: -11.6, maxZ: -8.15, wallTop: 4.9, ridge: 6.3 });

/**
 * Buildings, walls and greenery framing the store.
 * @param {THREE.Object3D} parent
 * @returns {{Update: (elapsed: number) => void}}
 */
export function BuildNeighborhood(parent) {
  const alleyTube = BuildOldShop(parent);
  BuildHouse(parent);
  BuildBlockWalls(parent);
  BuildBackGarden(parent);
  return {
    Update(elapsed) {
      const flicker = AlleyFlicker(elapsed);
      alleyTube.material.color.copy(alleyTube.material.userData.baseColor).multiplyScalar(alleyTube.material.userData.baseIntensity * flicker);
      alleyTube.sprite.material.color.copy(alleyTube.sprite.material.userData.baseColor).multiplyScalar(0.8 * flicker);
    },
  };
}

/** Closed kissaten with shutter, awning, lit upstairs window and alley lamp. */
function BuildOldShop(parent) {
  const { minX, maxX, minZ, maxZ, height } = SHOP;
  const wall = ToonMaterials.Get(PALETTE.neighborWall);
  const trim = ToonMaterials.Get('#8c7b66');
  const roof = ToonMaterials.Get(PALETTE.neighborRoof);
  AddBoxFromBounds(parent, wall, minX, GROUND, minZ, maxX, GROUND + height, maxZ, { castShadow: true });
  AddBoxFromBounds(parent, trim, minX, GROUND + 2.95, maxZ, maxX + 0.04, GROUND + 3.08, maxZ + 0.06);
  AddBoxFromBounds(parent, trim, maxX, GROUND + 2.95, minZ, maxX + 0.06, GROUND + 3.08, maxZ);
  AddBoxFromBounds(parent, roof, minX, GROUND + height, minZ, maxX + 0.18, GROUND + height + 0.16, maxZ + 0.2, { castShadow: true });
  AddCylinder(parent, ToonMaterials.Get('#c9ced6'), 0.45, 0.45, 0.9, [-10.6, GROUND + height + 0.16, -6.0], { segments: 14, castShadow: true });
  AddTube(parent, ToonMaterials.Get('#5a606b'), new THREE.Vector3(-9.2, GROUND + height + 0.16, -2.0), new THREE.Vector3(-9.2, GROUND + height + 1.6, -2.0), 0.02);
  AddTube(parent, ToonMaterials.Get('#5a606b'), new THREE.Vector3(-9.6, GROUND + height + 1.4, -2.0), new THREE.Vector3(-8.8, GROUND + height + 1.4, -2.0), 0.015);

  // Ground floor shutter with a notice, shutter box and striped awning.
  const shutter = ToonMaterials.Get('#ffffff', { map: CreateShutterTexture() });
  AddPlane(parent, shutter, 3.0, 2.4, [-10.1, GROUND + 1.25, maxZ + 0.01]);
  AddBoxFromBounds(parent, ToonMaterials.Get('#6b717c'), -11.65, GROUND + 2.45, maxZ, -8.55, GROUND + 2.72, maxZ + 0.2);
  AddPlane(parent, ToonMaterials.Get('#ffffff', { map: CreateClosedNoticeTexture(), selfLit: 0.1 }), 0.3, 0.42, [-9.4, GROUND + 1.4, maxZ + 0.014]);
  const awning = ToonMaterials.Get('#ffffff', { map: CreateAwningTexture() });
  AddBoxFromBounds(parent, awning, -11.75, 0, -0.45, -8.45, 0.05, 0.45, { rotation: [0.32, 0, 0] }).position.set(-10.1, GROUND + 2.88, maxZ + 0.42);

  // Upstairs: someone is still awake.
  const lit = ToonMaterials.Glow('#ffffff', 1.05, { map: CreateLitWindowTexture(31) });
  AddPlane(parent, lit, 1.6, 1.2, [-10.4, GROUND + 4.15, maxZ + 0.01]);
  AddWindowFrame(parent, -10.4, GROUND + 4.15, maxZ + 0.02, 1.6, 1.2);
  AddBoxFromBounds(parent, ToonMaterials.Get('#d7dade'), -9.25, GROUND + 3.35, maxZ, -8.5, GROUND + 3.85, maxZ + 0.28, { castShadow: true });

  // Hanging vertical sign, perpendicular to the street.
  const sign = ToonMaterials.Get('#ffffff', { map: CreateKissatenSignTexture(), selfLit: 0.12 });
  AddBoxFromBounds(parent, ToonMaterials.Get('#3b2a20'), -8.52, GROUND + 3.55, maxZ, -8.46, GROUND + 3.62, maxZ + 0.62);
  AddBoxFromBounds(parent, ToonMaterials.Get('#3b2a20'), -8.55, GROUND + 2.25, maxZ + 0.12, -8.43, GROUND + 3.55, maxZ + 0.56);
  AddPlane(parent, sign, 0.42, 1.28, [-8.425, GROUND + 2.9, maxZ + 0.34], { rotation: [0, Math.PI / 2, 0] });
  AddPlane(parent, sign, 0.42, 1.28, [-8.555, GROUND + 2.9, maxZ + 0.34], { rotation: [0, -Math.PI / 2, 0] });

  // Downspout at the street corner of the roof.
  AddTube(parent, ToonMaterials.Get('#6f7682'), new THREE.Vector3(maxX + 0.08, GROUND + height + 0.05, maxZ - 0.12), new THREE.Vector3(maxX + 0.08, GROUND + 0.25, maxZ - 0.12), 0.05);

  // Alley side: back door, dark window, fluorescent tube bracket.
  AddBoxFromBounds(parent, ToonMaterials.Get('#5a4030'), maxX, GROUND, -0.6, maxX + 0.05, GROUND + 2.0, 0.3);
  AddPlane(parent, ToonMaterials.Get('#2a3346', { selfLit: 0.15 }), 1.0, 0.9, [maxX + 0.01, GROUND + 4.1, -3.4], { rotation: [0, Math.PI / 2, 0] });
  AddWindowFrame(parent, maxX + 0.02, GROUND + 4.1, -3.4, 1.0, 0.9, true);
  const lamp = LIGHT_RIG.alley.position;
  AddBoxFromBounds(parent, ToonMaterials.Get('#d7dade'), maxX, lamp[1] + 0.04, lamp[2] - 0.45, maxX + 0.14, lamp[1] + 0.12, lamp[2] + 0.45);
  const tubeMaterial = ToonMaterials.CreateGlow('#e8fff2', 3.0);
  AddCylinder(parent, tubeMaterial, 0.025, 0.025, 0.84, [maxX + 0.09, lamp[1], lamp[2] - 0.42], { rotation: [Math.PI / 2, 0, 0], segments: 8 });
  const sprite = AddGlowSprite(parent, '#d9ffe8', 1.2, [maxX + 0.15, lamp[1], lamp[2]], 0.8);
  return { material: tubeMaterial, sprite };
}

function AddWindowFrame(parent, x, y, z, width, height, facingX = false) {
  const frame = ToonMaterials.Get('#5a4a3a');
  const t = 0.05;
  const boxes = [
    [-width / 2 - t, -height / 2 - t, width / 2 + t, -height / 2],
    [-width / 2 - t, height / 2, width / 2 + t, height / 2 + t],
    [-width / 2 - t, -height / 2, -width / 2, height / 2],
    [width / 2, -height / 2, width / 2 + t, height / 2],
    [-t / 2, -height / 2, t / 2, height / 2],
  ];
  for (const [a0, b0, a1, b1] of boxes) {
    if (facingX) AddBoxFromBounds(parent, frame, x, y + b0, z + a0, x + 0.04, y + b1, z + a1);
    else AddBoxFromBounds(parent, frame, x + a0, y + b0, z, x + a1, y + b1, z + 0.04);
  }
}

/** Two-storey house behind the parking with a gable roof. */
function BuildHouse(parent) {
  const { minX, maxX, minZ, maxZ, wallTop, ridge } = HOUSE;
  AddBoxFromBounds(parent, ToonMaterials.Get(PALETTE.houseWall), minX, GROUND, minZ, maxX, wallTop, maxZ, { castShadow: true });
  const overhang = 0.35;
  const halfDepth = (maxZ - minZ) / 2 + overhang;
  const shape = new THREE.Shape();
  shape.moveTo(-halfDepth, 0);
  shape.lineTo(halfDepth, 0);
  shape.lineTo(0, ridge - wallTop);
  shape.closePath();
  const roofGeometry = new THREE.ExtrudeGeometry(shape, { depth: maxX - minX + overhang * 2, bevelEnabled: false }).rotateY(Math.PI / 2);
  AddMesh(parent, roofGeometry, ToonMaterials.Get('#3d4a63'), [minX - overhang, wallTop, (minZ + maxZ) / 2], { castShadow: true });

  const lit = ToonMaterials.Glow('#ffffff', 1.0, { map: CreateLitWindowTexture(57) });
  AddPlane(parent, lit, 1.2, 0.95, [4.6, GROUND + 3.5, maxZ + 0.01]);
  AddWindowFrame(parent, 4.6, GROUND + 3.5, maxZ + 0.02, 1.2, 0.95);
  AddPlane(parent, ToonMaterials.Glow('#ffffff', 0.35, { map: CreateLitWindowTexture(91, { warm: false }) }), 1.2, 0.95, [6.3, GROUND + 3.5, maxZ + 0.01]);
  AddWindowFrame(parent, 6.3, GROUND + 3.5, maxZ + 0.02, 1.2, 0.95);
  AddBoxFromBounds(parent, ToonMaterials.Get('#6b4a36'), 5.6, GROUND, maxZ, 6.5, GROUND + 2.0, maxZ + 0.05);
  AddBoxFromBounds(parent, ToonMaterials.Get('#7f8a99'), 5.45, GROUND + 2.1, maxZ, 6.65, GROUND + 2.18, maxZ + 0.6);
  AddPlane(parent, ToonMaterials.Glow('#ffd9a0', 2.2), 0.14, 0.1, [6.05, GROUND + 2.25, maxZ + 0.06]);
  AddGlowSprite(parent, '#ffcf8f', 0.7, [6.05, GROUND + 2.25, maxZ + 0.15], 0.8);
}

/** Concrete block walls behind the store and in front of the house. */
function BuildBlockWalls(parent) {
  const runs = [
    { minX: -6.6, maxX: -1.0, z: LAYOUT.BACK_WALL_Z },
    { minX: 0.2, maxX: 3.1, z: LAYOUT.BACK_WALL_Z },
    { minX: 3.1, maxX: 5.45, z: -7.62 },
    { minX: 6.65, maxX: 7.3, z: -7.62 },
  ];
  for (const run of runs) {
    const length = run.maxX - run.minX;
    const material = ToonMaterials.Get('#ffffff', { map: CreateBlockWallTexture(length / 0.8, 3) });
    AddBoxFromBounds(parent, material, run.minX, GROUND, run.z - 0.08, run.maxX, GROUND + 1.2, run.z + 0.08, { castShadow: true });
    AddBoxFromBounds(parent, ToonMaterials.Get('#a3a5a9'), run.minX - 0.02, GROUND + 1.2, run.z - 0.1, run.maxX + 0.02, GROUND + 1.26, run.z + 0.1);
  }
}

/** Dark garden with two rounded trees and shrubs. */
function BuildBackGarden(parent) {
  AddBoxFromBounds(parent, ToonMaterials.Get('#2f3b33'), -6.6, GROUND, -12, 3.1, GROUND + 0.03, LAYOUT.BACK_WALL_Z - 0.08);
  AddBoxFromBounds(parent, ToonMaterials.Get('#2f3b33'), 3.1, GROUND, -8.15, 7.3, GROUND + 0.03, -7.7);
  BuildTree(parent, [-3.6, GROUND, -10.2], 1.0);
  BuildTree(parent, [0.8, GROUND, -9.7], 0.8);
  BuildTree(parent, [-6.0, GROUND, -11.0], 0.7);
  for (const [x, z, r] of [[3.8, -7.95, 0.32], [7.0, -7.95, 0.28], [-6.2, -8.4, 0.4]]) {
    AddMesh(parent, new THREE.IcosahedronGeometry(r, 1), ToonMaterials.Get(PALETTE.foliage), [x, GROUND + r * 0.8, z], { castShadow: true });
  }
}

function BuildTree(parent, position, scale) {
  const tree = AddGroup(parent, position);
  AddCylinder(tree, ToonMaterials.Get('#4a3a30'), 0.12 * scale, 0.08 * scale, 2.6 * scale, [0, 0, 0], { segments: 8, castShadow: true });
  const leaves = ToonMaterials.Get(PALETTE.foliage);
  const lighter = ToonMaterials.Get('#3b6e5e');
  for (const [x, y, z, r, material] of [[0, 3.0, 0, 1.15, leaves], [0.6, 2.6, 0.3, 0.8, lighter], [-0.55, 2.7, -0.2, 0.85, leaves], [0.1, 3.7, -0.1, 0.75, lighter]]) {
    AddMesh(tree, new THREE.IcosahedronGeometry(r * scale, 1), material, [x * scale, y * scale, z * scale], { castShadow: true });
  }
}
