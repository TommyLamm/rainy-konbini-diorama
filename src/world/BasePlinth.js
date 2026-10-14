import * as THREE from 'three';
import { BASE, LAYOUT, PALETTE } from '../config/SceneConfig.js';
import { ToonMaterials } from '../materials/ToonMaterials.js';
import { CreateNameplateTexture } from '../textures/StreetSignTextures.js';
import { AddBox, AddMesh, AddPlane } from '../utils/MeshKit.js';

/** Soil cross-section bands (top to bottom) shown on the diorama's cut faces. */
const STRATA = Object.freeze([
  { top: -0.004, bottom: -0.16, color: '#2c313c' },
  { top: -0.16, bottom: -0.46, color: PALETTE.gravel },
  { top: -0.46, bottom: -BASE.GROUND_DEPTH, color: PALETTE.soil },
]);

/**
 * Display plinth: layered ground block on a walnut stand with a brass plaque.
 * @param {THREE.Object3D} parent
 */
export function BuildBasePlinth(parent) {
  const size = BASE.SIZE;
  // Cut faces are never reached by scene lights, so they carry their own fill.
  for (const layer of STRATA) {
    AddBox(parent, ToonMaterials.Get(layer.color, { selfLit: 0.32 }), [size, layer.top - layer.bottom, size], [0, layer.bottom, 0]);
  }
  AddSewerPipeSections(parent);

  const plinthHalf = BASE.HALF + BASE.PLINTH_MARGIN;
  const plinthTop = -BASE.GROUND_DEPTH;
  const wood = ToonMaterials.Get(PALETTE.plinthWood, { selfLit: 0.35 });
  AddBox(parent, wood, [plinthHalf * 2, BASE.PLINTH_HEIGHT, plinthHalf * 2], [0, plinthTop - BASE.PLINTH_HEIGHT, 0]);
  // Trim band sits just below the plinth top so no faces are coplanar (z-fighting).
  AddBox(parent, ToonMaterials.Get(PALETTE.plinthTrim, { selfLit: 0.4 }), [plinthHalf * 2 + 0.12, 0.07, plinthHalf * 2 + 0.12], [0, plinthTop - 0.1, 0]);
  AddBox(parent, ToonMaterials.Get('#241914', { selfLit: 0.2 }), [plinthHalf * 2 - 0.5, 0.14, plinthHalf * 2 - 0.5], [0, plinthTop - BASE.PLINTH_HEIGHT - 0.14, 0]);

  const plaque = ToonMaterials.Get('#ffffff', { map: CreateNameplateTexture(), selfLit: 0.25 });
  AddPlane(parent, plaque, 7.2, 0.9, [0, plinthTop - BASE.PLINTH_HEIGHT * 0.52, plinthHalf + 0.012]);
}

/** Round sewer pipe cut by the base edge where road A leaves the model. */
function AddSewerPipeSections(parent) {
  const pipeZ = (LAYOUT.ROAD_A.minZ + LAYOUT.ROAD_A.maxZ) / 2;
  const ring = new THREE.RingGeometry(0.17, 0.25, 24);
  const hole = new THREE.CircleGeometry(0.17, 24);
  const ringMaterial = ToonMaterials.Get('#9b968c', { selfLit: 0.12 });
  const holeMaterial = ToonMaterials.Get('#121419');
  for (const side of [-1, 1]) {
    const x = side * (BASE.HALF + 0.004);
    const rotation = [0, side * Math.PI * 0.5, 0];
    AddMesh(parent, ring, ringMaterial, [x, -0.62, pipeZ], { rotation });
    AddMesh(parent, hole, holeMaterial, [x + side * 0.002, -0.62, pipeZ], { rotation });
  }
}
