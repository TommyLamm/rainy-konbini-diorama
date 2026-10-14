import * as THREE from 'three';
import { BASE, LAYERS, LAYOUT, LEVELS, PALETTE } from '../config/SceneConfig.js';
import { ToonMaterials } from '../materials/ToonMaterials.js';
import { CreateWetSurfaceMaterial } from '../materials/WetSurfaceMaterial.js';
import { CreateDrainGrateMaterial } from '../materials/WaterFlowMaterial.js';
import { CreateLotTexture, CreatePaverTileTexture, CreateRoadTextures, CreateWetMaskTexture } from '../textures/GroundTextures.js';
import { AddBox, AddBoxFromBounds, AddMesh, ApplyPlanarUV, CreateRoundedRectShape } from '../utils/MeshKit.js';

const BASE_BOUNDS = Object.freeze({ minX: -BASE.HALF, maxX: BASE.HALF, minZ: -BASE.HALF, maxZ: BASE.HALF });
/** Wet overlays float just above their surface; polygon offset does the rest. */
const OVERLAY_LIFT = 0.006;
const ROAD_GRATES = Object.freeze([
  { x: -9.2, z: 6.18, alongX: true },
  { x: -3.4, z: 6.18, alongX: true },
  { x: 2.3, z: 6.18, alongX: true },
  { x: 7.78, z: -3.6, alongX: false },
]);

/**
 * Builds roads, raised pavements (whose extruded sides form the curbs), drains
 * and the wet reflective overlays.
 * @param {THREE.Object3D} parent
 * @param {import('../rendering/PlanarReflection.js').PlanarReflection} reflection
 */
export function BuildGround(parent, reflection) {
  const wetMaterial = CreateWetSurfaceMaterial(reflection, CreateWetMaskTexture());
  const curbMaterial = ToonMaterials.Get(PALETTE.curb);

  const roadTextures = CreateRoadTextures();
  const roadGeometry = new THREE.PlaneGeometry(BASE.SIZE, BASE.SIZE).rotateX(-Math.PI / 2);
  ApplyPlanarUV(roadGeometry, BASE_BOUNDS);
  const roadMaterial = ToonMaterials.Get('#ffffff', {
    map: roadTextures.map,
    emissiveMap: roadTextures.emissiveMap,
    emissive: '#9db3d8',
    emissiveIntensity: 0.16,
  });
  AddMesh(parent, roadGeometry, roadMaterial, [0, LEVELS.ROAD, 0], { receiveShadow: true });
  AddWetOverlay(parent, roadGeometry, wetMaterial, LEVELS.ROAD);

  const lotShape = CreateRoundedRectShape(LAYOUT.LOT, [{ corner: 'SE', radius: LAYOUT.LOT.cornerRadius }]);
  BuildSlab(parent, lotShape, LAYOUT.LOT, ToonMaterials.Get('#ffffff', { map: CreateLotTexture() }), curbMaterial, wetMaterial);

  const south = LAYOUT.FAR_SOUTH;
  const southTiles = CreatePaverTileTexture((south.maxX - south.minX) / 2.52, (south.maxZ - south.minZ) / 1.26);
  BuildSlab(parent, CreateRoundedRectShape(south), south, ToonMaterials.Get('#ffffff', { map: southTiles }), curbMaterial, wetMaterial);

  const east = LAYOUT.FAR_EAST;
  const eastTiles = CreatePaverTileTexture((east.maxX - east.minX) / 2.52, (east.maxZ - east.minZ) / 1.26);
  const eastShape = CreateRoundedRectShape(east, [{ corner: 'SW', radius: east.cornerRadius }]);
  BuildSlab(parent, eastShape, east, ToonMaterials.Get('#ffffff', { map: eastTiles }), curbMaterial, wetMaterial);

  BuildDrains(parent);
  BuildWheelStops(parent);
}

/**
 * Extrudes a raised pavement slab; caps get the painted texture, sides the curb.
 */
function BuildSlab(parent, shape, bounds, topMaterial, curbMaterial, wetMaterial) {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: LEVELS.CURB, bevelEnabled: false, curveSegments: 20 }).rotateX(-Math.PI / 2);
  ApplyPlanarUV(geometry, bounds);
  AddMesh(parent, geometry, [topMaterial, curbMaterial], [0, 0, 0], { receiveShadow: true });

  const topGeometry = new THREE.ShapeGeometry(shape, 20).rotateX(-Math.PI / 2);
  AddWetOverlay(parent, topGeometry, wetMaterial, LEVELS.CURB);
}

function AddWetOverlay(parent, geometry, material, surfaceY) {
  const overlay = AddMesh(parent, geometry, material, [0, surfaceY + OVERLAY_LIFT, 0], { layer: LAYERS.FX, receiveShadow: false });
  overlay.renderOrder = 2;
  return overlay;
}

/** Storm-drain grates at the kerb and the grated channel along the alley wall. */
function BuildDrains(parent) {
  const grateMaterial = CreateDrainGrateMaterial({ length: 0.62, width: 0.3, speed: 0.25 });
  const plane = new THREE.PlaneGeometry(0.62, 0.3).rotateX(-Math.PI / 2);
  const frame = ToonMaterials.Get('#4a4f59');
  for (const grate of ROAD_GRATES) {
    const rotationY = grate.alongX ? 0 : Math.PI / 2;
    const footprint = grate.alongX ? [0.7, 0.012, 0.36] : [0.36, 0.012, 0.7];
    AddBox(parent, frame, footprint, [grate.x, LEVELS.ROAD, grate.z]);
    AddMesh(parent, plane, grateMaterial, [grate.x, LEVELS.ROAD + 0.013, grate.z], { rotation: [0, rotationY, 0], layer: LAYERS.FX });
  }

  const alley = { minX: -7.02, maxX: -6.68, minZ: -6.2, maxZ: 3.9 };
  const length = alley.maxZ - alley.minZ;
  const width = alley.maxX - alley.minX;
  const channel = new THREE.PlaneGeometry(length, width).rotateX(-Math.PI / 2).rotateY(-Math.PI / 2);
  const channelMaterial = CreateDrainGrateMaterial({ length, width, speed: 0.9 });
  AddMesh(parent, channel, channelMaterial, [(alley.minX + alley.maxX) / 2, LEVELS.CURB + 0.004, (alley.minZ + alley.maxZ) / 2], { layer: LAYERS.FX });
  const lip = ToonMaterials.Get('#9a9da4');
  AddBoxFromBounds(parent, lip, alley.minX - 0.06, LEVELS.CURB, alley.minZ, alley.minX, LEVELS.CURB + 0.02, alley.maxZ);
  AddBoxFromBounds(parent, lip, alley.maxX, LEVELS.CURB, alley.minZ, alley.maxX + 0.04, LEVELS.CURB + 0.02, alley.maxZ);
}

/** Concrete wheel stops in each parking bay. */
function BuildWheelStops(parent) {
  const concrete = ToonMaterials.Get('#b9bcc2');
  const stripe = ToonMaterials.Get('#e3b53c');
  const { slots, minX } = LAYOUT.PARKING;
  for (let i = 0; i < slots.length - 1; i++) {
    const z = (slots[i] + slots[i + 1]) / 2;
    AddBox(parent, concrete, [0.16, 0.1, 1.5], [minX + 0.55, LEVELS.CURB, z], { castShadow: true });
    AddBox(parent, stripe, [0.165, 0.02, 0.25], [minX + 0.55, LEVELS.CURB + 0.06, z - 0.45]);
    AddBox(parent, stripe, [0.165, 0.02, 0.25], [minX + 0.55, LEVELS.CURB + 0.06, z + 0.45]);
  }
}
