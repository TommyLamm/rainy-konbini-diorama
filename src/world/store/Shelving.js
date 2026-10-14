import * as THREE from 'three';
import { LAYERS, PALETTE, STORE } from '../../config/SceneConfig.js';
import { ToonMaterials } from '../../materials/ToonMaterials.js';
import { CreateLabelTexture, CreateMagazineAtlas } from '../../textures/StoreSignTextures.js';
import { AddBoxFromBounds, AddMesh, AddPlane } from '../../utils/MeshKit.js';
import { ASSORTMENTS, StockShelf } from './ProductKit.js';

const FLOOR = STORE.floorY;
const GONDOLA = Object.freeze({ HALF_WIDTH: 0.38, HEIGHT: 1.45, LEVELS: [0.12, 0.44, 0.76, 1.08], SHELF_GAP: 0.3 });

function Materials() {
  return {
    metal: ToonMaterials.Interior(PALETTE.shelfMetal),
    white: ToonMaterials.Interior('#fbfbf8'),
    dark: ToonMaterials.Interior('#3a404c'),
    rail: ToonMaterials.Interior('#ffffff'),
    tag: ToonMaterials.Interior(PALETTE.storeOrange),
    glass: new THREE.MeshBasicMaterial({ color: '#cfe6ff', transparent: true, opacity: 0.12, depthWrite: false }),
  };
}

/**
 * @param {THREE.Object3D} parent
 * @param {import('./ProductKit.js').ProductBatcher} batcher
 * @param {import('../../utils/Random.js').Random} random
 */
export function BuildShelving(parent, batcher, random) {
  const materials = Materials();
  BuildGondola(parent, batcher, random, materials, { x: -4.3, z0: -4.6, z1: -1.5, east: ASSORTMENTS.snacks, west: ASSORTMENTS.snacks });
  BuildGondola(parent, batcher, random, materials, { x: -2.3, z0: -4.6, z1: -1.5, east: ASSORTMENTS.noodles, west: ASSORTMENTS.daily });
  BuildDrinkCooler(parent, batcher, random, materials, { minX: -6.4, maxX: -2.45, doors: 4 });
  BuildOpenChiller(parent, batcher, random, materials, { minZ: -5.3, maxZ: -0.9 });
  BuildIceFreezer(parent, batcher, random, materials, { minX: -1.0, maxX: 0.4, minZ: -2.7, maxZ: -1.95 });
  BuildMagazineRack(parent, materials, { minX: -4.7, maxX: -1.25 });
}

/** Double-sided island shelf running along Z, with a promo end cap facing the windows. */
function BuildGondola(parent, batcher, random, materials, spec) {
  const { HALF_WIDTH: half, HEIGHT: height, LEVELS, SHELF_GAP } = GONDOLA;
  const { x, z0, z1 } = spec;
  AddBoxFromBounds(parent, materials.metal, x - 0.04, FLOOR, z0, x + 0.04, FLOOR + height, z1);
  AddBoxFromBounds(parent, materials.dark, x - half, FLOOR, z0, x + half, FLOOR + 0.1, z1);
  for (const side of [-1, 1]) {
    const assortment = side > 0 ? spec.east : spec.west;
    for (const level of LEVELS) {
      const y = FLOOR + level;
      const inner = x + side * 0.04;
      const outer = x + side * half;
      AddBoxFromBounds(parent, materials.metal, Math.min(inner, outer), y, z0, Math.max(inner, outer), y + 0.025, z1);
      AddBoxFromBounds(parent, materials.rail, Math.min(outer, outer + side * 0.012), y - 0.035, z0, Math.max(outer, outer + side * 0.012), y + 0.03, z1);
      StockShelf(batcher, random, { from: [outer - side * 0.01, z0], to: [outer - side * 0.01, z1], y: y + 0.025, depth: half - 0.07, maxHeight: SHELF_GAP - 0.04, outward: [side, 0] }, assortment);
    }
  }
  // End cap with a sale POP facing the shop front.
  AddBoxFromBounds(parent, materials.white, x - half, FLOOR, z1, x + half, FLOOR + height, z1 + 0.04);
  for (const level of [0.3, 0.7]) {
    AddBoxFromBounds(parent, materials.metal, x - half, FLOOR + level, z1 + 0.04, x + half, FLOOR + level + 0.025, z1 + 0.3);
    StockShelf(batcher, random, { from: [x - half + 0.02, z1 + 0.3], to: [x + half - 0.02, z1 + 0.3], y: FLOOR + level + 0.025, depth: 0.22, maxHeight: 0.3, outward: [0, 1] }, ASSORTMENTS.snacks);
  }
  const pop = ToonMaterials.Interior('#ffffff', { map: CreateLabelTexture('特売', { background: PALETTE.storeCoral, width: 256, height: 128 }) });
  AddPlane(parent, pop, 0.5, 0.25, [x, FLOOR + height - 0.25, z1 + 0.045]);
}

/** Glass-door reach-in cooler along the north wall, lit from inside. */
function BuildDrinkCooler(parent, batcher, random, materials, spec) {
  const { minX, maxX, doors } = spec;
  const back = STORE.minZ + STORE.wall + 0.04;
  const front = back + 0.7;
  const top = 2.36;
  AddBoxFromBounds(parent, materials.white, minX, FLOOR, back, maxX, FLOOR + 0.2, front);
  AddBoxFromBounds(parent, materials.white, minX, top - 0.26, back, maxX, top, front);
  AddBoxFromBounds(parent, materials.white, minX, FLOOR, back, minX + 0.05, top, front);
  AddBoxFromBounds(parent, materials.white, maxX - 0.05, FLOOR, back, maxX, top, front);
  AddPlane(parent, ToonMaterials.Glow('#eef6ff', 1.35), maxX - minX - 0.1, top - 0.26 - FLOOR - 0.2, [(minX + maxX) / 2, (FLOOR + 0.2 + top - 0.26) / 2, back + 0.01]);

  const header = ToonMaterials.Interior('#ffffff', { map: CreateLabelTexture('つめた~い  DRINK', { background: '#2f6fe0', width: 1024, height: 96 }) });
  AddPlane(parent, header, maxX - minX - 0.1, 0.2, [(minX + maxX) / 2, top - 0.13, front + 0.003]);

  const levels = [0.42, 0.76, 1.1, 1.44, 1.76];
  for (const level of levels) {
    AddBoxFromBounds(parent, materials.metal, minX + 0.05, FLOOR + level - 0.02, back + 0.02, maxX - 0.05, FLOOR + level, front - 0.06);
    StockShelf(batcher, random, { from: [minX + 0.07, front - 0.08], to: [maxX - 0.07, front - 0.08], y: FLOOR + level, depth: 0.12, maxHeight: 0.28, outward: [0, 1] }, ASSORTMENTS.drinks);
  }

  const doorWidth = (maxX - minX) / doors;
  const ledStrip = ToonMaterials.Glow('#ffffff', 2.2);
  for (let i = 0; i <= doors; i++) {
    const x = minX + i * doorWidth;
    AddBoxFromBounds(parent, materials.dark, x - 0.03, FLOOR + 0.2, front - 0.02, x + 0.03, top - 0.26, front + 0.02);
    AddBoxFromBounds(parent, ledStrip, x - 0.012, FLOOR + 0.25, front - 0.035, x + 0.012, top - 0.3, front - 0.02);
    if (i < doors) {
      AddBoxFromBounds(parent, ToonMaterials.Interior('#c9cfd8'), x + doorWidth - 0.12, 0.95, front + 0.02, x + doorWidth - 0.1, 1.55, front + 0.05);
      const glass = AddPlane(parent, materials.glass, doorWidth - 0.06, top - 0.26 - FLOOR - 0.2, [x + doorWidth / 2, (FLOOR + 0.2 + top - 0.26) / 2, front], { layer: LAYERS.FX });
      glass.renderOrder = 3;
    }
  }
}

/** Multi-deck open chiller on the west wall: bento, onigiri, sandwiches. */
function BuildOpenChiller(parent, batcher, random, materials, spec) {
  const { minZ, maxZ } = spec;
  const wallX = STORE.minX + STORE.wall + 0.035;
  const decks = [
    { y: 0.5, depth: 0.66, assortment: ASSORTMENTS.bento },
    { y: 0.86, depth: 0.52, assortment: ASSORTMENTS.onigiri },
    { y: 1.18, depth: 0.44, assortment: ASSORTMENTS.sandwiches },
    { y: 1.48, depth: 0.36, assortment: ASSORTMENTS.onigiri },
  ];
  const frontX = wallX + 0.72;
  AddBoxFromBounds(parent, materials.dark, wallX, FLOOR, minZ, frontX, FLOOR + 0.28, maxZ);
  AddBoxFromBounds(parent, materials.white, wallX, FLOOR, minZ, wallX + 0.08, 2.1, maxZ);
  AddBoxFromBounds(parent, materials.white, wallX, 1.82, minZ, wallX + 0.55, 2.1, maxZ);
  AddBoxFromBounds(parent, materials.white, wallX, FLOOR, minZ - 0.05, frontX, 2.1, minZ);
  AddBoxFromBounds(parent, materials.white, wallX, FLOOR, maxZ, frontX, 2.1, maxZ + 0.05);
  const header = ToonMaterials.Interior('#ffffff', { map: CreateLabelTexture('お弁当・おにぎり', { background: PALETTE.storeOrange, width: 1024, height: 128 }) });
  AddPlane(parent, header, maxZ - minZ - 0.1, 0.24, [wallX + 0.553, 1.96, (minZ + maxZ) / 2], { rotation: [0, Math.PI / 2, 0] });

  const strip = ToonMaterials.Glow('#fff6e8', 2.4);
  for (const deck of decks) {
    const y = FLOOR + deck.y;
    const edge = wallX + 0.08 + deck.depth;
    AddBoxFromBounds(parent, materials.metal, wallX + 0.08, y - 0.025, minZ, edge, y, maxZ);
    AddBoxFromBounds(parent, materials.rail, edge, y - 0.05, minZ, edge + 0.012, y + 0.02, maxZ);
    AddBoxFromBounds(parent, strip, wallX + 0.1, y - 0.04, minZ + 0.02, wallX + 0.16, y - 0.025, maxZ - 0.02);
    StockShelf(batcher, random, { from: [edge - 0.01, minZ + 0.03], to: [edge - 0.01, maxZ - 0.03], y, depth: deck.depth - 0.1, maxHeight: 0.24, outward: [1, 0] }, deck.assortment);
  }
}

/** Ice-cream chest freezer with glass lids. */
function BuildIceFreezer(parent, batcher, random, materials, spec) {
  const { minX, maxX, minZ, maxZ } = spec;
  const bodyTop = FLOOR + 0.62;
  const rimTop = FLOOR + 0.74;
  AddBoxFromBounds(parent, materials.white, minX, FLOOR, minZ, maxX, bodyTop, maxZ);
  AddPlane(parent, ToonMaterials.Glow('#e6f3ff', 1.1), maxX - minX - 0.1, maxZ - minZ - 0.1, [(minX + maxX) / 2, bodyTop + 0.002, (minZ + maxZ) / 2], { rotation: [-Math.PI / 2, 0, 0] });
  for (const [x0, z0, x1, z1] of [[minX, minZ, maxX, minZ + 0.05], [minX, maxZ - 0.05, maxX, maxZ], [minX, minZ, minX + 0.05, maxZ], [maxX - 0.05, minZ, maxX, maxZ]]) {
    AddBoxFromBounds(parent, materials.white, x0, bodyTop, z0, x1, rimTop, z1);
  }
  const iceColors = ['#ff7fb3', '#5ed1ff', '#ffcf3f', '#ffffff', '#8b5a2b', '#7ed957', '#b15dff'];
  for (let x = minX + 0.1; x < maxX - 0.1; x += 0.13) {
    for (let z = minZ + 0.1; z < maxZ - 0.08; z += 0.17) {
      batcher.Add('box', [x + 0.05, bodyTop, z + 0.06], [0.11, 0.05 + random.Range(0, 0.03), 0.14], random.Pick(iceColors), random.Range(-0.15, 0.15));
    }
  }
  const lid = AddPlane(parent, materials.glass, maxX - minX - 0.1, maxZ - minZ - 0.1, [(minX + maxX) / 2, rimTop - 0.01, (minZ + maxZ) / 2], { rotation: [-Math.PI / 2, 0, 0], layer: LAYERS.FX });
  lid.renderOrder = 3;
  const label = ToonMaterials.Interior('#ffffff', { map: CreateLabelTexture('ICE CREAM', { background: '#5ed1ff', width: 512, height: 96 }) });
  AddPlane(parent, label, 0.9, 0.17, [(minX + maxX) / 2, FLOOR + 0.42, maxZ + 0.004]);
}

/** Window-side magazine rack; covers face into the shop (立ち読み side). */
function BuildMagazineRack(parent, materials, spec) {
  const { minX, maxX } = spec;
  const backZ = STORE.maxZ - STORE.wall - 0.08;
  const frontZ = backZ - 0.38;
  AddBoxFromBounds(parent, materials.dark, minX, FLOOR, frontZ, maxX, FLOOR + 0.42, backZ);
  AddBoxFromBounds(parent, materials.white, minX, FLOOR + 0.42, backZ - 0.05, maxX, FLOOR + 0.86, backZ);
  AddBoxFromBounds(parent, materials.metal, minX, FLOOR + 0.42, frontZ + 0.1, maxX, FLOOR + 0.445, backZ - 0.05);

  const atlas = CreateMagazineAtlas();
  const coverMaterial = ToonMaterials.Interior('#ffffff', { map: atlas.texture });
  const coverWidth = 0.21;
  const tiers = [{ y: FLOOR + 0.445, z: backZ - 0.13, tilt: 0.28 }, { y: FLOOR + 0.13, z: frontZ + 0.02, tilt: 0.5 }];
  let cell = 0;
  for (const tier of tiers) {
    for (let x = minX + 0.15; x < maxX - 0.1; x += coverWidth + 0.02) {
      const geometry = new THREE.PlaneGeometry(coverWidth, 0.29).translate(0, 0.145, 0);
      RemapUvToCell(geometry, cell++, atlas.columns, atlas.rows);
      AddMesh(parent, geometry, coverMaterial, [x, tier.y, tier.z], { rotation: [tier.tilt, Math.PI, 0], layer: LAYERS.DETAIL });
    }
  }
}

/** Points a plane's UVs at one cell of a grid atlas (flipY = true layout). */
function RemapUvToCell(geometry, cellIndex, columns, rows) {
  const column = cellIndex % columns;
  const row = Math.floor(cellIndex / columns) % rows;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (column + uv.getX(i)) / columns, 1 - (row + 1 - uv.getY(i)) / rows);
  }
}
