import * as THREE from 'three';
import { LAYERS, PALETTE, STORE } from '../../config/SceneConfig.js';
import { ToonMaterials } from '../../materials/ToonMaterials.js';
import { CreateRainGlassMaterial } from '../../materials/RainGlassMaterial.js';
import { CreatePosterTexture, CreateStoreSignTexture } from '../../textures/StoreSignTextures.js';
import { CreateRoofTexture } from '../../textures/BuildingTextures.js';
import { AddBoxFromBounds, AddCylinder, AddMesh, AddPlane } from '../../utils/MeshKit.js';
import { HumValue } from '../../effects/Flicker.js';

const FRAME = 0.06;
const LINING = 0.035;
const SIGN_DEPTH = 0.16;

/**
 * Exterior envelope of the store: walls, glazing, roof, sign bands, canopy.
 * @param {THREE.Object3D} parent
 * @returns {{Update: (elapsed: number) => void}}
 */
export function BuildStoreShell(parent) {
  const materials = {
    wall: ToonMaterials.Get(PALETTE.storeWall),
    lining: ToonMaterials.Interior(PALETTE.interiorWall),
    trim: ToonMaterials.Get(PALETTE.storeTrim),
    frame: ToonMaterials.Get(PALETTE.frameDark),
  };
  BuildWalls(parent, materials);
  BuildGlazing(parent, materials);
  BuildRoof(parent, materials);
  BuildCanopy(parent, materials);
  BuildWindowPosters(parent);
  return BuildSignBands(parent, materials);
}

function BuildWalls(parent, { wall, lining, trim }) {
  const { minX, maxX, minZ, maxZ, wall: thickness, roofY, windowY, frontWindows, eastWindows } = STORE;
  const base = 0.15;
  // North and west walls are solid.
  AddBoxFromBounds(parent, wall, minX, base, minZ, maxX, roofY, minZ + thickness, { castShadow: true });
  AddBoxFromBounds(parent, wall, minX, base, minZ, minX + thickness, roofY, maxZ, { castShadow: true });
  AddBoxFromBounds(parent, lining, minX + thickness, STORE.floorY, minZ + thickness, maxX - thickness, STORE.ceilingY, minZ + thickness + LINING);
  AddBoxFromBounds(parent, lining, minX + thickness, STORE.floorY, minZ + thickness, minX + thickness + LINING, STORE.ceilingY, maxZ - thickness);

  // Front facade: kick plate, header, end pillars.
  const frontZ0 = maxZ - thickness;
  AddBoxFromBounds(parent, trim, minX, base, frontZ0, frontWindows.maxX, windowY.min, maxZ);
  AddBoxFromBounds(parent, wall, minX, windowY.max, frontZ0, maxX, roofY, maxZ);
  AddBoxFromBounds(parent, wall, minX, base, frontZ0, frontWindows.minX, windowY.max, maxZ);
  AddBoxFromBounds(parent, wall, STORE.doorFixedPanels[1].maxX, base, frontZ0, maxX, windowY.max, maxZ);
  AddBoxFromBounds(parent, lining, minX + thickness, windowY.max, frontZ0 - LINING, maxX - thickness, STORE.ceilingY, frontZ0);

  // East facade: solid back-room section, kick plate, header, corner post.
  const eastX0 = maxX - thickness;
  AddBoxFromBounds(parent, wall, eastX0, base, minZ, maxX, roofY, eastWindows.minZ, { castShadow: true });
  AddBoxFromBounds(parent, trim, eastX0, base, eastWindows.minZ, maxX, windowY.min, eastWindows.maxZ);
  AddBoxFromBounds(parent, wall, eastX0, windowY.max, eastWindows.minZ, maxX, roofY, maxZ);
  AddBoxFromBounds(parent, wall, eastX0, base, eastWindows.maxZ, maxX, windowY.max, maxZ);
  AddBoxFromBounds(parent, lining, eastX0 - LINING, STORE.floorY, minZ + thickness, eastX0, STORE.ceilingY, eastWindows.minZ);
  AddBoxFromBounds(parent, lining, eastX0 - LINING, windowY.max, eastWindows.minZ, eastX0, STORE.ceilingY, maxZ - thickness);

  // Floor slab edge visible under the glazing.
  AddBoxFromBounds(parent, trim, minX, base, minZ, maxX, STORE.floorY - 0.002, maxZ);
}

/** Aluminium mullions + one rain-glass sheet per facade. */
function BuildGlazing(parent, { frame }) {
  const { maxX, maxZ, windowY, frontWindows, eastWindows } = STORE;
  const height = windowY.max - windowY.min;

  const frontStops = DividePanes(frontWindows.minX, frontWindows.maxX, 3);
  for (const x of frontStops) AddBoxFromBounds(parent, frame, x - FRAME / 2, windowY.min, maxZ - 0.08, x + FRAME / 2, windowY.max, maxZ + 0.03);
  for (const y of [windowY.min, windowY.max - FRAME]) {
    AddBoxFromBounds(parent, frame, frontWindows.minX, y, maxZ - 0.08, frontWindows.maxX, y + FRAME, maxZ + 0.03);
  }
  const frontWidth = frontWindows.maxX - frontWindows.minX;
  const frontGlass = AddPlane(parent, CreateRainGlassMaterial({ width: frontWidth, height, seed: 1.7 }), frontWidth, height,
    [(frontWindows.minX + frontWindows.maxX) / 2, windowY.min + height / 2, maxZ - 0.02], { layer: LAYERS.FX });
  frontGlass.renderOrder = 4;

  const eastStops = DividePanes(eastWindows.minZ, eastWindows.maxZ, 3);
  for (const z of eastStops) AddBoxFromBounds(parent, frame, maxX - 0.08, windowY.min, z - FRAME / 2, maxX + 0.03, windowY.max, z + FRAME / 2);
  for (const y of [windowY.min, windowY.max - FRAME]) {
    AddBoxFromBounds(parent, frame, maxX - 0.08, y, eastWindows.minZ, maxX + 0.03, y + FRAME, eastWindows.maxZ);
  }
  const eastWidth = eastWindows.maxZ - eastWindows.minZ;
  const eastGlass = AddPlane(parent, CreateRainGlassMaterial({ width: eastWidth, height, seed: 5.3 }), eastWidth, height,
    [maxX - 0.02, windowY.min + height / 2, (eastWindows.minZ + eastWindows.maxZ) / 2], { layer: LAYERS.FX, rotation: [0, Math.PI / 2, 0] });
  eastGlass.renderOrder = 4;
}

/** Evenly spaced mullion positions including both ends. */
function DividePanes(start, end, count) {
  return Array.from({ length: count + 1 }, (_, index) => start + ((end - start) * index) / count);
}

function BuildRoof(parent, { wall, trim, lining }) {
  const { minX, maxX, minZ, maxZ, roofY, parapetY, ceilingY, wall: thickness } = STORE;
  const membrane = ToonMaterials.Get('#ffffff', { map: CreateRoofTexture(maxX - minX, (maxZ - minZ) / 1.2) });
  AddBoxFromBounds(parent, membrane, minX, ceilingY, minZ, maxX, roofY, maxZ, { castShadow: true });
  BuildRoofFixtures(parent);
  const ceiling = AddPlane(parent, lining, maxX - minX - thickness * 2, maxZ - minZ - thickness * 2,
    [(minX + maxX) / 2, ceilingY - 0.002, (minZ + maxZ) / 2], { rotation: [Math.PI / 2, 0, 0] });
  ceiling.receiveShadow = false;

  const parapet = 0.12;
  AddBoxFromBounds(parent, wall, minX, roofY, minZ, maxX, parapetY, minZ + parapet);
  AddBoxFromBounds(parent, wall, minX, roofY, maxZ - parapet, maxX, parapetY, maxZ);
  AddBoxFromBounds(parent, wall, minX, roofY, minZ, minX + parapet, parapetY, maxZ);
  AddBoxFromBounds(parent, wall, maxX - parapet, roofY, minZ, maxX, parapetY, maxZ);
  for (const [x0, z0, x1, z1] of [[minX, minZ, maxX, minZ + parapet], [minX, minZ, minX + parapet, maxZ]]) {
    AddBoxFromBounds(parent, trim, x0 - 0.02, parapetY, z0 - 0.02, x1 + 0.02, parapetY + 0.04, z1 + 0.02);
  }
}

/** Roof hatch, vent stacks and the refrigerant duct feeding the rooftop AC units. */
function BuildRoofFixtures(parent) {
  const { roofY } = STORE;
  const metal = ToonMaterials.Get('#aab1bc');
  const dark = ToonMaterials.Get('#3f4552');
  AddBoxFromBounds(parent, metal, 0.6, roofY, -5.2, 1.5, roofY + 0.2, -4.3, { castShadow: true });
  AddBoxFromBounds(parent, dark, 0.66, roofY + 0.2, -5.14, 1.44, roofY + 0.24, -4.36);
  for (const [x, z, height] of [[-1.0, -2.2, 0.55], [0.2, -1.4, 0.4], [1.8, -2.8, 0.5]]) {
    AddCylinder(parent, metal, 0.07, 0.07, height, [x, roofY, z], { segments: 10, castShadow: true });
    AddCylinder(parent, dark, 0.11, 0.11, 0.06, [x, roofY + height, z], { segments: 10 });
  }
  AddBoxFromBounds(parent, ToonMaterials.Get('#d9d2bf'), -5.0, roofY, -5.75, -1.9, roofY + 0.14, -5.55);
  AddBoxFromBounds(parent, ToonMaterials.Get('#d9d2bf'), -2.05, roofY, -5.75, -1.9, roofY + 0.14, -6.2);
}

/** Wrap-around canopy with brand-striped fascia and warm downlights. */
function BuildCanopy(parent, { wall, frame }) {
  const { bottomY, thickness, front, east } = STORE.canopy;
  const topY = bottomY + thickness;
  const soffit = ToonMaterials.Get('#d8d6cf');
  AddBoxFromBounds(parent, soffit, front.minX, bottomY, front.minZ, front.maxX, topY, front.maxZ, { castShadow: true });
  AddBoxFromBounds(parent, soffit, east.minX, bottomY, east.minZ, east.maxX, topY, east.maxZ, { castShadow: true });

  const mint = ToonMaterials.Get(PALETTE.storeMint, { selfLit: 0.35 });
  const orange = ToonMaterials.Get(PALETTE.storeOrange, { selfLit: 0.35 });
  const lip = 0.03;
  AddBoxFromBounds(parent, wall, front.minX, bottomY - 0.04, front.maxZ, east.maxX + lip, topY + 0.02, front.maxZ + lip);
  AddBoxFromBounds(parent, mint, front.minX, bottomY + 0.08, front.maxZ + lip, east.maxX + lip * 2, bottomY + 0.13, front.maxZ + lip * 2);
  AddBoxFromBounds(parent, orange, front.minX, bottomY + 0.02, front.maxZ + lip, east.maxX + lip * 2, bottomY + 0.06, front.maxZ + lip * 2);
  AddBoxFromBounds(parent, wall, east.maxX, bottomY - 0.04, east.minZ, east.maxX + lip, topY + 0.02, front.maxZ + lip);
  AddBoxFromBounds(parent, mint, east.maxX + lip, bottomY + 0.08, east.minZ, east.maxX + lip * 2, bottomY + 0.13, front.maxZ + lip);
  AddBoxFromBounds(parent, orange, east.maxX + lip, bottomY + 0.02, east.minZ, east.maxX + lip * 2, bottomY + 0.06, front.maxZ + lip);
  // Rain gutter along the outer edge.
  AddBoxFromBounds(parent, frame, front.minX, topY - 0.02, front.maxZ - 0.08, east.maxX, topY + 0.05, front.maxZ);

  const downlight = ToonMaterials.Glow('#fff1d6', 3.2);
  const disc = new THREE.CircleGeometry(0.11, 20);
  const spots = [[-5.6, 1.7], [-3.6, 1.7], [-1.6, 1.7], [0.65, 1.7], [2.2, 1.7], [3.08, -3.4], [3.08, -1.6], [3.08, 0.1]];
  for (const [x, z] of spots) AddMesh(parent, disc, downlight, [x, bottomY - 0.003, z], { rotation: [Math.PI / 2, 0, 0] });
}

/** Seasonal posters taped inside the glass, facing the street. */
function BuildWindowPosters(parent) {
  const { maxX, maxZ, windowY, frontWindows } = STORE;
  const posterZ = maxZ - 0.045;
  const posters = [
    { kind: 'oden', x: frontWindows.minX + 0.42, y: windowY.max - 0.48, size: [0.5, 0.7] },
    { kind: 'karaage', x: frontWindows.minX + 1.02, y: windowY.max - 0.42, size: [0.42, 0.59] },
    { kind: 'umbrella', x: frontWindows.maxX - 0.42, y: windowY.min + 0.42, size: [0.42, 0.59] },
    { kind: 'sweets', x: frontWindows.minX + 2.25, y: windowY.max - 0.4, size: [0.38, 0.53] },
  ];
  for (const poster of posters) {
    const material = ToonMaterials.Get('#ffffff', { map: CreatePosterTexture(poster.kind), selfLit: 0.5 });
    AddPlane(parent, material, poster.size[0], poster.size[1], [poster.x, poster.y, posterZ]);
  }
  const coffee = ToonMaterials.Get('#ffffff', { map: CreatePosterTexture('coffee'), selfLit: 0.5 });
  AddPlane(parent, coffee, 0.42, 0.59, [maxX - 0.045, windowY.max - 0.42, STORE.eastWindows.maxZ - 0.45], { rotation: [0, Math.PI / 2, 0] });
}

/** Internally lit fascia signs on both street faces (gently humming). */
function BuildSignBands(parent, { wall }) {
  const { minX, maxX, minZ, maxZ, signBand } = STORE;
  const bandHeight = signBand.maxY - signBand.minY;
  AddBoxFromBounds(parent, wall, minX, signBand.minY, maxZ, maxX + SIGN_DEPTH, signBand.maxY, maxZ + SIGN_DEPTH);
  AddBoxFromBounds(parent, wall, maxX, signBand.minY, minZ, maxX + SIGN_DEPTH, signBand.maxY, maxZ);

  const frontWidth = maxX + SIGN_DEPTH - minX;
  const eastWidth = maxZ + SIGN_DEPTH - minZ;
  const frontSign = ToonMaterials.CreateGlow('#ffffff', 0.86, { map: CreateStoreSignTexture(frontWidth, bandHeight) });
  const eastSign = ToonMaterials.CreateGlow('#ffffff', 0.86, { map: CreateStoreSignTexture(eastWidth, bandHeight) });
  const centerY = (signBand.minY + signBand.maxY) / 2;
  AddPlane(parent, frontSign, frontWidth - 0.04, bandHeight - 0.06, [(minX + maxX + SIGN_DEPTH) / 2, centerY, maxZ + SIGN_DEPTH + 0.004]);
  AddPlane(parent, eastSign, eastWidth - 0.04, bandHeight - 0.06, [maxX + SIGN_DEPTH + 0.004, centerY, (minZ + maxZ + SIGN_DEPTH) / 2], {
    rotation: [0, Math.PI / 2, 0],
  });

  const signs = [frontSign, eastSign];
  return {
    Update(elapsed) {
      signs.forEach((material, index) => {
        material.color.copy(material.userData.baseColor).multiplyScalar(material.userData.baseIntensity * HumValue(elapsed, index * 2.3));
      });
    },
  };
}
