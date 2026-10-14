import * as THREE from 'three';
import { BASE, LAYOUT, LEVELS, STORE } from '../config/SceneConfig.js';

const H = BASE.HALF;

function InRect(rect, x, z) {
  return x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ;
}

/**
 * Height of the walkable surface at (x, z): kerb level on raised pavements, road level elsewhere.
 * @param {number} x
 * @param {number} z
 */
export function GroundHeightAt(x, z) {
  const raised = [LAYOUT.LOT, LAYOUT.FAR_SOUTH, LAYOUT.FAR_EAST].some((rect) => InRect(rect, x, z));
  return raised ? LEVELS.CURB : LEVELS.ROAD;
}

const BOX = (minX, minY, minZ, maxX, maxY, maxZ) => new THREE.Box3(new THREE.Vector3(minX, minY, minZ), new THREE.Vector3(maxX, maxY, maxZ));

/** Everything rain cannot fall through (roofs approximated by boxes). */
export function GetRainColliders() {
  const { front, east, bottomY, thickness } = STORE.canopy;
  return [
    BOX(-H, -1, -H, H, LEVELS.ROAD, H),
    BOX(LAYOUT.LOT.minX, -1, LAYOUT.LOT.minZ, LAYOUT.LOT.maxX, LEVELS.CURB, LAYOUT.LOT.maxZ),
    BOX(LAYOUT.FAR_SOUTH.minX, -1, LAYOUT.FAR_SOUTH.minZ, LAYOUT.FAR_SOUTH.maxX, LEVELS.CURB, LAYOUT.FAR_SOUTH.maxZ),
    BOX(LAYOUT.FAR_EAST.minX, -1, LAYOUT.FAR_EAST.minZ, LAYOUT.FAR_EAST.maxX, LEVELS.CURB, LAYOUT.FAR_EAST.maxZ),
    BOX(STORE.minX, 0, STORE.minZ, STORE.maxX + 0.17, STORE.parapetY, STORE.maxZ + 0.17),
    BOX(front.minX, bottomY - 0.04, front.minZ, east.maxX + 0.06, bottomY + thickness + 0.03, front.maxZ + 0.06),
    BOX(east.minX, bottomY - 0.04, east.minZ, east.maxX + 0.06, bottomY + thickness + 0.03, east.maxZ),
    BOX(LAYOUT.NEIGHBOR_WEST.minX, 0, LAYOUT.NEIGHBOR_WEST.minZ, LAYOUT.NEIGHBOR_WEST.maxX + 0.18, 5.92, LAYOUT.NEIGHBOR_WEST.maxZ + 0.2),
    BOX(-11.75, 2.6, LAYOUT.NEIGHBOR_WEST.maxZ, -8.45, 3.05, LAYOUT.NEIGHBOR_WEST.maxZ + 0.85),
    BOX(3.05, 0, -11.95, 7.45, 5.6, -7.8),
    BOX(-11.35, 1.9, 3.7, -9.35, 2.15, 4.3),
    BOX(6.1, 5.0, 0.0, 7.8, 6.75, 1.1),
  ];
}

/**
 * Points where water gathers and drips: eave edges plus a downspout outlet.
 * @returns {{x: number, y: number, z: number, minPeriod: number, maxPeriod: number}[][]}
 */
export function GetDripEdges() {
  const { front, east, bottomY } = STORE.canopy;
  const edges = [];
  const Line = (x0, z0, x1, z1, y, spacing, period = [0.9, 2.6]) => {
    const length = Math.hypot(x1 - x0, z1 - z0);
    const count = Math.max(1, Math.round(length / spacing));
    edges.push(Array.from({ length: count }, (_, i) => {
      const t = (i + 0.5) / count;
      return { x: x0 + (x1 - x0) * t, y, z: z0 + (z1 - z0) * t, minPeriod: period[0], maxPeriod: period[1] };
    }));
  };
  Line(front.minX + 0.1, front.maxZ + 0.05, east.maxX, front.maxZ + 0.05, bottomY - 0.05, 0.42);
  Line(east.maxX + 0.05, east.minZ + 0.1, east.maxX + 0.05, front.maxZ - 0.05, bottomY - 0.05, 0.48);
  Line(-11.6, LAYOUT.NEIGHBOR_WEST.maxZ + 0.84, -8.6, LAYOUT.NEIGHBOR_WEST.maxZ + 0.84, 2.62, 0.45);
  Line(-11.2, 4.28, -9.5, 4.28, 1.92, 0.42);
  Line(3.15, -7.82, 7.35, -7.82, 4.88, 0.5);
  const spout = { x: LAYOUT.NEIGHBOR_WEST.maxX + 0.08, y: LEVELS.CURB + 0.23, z: LAYOUT.NEIGHBOR_WEST.maxZ - 0.12 };
  edges.push(Array.from({ length: 8 }, () => ({ ...spout, minPeriod: 0.24, maxPeriod: 0.3 })));
  return edges;
}

/** Open-sky surfaces where tiny impact splashes appear: { minX, maxX, minZ, maxZ, y }. */
export function GetSplashZones() {
  const { ROAD_A, ROAD_B, FAR_SOUTH, FAR_EAST, SIDEWALK_A } = LAYOUT;
  return [
    { ...ROAD_A, y: LEVELS.ROAD },
    { ...ROAD_B, y: LEVELS.ROAD },
    { ...FAR_SOUTH, y: LEVELS.CURB },
    { ...FAR_EAST, y: LEVELS.CURB },
    { ...SIDEWALK_A, maxX: 6.3, y: LEVELS.CURB },
    { minX: STORE.canopy.east.maxX + 0.1, maxX: LAYOUT.LOT.maxX - 0.2, minZ: -7.4, maxZ: SIDEWALK_A.minZ, y: LEVELS.CURB },
    { minX: STORE.minX, maxX: STORE.canopy.east.maxX, minZ: STORE.canopy.front.maxZ + 0.1, maxZ: SIDEWALK_A.minZ, y: LEVELS.CURB },
    { minX: LAYOUT.ALLEY.minX + 0.05, maxX: LAYOUT.ALLEY.maxX - 0.05, minZ: -11.8, maxZ: LAYOUT.ALLEY.maxZ, y: LEVELS.CURB },
    { minX: STORE.minX + 0.15, maxX: STORE.maxX - 0.15, minZ: STORE.minZ + 0.15, maxZ: STORE.maxZ - 0.15, y: STORE.roofY },
    { minX: STORE.canopy.front.minX, maxX: STORE.canopy.east.maxX, minZ: STORE.canopy.front.minZ + 0.2, maxZ: STORE.canopy.front.maxZ, y: STORE.canopy.bottomY + STORE.canopy.thickness },
    { minX: LAYOUT.NEIGHBOR_WEST.minX, maxX: LAYOUT.NEIGHBOR_WEST.maxX, minZ: LAYOUT.NEIGHBOR_WEST.minZ, maxZ: LAYOUT.NEIGHBOR_WEST.maxZ, y: 5.92 },
  ].map((zone) => ({ ...zone, minX: Math.max(zone.minX, -H), maxX: Math.min(zone.maxX, H), minZ: Math.max(zone.minZ, -H), maxZ: Math.min(zone.maxZ, H) }));
}
