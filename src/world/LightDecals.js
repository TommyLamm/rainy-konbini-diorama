import * as THREE from 'three';
import { LAYERS, LEVELS, LIGHT_COLORS, STORE } from '../config/SceneConfig.js';
import { CreateRadialTexture, CreateWindowSpillTexture } from '../textures/GroundTextures.js';
import { AddMesh } from '../utils/MeshKit.js';
import { LIGHT_RIG } from './Lighting.js';

const DECAL_LIFT = 0.003;
const SPILL_REACH = 3.6;

function CreateDecalMaterial(map, color, intensity) {
  return new THREE.MeshBasicMaterial({
    map,
    color: new THREE.Color(color).multiplyScalar(intensity),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
}

function AddDecal(parent, geometry, material, y) {
  const decal = AddMesh(parent, geometry, material, [0, y, 0], { layer: LAYERS.FX, receiveShadow: false });
  decal.renderOrder = 1;
  return decal;
}

/**
 * Ground plane in front of a facade whose UV.x runs along the facade and
 * UV.y away from it, matching the window spill texture.
 */
function CreateSpillGeometry(alongStart, alongEnd, wallCoord, axis) {
  const length = alongEnd - alongStart;
  const geometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) {
    const u = position.getX(i) + 0.5;
    const v = position.getZ(i) + 0.5;
    const along = alongStart + u * length;
    const away = wallCoord + v * SPILL_REACH;
    if (axis === 'x') position.setXYZ(i, along, 0, away);
    else position.setXYZ(i, away, 0, along);
    uv.setXY(i, u, v);
  }
  geometry.computeBoundingSphere();
  return geometry;
}

/** Normalised pane intervals along a facade for the spill texture. */
function PaneEdges(start, end, panes, facadeStart, facadeLength, mullion = 0.06) {
  const width = (end - start) / panes;
  return Array.from({ length: panes }, (_, index) => [
    (start + index * width + mullion - facadeStart) / facadeLength,
    (start + (index + 1) * width - mullion - facadeStart) / facadeLength,
  ]);
}

/**
 * Additive light pools: window spill, canopy downlights, vending glow, doorway.
 * @param {THREE.Object3D} parent
 * @param {{OpenAmount: number}} door
 * @returns {{Update: () => void}}
 */
export function BuildLightDecals(parent, door) {
  const groundY = LEVELS.CURB + DECAL_LIFT;
  const radial = CreateRadialTexture();

  const frontLength = STORE.maxX - STORE.minX;
  const frontEdges = [
    ...PaneEdges(STORE.frontWindows.minX, STORE.frontWindows.maxX, 3, STORE.minX, frontLength),
    ...PaneEdges(STORE.doorFixedPanels[0].minX, STORE.doorFixedPanels[1].maxX, 3, STORE.minX, frontLength),
  ];
  const frontSpill = CreateDecalMaterial(CreateWindowSpillTexture(frontEdges), LIGHT_COLORS.interior, 0.42);
  AddDecal(parent, CreateSpillGeometry(STORE.minX, STORE.maxX, STORE.maxZ, 'x'), frontSpill, groundY);

  const eastLength = STORE.maxZ - STORE.minZ;
  const eastEdges = PaneEdges(STORE.eastWindows.minZ, STORE.eastWindows.maxZ, 3, STORE.minZ, eastLength);
  const eastSpill = CreateDecalMaterial(CreateWindowSpillTexture(eastEdges), LIGHT_COLORS.interior, 0.38);
  AddDecal(parent, CreateSpillGeometry(STORE.minZ, STORE.maxZ, STORE.maxX, 'z'), eastSpill, groundY);

  const pool = new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2);
  const canopyPool = CreateDecalMaterial(radial, LIGHT_COLORS.canopy, 0.32);
  for (const spec of LIGHT_RIG.canopy) {
    const decal = AddDecal(parent, pool, canopyPool, groundY);
    decal.position.x = spec.position[0];
    decal.position.z = spec.position[2];
    decal.scale.setScalar(1.7);
  }
  const vending = AddDecal(parent, pool, CreateDecalMaterial(radial, LIGHT_COLORS.vending, 0.55), groundY);
  vending.position.set(LIGHT_RIG.vending.position[0], groundY, LIGHT_RIG.vending.position[2] - 0.1);
  vending.scale.set(1.5, 1, 1.0);

  const doorwayMaterial = CreateDecalMaterial(radial, LIGHT_COLORS.interior, 0.2);
  const doorway = AddDecal(parent, pool, doorwayMaterial, groundY + 0.001);
  doorway.position.set((STORE.door.minX + STORE.door.maxX) / 2, groundY + 0.001, STORE.maxZ + 0.6);
  doorway.scale.set(1.3, 1, 1.0);
  const doorwayBase = doorwayMaterial.color.clone();

  return {
    Update() {
      doorwayMaterial.color.copy(doorwayBase).multiplyScalar(1 + door.OpenAmount * 2.4);
    },
  };
}
