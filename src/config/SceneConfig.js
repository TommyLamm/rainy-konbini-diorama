/**
 * Single source of truth for the diorama: render layers, layout (in metres,
 * X = east, Z = south / towards the default camera, Y = up), palette and FX tuning.
 * Every builder reads from here so the street plan stays consistent across
 * geometry, painted ground textures, wet masks and rain colliders.
 */

/** Render layers decide which passes see an object. */
export const LAYERS = Object.freeze({
  /** Opaque geometry: outlined, reflected, casts/receives shadows. */
  SOLID: 0,
  /** Transparent effects: rain, glass, wet overlays. Not outlined, not reflected. */
  FX: 1,
  /** Glow sprites / halos: reflected in puddles but never outlined. */
  GLOW: 2,
  /** Small opaque details (shop products): occlude like SOLID but get faint lines. */
  DETAIL: 3,
});

export const BASE = Object.freeze({
  HALF: 12,
  SIZE: 24,
  GROUND_DEPTH: 0.9,
  PLINTH_HEIGHT: 1.05,
  PLINTH_MARGIN: 0.55,
});

export const LEVELS = Object.freeze({
  ROAD: 0,
  CURB: 0.15,
  STORE_FLOOR: 0.22,
});

/** Axis-aligned rectangles are { minX, maxX, minZ, maxZ }. */
export const LAYOUT = Object.freeze({
  ROAD_A: { minX: -12, maxX: 12, minZ: 6.0, maxZ: 10.6 },
  ROAD_B: { minX: 7.6, maxX: 11.0, minZ: -12, maxZ: 6.0 },
  LOT: { minX: -12, maxX: 7.6, minZ: -12, maxZ: 6.0, cornerRadius: 1.25 },
  FAR_SOUTH: { minX: -12, maxX: 12, minZ: 10.6, maxZ: 12 },
  FAR_EAST: { minX: 11.0, maxX: 12, minZ: -12, maxZ: 6.0, cornerRadius: 0.8 },
  SIDEWALK_A: { minX: -12, maxX: 7.6, minZ: 4.4, maxZ: 6.0 },
  CROSSWALK_A: { minX: 3.4, maxX: 6.4 },
  CROSSWALK_B: { minZ: 1.6, maxZ: 4.4 },
  ALLEY: { minX: -8.2, maxX: -6.6, minZ: -12, maxZ: 4.4 },
  PARKING: { minX: 3.6, maxX: 7.3, slots: [-5.6, -3.1, -0.6] },
  BIKE_ZONE: { minX: -4.6, maxX: -2.1, minZ: 1.3, maxZ: 3.5 },
  NEIGHBOR_WEST: { minX: -12, maxX: -8.2, minZ: -12, maxZ: 3.4 },
  NEIGHBOR_NE: { minX: 3.1, maxX: 7.3, minZ: -12, maxZ: -7.7 },
  BACK_WALL_Z: -7.9,
});

export const STORE = Object.freeze({
  minX: -6.6,
  maxX: 2.6,
  minZ: -6.4,
  maxZ: 0.8,
  wall: 0.14,
  floorY: LEVELS.STORE_FLOOR,
  ceilingY: 3.1,
  roofY: 3.5,
  parapetY: 3.95,
  signBand: { minY: 3.02, maxY: 3.8 },
  windowY: { min: 0.32, max: 2.74 },
  frontWindows: { minX: -6.45, maxX: -1.05 },
  eastWindows: { minZ: -4.3, maxZ: 0.62 },
  door: { minX: -0.2, maxX: 1.5, height: 2.48 },
  doorFixedPanels: [
    { minX: -1.05, maxX: -0.2 },
    { minX: 1.5, maxX: 2.35 },
  ],
  canopy: {
    bottomY: 2.82,
    thickness: 0.2,
    front: { minX: -6.6, maxX: 2.6, minZ: 0.8, maxZ: 2.45 },
    east: { minX: 2.6, maxX: 3.55, minZ: -4.4, maxZ: 2.45 },
  },
});

/** Sanitised sRGB hex colours used across materials and painted textures. */
export const PALETTE = Object.freeze({
  backgroundTop: '#0a0f26',
  backgroundMid: '#172042',
  backgroundBottom: '#2a2150',
  asphalt: '#3a414f',
  asphaltDark: '#2f3542',
  curb: '#8b8e96',
  concrete: '#878a92',
  sidewalkTileA: '#8f8b86',
  sidewalkTileB: '#7d7a76',
  tactileYellow: '#e3b53c',
  paintWhite: '#e9edf3',
  paintGreen: '#3f8f6b',
  storeWall: '#ecebe6',
  storeTrim: '#5a6270',
  storeMint: '#3fd0b0',
  storeOrange: '#ff9a3c',
  storeCoral: '#ff5d73',
  frameDark: '#3a404c',
  interiorWall: '#f4efe4',
  interiorFloor: '#ece5d6',
  shelfMetal: '#d9dbdf',
  plinthWood: '#3b2a22',
  plinthTrim: '#c9a46a',
  soil: '#4a3a33',
  gravel: '#6a6560',
  neighborWall: '#b7a58c',
  neighborRoof: '#454a5a',
  houseWall: '#c9c2b4',
  pole: '#a7a7a1',
  guardWhite: '#e8ebef',
  foliage: '#2f5b4f',
});

export const LIGHT_COLORS = Object.freeze({
  interior: '#ffe8c4',
  canopy: '#ffe2b0',
  streetLamp: '#b9dcff',
  vending: '#e4f2ff',
  alley: '#d9ffe8',
  skyFill: '#8ea4ff',
  hemiSky: '#4b5d9c',
  hemiGround: '#231a2c',
  signalBlue: '#21e0b4',
  signalYellow: '#ffb324',
  signalRed: '#ff2d3a',
});

/**
 * Puddles as rotated ellipses on the ground: { x, z, rx, rz, rot, y }.
 * Shared by the wet-mask painter and the ripple-ring emitter.
 */
export const PUDDLES = Object.freeze([
  { x: -3.2, z: 6.55, rx: 1.7, rz: 0.42, rot: 0.02, y: LEVELS.ROAD },
  { x: 1.4, z: 6.45, rx: 0.9, rz: 0.3, rot: -0.05, y: LEVELS.ROAD },
  { x: -8.6, z: 8.9, rx: 1.35, rz: 0.62, rot: 0.15, y: LEVELS.ROAD },
  { x: 4.9, z: 9.5, rx: 1.15, rz: 0.5, rot: -0.1, y: LEVELS.ROAD },
  { x: 9.2, z: 8.1, rx: 1.0, rz: 0.62, rot: 0.4, y: LEVELS.ROAD },
  { x: 9.1, z: -4.6, rx: 0.6, rz: 1.45, rot: 0.05, y: LEVELS.ROAD },
  { x: 10.1, z: -9.2, rx: 0.5, rz: 0.95, rot: -0.1, y: LEVELS.ROAD },
  { x: 5.3, z: -2.3, rx: 1.45, rz: 0.85, rot: 0.25, y: LEVELS.CURB },
  { x: -1.4, z: 3.45, rx: 1.15, rz: 0.42, rot: -0.04, y: LEVELS.CURB },
  { x: -7.4, z: 1.2, rx: 0.48, rz: 1.05, rot: 0.0, y: LEVELS.CURB },
  { x: 0.2, z: 11.3, rx: 0.85, rz: 0.3, rot: 0.0, y: LEVELS.CURB },
  { x: 11.5, z: -2.2, rx: 0.3, rz: 0.85, rot: 0.0, y: LEVELS.CURB },
]);

export const RAIN = Object.freeze({
  COUNT: 5600,
  TOP_Y: 13.5,
  SPEED_MIN: 13,
  SPEED_MAX: 18,
  STREAK_LENGTH: 0.62,
  WIDTH: 0.018,
  WIND: { x: 0.11, z: 0.05 },
});

export const CAMERA = Object.freeze({
  FOV: 30,
  NEAR: 0.5,
  FAR: 400,
  TARGET: { x: -0.6, y: 1.4, z: 0.4 },
  AZIMUTH_DEG: 32,
  ELEVATION_DEG: 27,
  MIN_DISTANCE: 16,
  MAX_DISTANCE: 115,
});
