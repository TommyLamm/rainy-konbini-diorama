import * as THREE from 'three';
import { BASE, LAYOUT, PALETTE, PUDDLES, STORE } from '../config/SceneConfig.js';
import { Random } from '../utils/Random.js';
import { CanvasToTexture, CreateCanvas, DrawText, FONT_JP, FONT_LATIN, Speckle } from './CanvasKit.js';

/**
 * Maps world X/Z rectangles onto a canvas (canvas row 0 == minZ, flipY = false).
 */
class WorldCanvas {
  constructor(bounds, pixelsPerMeter) {
    this.bounds = bounds;
    this.scale = pixelsPerMeter;
    const width = Math.round((bounds.maxX - bounds.minX) * pixelsPerMeter);
    const height = Math.round((bounds.maxZ - bounds.minZ) * pixelsPerMeter);
    Object.assign(this, CreateCanvas(width, height));
  }

  X(x) {
    return (x - this.bounds.minX) * this.scale;
  }

  Z(z) {
    return (z - this.bounds.minZ) * this.scale;
  }

  L(length) {
    return length * this.scale;
  }

  /** Fills a world-space rectangle. */
  Rect(minX, minZ, maxX, maxZ, fillStyle) {
    this.ctx.fillStyle = fillStyle;
    this.ctx.fillRect(this.X(minX), this.Z(minZ), this.L(maxX - minX), this.L(maxZ - minZ));
  }

  ToTexture(options = {}) {
    return CanvasToTexture(this.canvas, { flipY: false, ...options });
  }
}

const BASE_BOUNDS = Object.freeze({ minX: -BASE.HALF, maxX: BASE.HALF, minZ: -BASE.HALF, maxZ: BASE.HALF });

/** Paints all road-surface markings (white/green) onto `wc`. */
function PaintRoadMarkings(wc) {
  const white = PALETTE.paintWhite;
  const { ROAD_A, ROAD_B, CROSSWALK_A, CROSSWALK_B } = LAYOUT;
  const centerZ = (ROAD_A.minZ + ROAD_A.maxZ) / 2;

  // Road A: edge lines (broken at the crosswalk and the T-junction mouth).
  wc.Rect(-12, ROAD_A.minZ + 0.45, CROSSWALK_A.minX - 0.25, ROAD_A.minZ + 0.58, white);
  wc.Rect(ROAD_B.maxX + 0.25, ROAD_A.minZ + 0.45, 12, ROAD_A.minZ + 0.58, white);
  wc.Rect(-12, ROAD_A.maxZ - 0.29, CROSSWALK_A.minX - 0.25, ROAD_A.maxZ - 0.16, white);
  wc.Rect(CROSSWALK_A.maxX + 0.25, ROAD_A.maxZ - 0.29, 12, ROAD_A.maxZ - 0.16, white);

  // Road A: dashed centre line.
  for (let x = -12; x < 12; x += 2.8) {
    const end = x + 1.6;
    if (end > CROSSWALK_A.minX - 0.6 && x < CROSSWALK_A.maxX + 0.4) continue;
    wc.Rect(x, centerZ - 0.07, end, centerZ + 0.07, white);
  }

  // Road A: zebra crossing — bars run with traffic (along X), stacked across the road.
  for (let z = ROAD_A.minZ + 0.25; z + 0.45 <= ROAD_A.maxZ - 0.15; z += 0.9) {
    wc.Rect(CROSSWALK_A.minX, z, CROSSWALK_A.maxX, z + 0.45, white);
  }
  // Japan drives on the left: eastbound uses the north lane, westbound the south lane.
  // Stop line + "crossing ahead" diamond for eastbound traffic approaching the zebra.
  wc.Rect(CROSSWALK_A.minX - 0.75, ROAD_A.minZ + 0.62, CROSSWALK_A.minX - 0.5, centerZ - 0.12, white);
  PaintDiamond(wc, -4.6, (ROAD_A.minZ + centerZ) / 2 + 0.1, 1.5, 0.62, white);

  // Speed "30" stretched along the westbound lane, reading towards -X.
  const ctx = wc.ctx;
  ctx.save();
  ctx.translate(wc.X(-9.6), wc.Z((centerZ + ROAD_A.maxZ) / 2));
  ctx.rotate(-Math.PI / 2);
  DrawText(ctx, '30', 0, 0, { size: wc.L(0.95), font: FONT_LATIN, color: white, scaleY: 2.3 });
  ctx.restore();

  // Road B: green school-route shoulder, edge lines, stop line, zebra crossing.
  wc.Rect(ROAD_B.minX + 0.02, -12, ROAD_B.minX + 0.55, CROSSWALK_B.minZ - 0.6, PALETTE.paintGreen);
  wc.Rect(ROAD_B.minX + 0.55, -12, ROAD_B.minX + 0.67, CROSSWALK_B.minZ - 0.6, white);
  wc.Rect(ROAD_B.maxX - 0.28, -12, ROAD_B.maxX - 0.16, CROSSWALK_B.minZ - 0.6, white);
  wc.Rect(ROAD_B.minX + 0.2, CROSSWALK_B.minZ - 0.55, ROAD_B.maxX - 0.2, CROSSWALK_B.minZ - 0.28, white);
  for (let x = ROAD_B.minX + 0.25; x + 0.45 <= ROAD_B.maxX - 0.1; x += 0.85) {
    wc.Rect(x, CROSSWALK_B.minZ, x + 0.45, CROSSWALK_B.maxZ, white);
  }
}

/** Outline diamond road marking centred at (x, z). */
function PaintDiamond(wc, x, z, length, width, color) {
  const ctx = wc.ctx;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = wc.L(0.1);
  ctx.beginPath();
  ctx.moveTo(wc.X(x - length / 2), wc.Z(z));
  ctx.lineTo(wc.X(x), wc.Z(z - width / 2));
  ctx.lineTo(wc.X(x + length / 2), wc.Z(z));
  ctx.lineTo(wc.X(x), wc.Z(z + width / 2));
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/** Decorative cast-iron manhole with a tiny umbrella motif. */
function PaintManhole(wc, x, z, radius) {
  const ctx = wc.ctx;
  const cx = wc.X(x);
  const cz = wc.Z(z);
  const r = wc.L(radius);
  ctx.save();
  ctx.fillStyle = '#2b2f37';
  ctx.beginPath();
  ctx.arc(cx, cz, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4b505b';
  ctx.lineWidth = r * 0.08;
  for (const ring of [0.92, 0.7]) {
    ctx.beginPath();
    ctx.arc(cx, cz, r * ring, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.lineWidth = r * 0.05;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r * 0.72, cz + Math.sin(angle) * r * 0.72);
    ctx.lineTo(cx + Math.cos(angle) * r * 0.9, cz + Math.sin(angle) * r * 0.9);
    ctx.stroke();
  }
  ctx.fillStyle = '#555b68';
  ctx.beginPath();
  ctx.arc(cx, cz - r * 0.05, r * 0.42, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(cx - r * 0.03, cz - r * 0.05, r * 0.06, r * 0.4);
  ctx.restore();
}

/**
 * Asphalt for the whole base footprint (raised slabs hide what they cover).
 * @returns {{map: THREE.CanvasTexture, emissiveMap: THREE.CanvasTexture}}
 */
export function CreateRoadTextures() {
  const random = new Random(101);
  const asphalt = new WorldCanvas(BASE_BOUNDS, 85);
  const paint = new WorldCanvas(BASE_BOUNDS, 85);
  const { ctx, canvas } = asphalt;

  ctx.fillStyle = PALETTE.asphalt;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Wheel tracks and repair patches give the road a lived-in read.
  const { ROAD_A, ROAD_B } = LAYOUT;
  for (const z of [6.9, 7.7, 8.9, 9.8]) asphalt.Rect(-12, z - 0.22, 12, z + 0.22, 'rgba(20,24,32,0.10)');
  for (const x of [8.6, 10.0]) asphalt.Rect(x - 0.2, -12, x + 0.2, ROAD_A.minZ, 'rgba(20,24,32,0.10)');
  asphalt.Rect(-10.5, 6.4, -7.9, 7.9, PALETTE.asphaltDark);
  asphalt.Rect(-1.2, 8.6, 1.4, 10.1, 'rgba(70,78,92,0.65)');
  asphalt.Rect(8.0, -9.8, 9.4, -6.6, PALETTE.asphaltDark);

  Speckle(ctx, canvas.width, canvas.height, 60000, ['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.12)', 'rgba(140,150,170,0.07)'], [1, 3], random);

  ctx.strokeStyle = 'rgba(15,18,24,0.55)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 14; i++) {
    let x = random.Range(0, canvas.width);
    let y = random.Range(asphalt.Z(ROAD_A.minZ), asphalt.Z(ROAD_A.maxZ));
    if (i % 3 === 0) {
      x = random.Range(asphalt.X(ROAD_B.minX), asphalt.X(ROAD_B.maxX));
      y = random.Range(0, asphalt.Z(ROAD_A.minZ));
    }
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += random.Range(-18, 18);
      y += random.Range(-18, 18);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  PaintRoadMarkings(paint);
  // Worn paint: asphalt-coloured flecks only where paint exists.
  paint.ctx.globalCompositeOperation = 'source-atop';
  Speckle(paint.ctx, paint.canvas.width, paint.canvas.height, 26000, ['rgba(58,65,79,0.55)', 'rgba(58,65,79,0.3)'], [1, 4], random);
  paint.ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.93;
  ctx.drawImage(paint.canvas, 0, 0);
  ctx.globalAlpha = 1;

  PaintManhole(asphalt, -6.4, 7.25, 0.34);
  PaintManhole(asphalt, 9.3, -7.6, 0.3);

  // Emissive mask: road paint is retro-reflective, so it stays readable at night.
  const glow = CreateCanvas(1024, 1024);
  glow.ctx.fillStyle = '#000000';
  glow.ctx.fillRect(0, 0, 1024, 1024);
  glow.ctx.drawImage(paint.canvas, 0, 0, 1024, 1024);

  return {
    map: asphalt.ToTexture(),
    emissiveMap: CanvasToTexture(glow.canvas, { flipY: false }),
  };
}

/** Running-bond pavers inside a world rectangle. */
function PaintPavers(wc, rect, random, size = [0.42, 0.21]) {
  const { ctx } = wc;
  for (let z = rect.minZ, row = 0; z < rect.maxZ; z += size[1], row++) {
    const offset = (row % 2) * size[0] * 0.5;
    for (let x = rect.minX - offset; x < rect.maxX; x += size[0]) {
      ctx.fillStyle = random.Chance(0.5) ? PALETTE.sidewalkTileA : PALETTE.sidewalkTileB;
      if (random.Chance(0.08)) ctx.fillStyle = '#9a958e';
      ctx.fillRect(wc.X(x) + 1, wc.Z(z) + 1, wc.L(size[0]) - 2, wc.L(size[1]) - 2);
    }
  }
}

/** Yellow tactile paving: dotted warning blocks or ridged guide blocks. */
function PaintTactile(wc, rect, kind) {
  const { ctx } = wc;
  const block = 0.3;
  for (let z = rect.minZ; z < rect.maxZ - 0.01; z += block) {
    for (let x = rect.minX; x < rect.maxX - 0.01; x += block) {
      ctx.fillStyle = PALETTE.tactileYellow;
      ctx.fillRect(wc.X(x) + 1, wc.Z(z) + 1, wc.L(block) - 2, wc.L(block) - 2);
      ctx.fillStyle = '#c7962a';
      if (kind === 'warning') {
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            ctx.beginPath();
            ctx.arc(wc.X(x + 0.06 + i * 0.09), wc.Z(z + 0.06 + j * 0.09), wc.L(0.022), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        for (let i = 0; i < 3; i++) ctx.fillRect(wc.X(x + 0.05 + i * 0.09), wc.Z(z + 0.04), wc.L(0.03), wc.L(0.22));
      }
    }
  }
}

/** Concrete store lot + sidewalk + parking/bike markings. */
export function CreateLotTexture() {
  const random = new Random(202);
  const { LOT, SIDEWALK_A, ALLEY, PARKING, BIKE_ZONE, CROSSWALK_A, CROSSWALK_B } = LAYOUT;
  const wc = new WorldCanvas(LOT, 80);
  const { ctx, canvas } = wc;

  ctx.fillStyle = PALETTE.concrete;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  wc.Rect(ALLEY.minX, ALLEY.minZ, ALLEY.maxX, ALLEY.maxZ, '#6c6f77');
  wc.Rect(STORE.minX, STORE.maxZ, STORE.maxX + 1, SIDEWALK_A.minZ, '#8e9198');
  for (let i = 0; i < 40; i++) {
    const radius = random.Range(20, 90);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, 'rgba(40,44,52,0.10)');
    gradient.addColorStop(1, 'rgba(40,44,52,0)');
    ctx.save();
    ctx.translate(random.Range(0, canvas.width), random.Range(0, canvas.height));
    ctx.fillStyle = gradient;
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    ctx.restore();
  }
  Speckle(ctx, canvas.width, canvas.height, 30000, ['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.08)'], [1, 2], random);

  ctx.strokeStyle = 'rgba(45,48,56,0.55)';
  ctx.lineWidth = 2;
  for (let x = LOT.minX; x <= LOT.maxX; x += 2.5) {
    ctx.beginPath();
    ctx.moveTo(wc.X(x), 0);
    ctx.lineTo(wc.X(x), wc.Z(SIDEWALK_A.minZ));
    ctx.stroke();
  }
  for (let z = LOT.minZ; z <= SIDEWALK_A.minZ; z += 2.5) {
    ctx.beginPath();
    ctx.moveTo(0, wc.Z(z));
    ctx.lineTo(canvas.width, wc.Z(z));
    ctx.stroke();
  }

  PaintPavers(wc, SIDEWALK_A, random);
  PaintTactile(wc, { minX: LOT.minX, maxX: CROSSWALK_A.minX + 0.3, minZ: 5.0, maxZ: 5.3 }, 'guide');
  PaintTactile(wc, { minX: CROSSWALK_A.minX + 0.3, maxX: CROSSWALK_A.maxX - 0.3, minZ: 5.3, maxZ: 5.9 }, 'warning');
  PaintTactile(wc, { minX: LOT.maxX - 0.62, maxX: LOT.maxX - 0.02, minZ: CROSSWALK_B.minZ + 0.2, maxZ: CROSSWALK_B.maxZ - 0.2 }, 'warning');

  const white = PALETTE.paintWhite;
  for (const z of PARKING.slots) wc.Rect(PARKING.minX, z - 0.06, PARKING.maxX, z + 0.06, white);
  wc.Rect(PARKING.minX, PARKING.slots[0], PARKING.minX + 0.12, PARKING.slots[PARKING.slots.length - 1], white);

  ctx.save();
  ctx.setLineDash([wc.L(0.25), wc.L(0.18)]);
  ctx.strokeStyle = 'rgba(233,237,243,0.85)';
  ctx.lineWidth = wc.L(0.06);
  ctx.strokeRect(wc.X(BIKE_ZONE.minX), wc.Z(BIKE_ZONE.minZ), wc.L(BIKE_ZONE.maxX - BIKE_ZONE.minX), wc.L(BIKE_ZONE.maxZ - BIKE_ZONE.minZ));
  ctx.restore();
  DrawText(ctx, '駐輪場', wc.X((BIKE_ZONE.minX + BIKE_ZONE.maxX) / 2), wc.Z(BIKE_ZONE.maxZ - 0.25), {
    size: wc.L(0.24),
    font: FONT_JP,
    color: 'rgba(233,237,243,0.9)',
  });

  return wc.ToTexture();
}

/** Repeating paver tile for the far-side pavements. */
export function CreatePaverTileTexture(repeatX, repeatY) {
  const random = new Random(303);
  const wc = new WorldCanvas({ minX: 0, maxX: 2.52, minZ: 0, maxZ: 1.26 }, 160);
  wc.ctx.fillStyle = '#5f5c58';
  wc.ctx.fillRect(0, 0, wc.canvas.width, wc.canvas.height);
  PaintPavers(wc, { minX: 0, maxX: 2.52, minZ: 0, maxZ: 1.26 }, random);
  return wc.ToTexture({ repeat: [repeatX, repeatY] });
}

/** Interior floor tiles with queue footprints and entrance arrows. */
export function CreateInteriorFloorTexture(bounds) {
  const wc = new WorldCanvas(bounds, 110);
  const { ctx } = wc;
  const tile = 0.45;
  for (let z = bounds.minZ, row = 0; z < bounds.maxZ; z += tile, row++) {
    for (let x = bounds.minX, col = 0; x < bounds.maxX; x += tile, col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? PALETTE.interiorFloor : '#e2dacb';
      ctx.fillRect(wc.X(x), wc.Z(z), wc.L(tile) + 1, wc.L(tile) + 1);
    }
  }
  ctx.strokeStyle = 'rgba(160,150,135,0.5)';
  ctx.lineWidth = 1.5;
  for (let x = bounds.minX; x < bounds.maxX; x += tile) {
    ctx.beginPath();
    ctx.moveTo(wc.X(x), 0);
    ctx.lineTo(wc.X(x), wc.canvas.height);
    ctx.stroke();
  }
  for (let z = bounds.minZ; z < bounds.maxZ; z += tile) {
    ctx.beginPath();
    ctx.moveTo(0, wc.Z(z));
    ctx.lineTo(wc.canvas.width, wc.Z(z));
    ctx.stroke();
  }

  // Queue guide in front of the register.
  wc.Rect(-0.9, -3.62, 1.9, -3.55, '#3fb89e');
  for (let i = 0; i < 3; i++) PaintFootprints(wc, 0.5, -3.1 + i * 0.75);
  DrawText(ctx, 'お会計はこちらでお待ちください', wc.X(0.5), wc.Z(-3.38), { size: wc.L(0.1), color: '#2f9c86' });
  // Entrance arrow.
  ctx.fillStyle = 'rgba(255,154,60,0.85)';
  ctx.beginPath();
  ctx.moveTo(wc.X(0.65), wc.Z(-0.95));
  ctx.lineTo(wc.X(0.95), wc.Z(-0.55));
  ctx.lineTo(wc.X(0.35), wc.Z(-0.55));
  ctx.closePath();
  ctx.fill();
  wc.Rect(0.57, -0.55, 0.73, -0.15, 'rgba(255,154,60,0.85)');
  return wc.ToTexture();
}

function PaintFootprints(wc, x, z) {
  const { ctx } = wc;
  ctx.fillStyle = 'rgba(63,184,158,0.8)';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(wc.X(x + side * 0.07), wc.Z(z), wc.L(0.04), wc.L(0.09), 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Wetness mask over the whole base: grey = damp, white = standing water,
 * black = dry (under canopies and eaves). Edges are refined in the shader.
 */
export function CreateWetMaskTexture() {
  const wc = new WorldCanvas(BASE_BOUNDS, 24);
  const { ctx } = wc;
  ctx.fillStyle = 'rgb(118,118,118)';
  ctx.fillRect(0, 0, wc.canvas.width, wc.canvas.height);

  const { front, east } = STORE.canopy;
  ctx.filter = 'blur(5px)';
  wc.Rect(front.minX - 0.1, front.minZ - 0.5, front.maxX, front.maxZ - 0.35, 'rgb(14,14,14)');
  wc.Rect(east.minX - 0.5, east.minZ, east.maxX - 0.3, east.maxZ - 0.35, 'rgb(14,14,14)');
  wc.Rect(LAYOUT.NEIGHBOR_WEST.minX, LAYOUT.NEIGHBOR_WEST.maxZ - 0.2, LAYOUT.NEIGHBOR_WEST.maxX, LAYOUT.NEIGHBOR_WEST.maxZ + 0.55, 'rgb(40,40,40)');
  ctx.filter = 'none';

  for (const puddle of PUDDLES) {
    ctx.save();
    ctx.translate(wc.X(puddle.x), wc.Z(puddle.z));
    ctx.rotate(puddle.rot);
    ctx.scale(wc.L(puddle.rx), wc.L(puddle.rz));
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.25);
    gradient.addColorStop(0, 'rgb(255,255,255)');
    gradient.addColorStop(0.62, 'rgb(225,225,225)');
    gradient.addColorStop(1, 'rgba(160,160,160,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 1.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const texture = wc.ToTexture({ colorSpace: THREE.NoColorSpace });
  return { texture, bounds: BASE_BOUNDS };
}

/** Soft radial sprite used for lamp halos and light pools. */
export function CreateRadialTexture(stops = [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]) {
  const { canvas, ctx } = CreateCanvas(128, 128);
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return CanvasToTexture(canvas, { colorSpace: THREE.NoColorSpace });
}

/**
 * Window-shaped light spill: bright panes separated by mullion shadows, fading
 * away from the facade (v = 0 at the wall).
 * @param {number[]} paneEdges - Normalised [start, end] pairs along the facade.
 */
export function CreateWindowSpillTexture(paneEdges) {
  const panes = CreateCanvas(512, 256);
  for (const [start, end] of paneEdges) {
    const gradient = panes.ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.45)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    panes.ctx.fillStyle = gradient;
    panes.ctx.fillRect(start * 512, 0, (end - start) * 512, 256);
  }
  const { canvas, ctx } = CreateCanvas(512, 256);
  ctx.filter = 'blur(6px)';
  ctx.drawImage(panes.canvas, 0, 0);
  return CanvasToTexture(canvas, { flipY: false, colorSpace: THREE.NoColorSpace });
}

/** Vertical night-sky gradient used as the scene backdrop. */
export function CreateBackdropTexture() {
  const { canvas, ctx } = CreateCanvas(4, 512);
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, PALETTE.backgroundTop);
  gradient.addColorStop(0.55, PALETTE.backgroundMid);
  gradient.addColorStop(1, PALETTE.backgroundBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4, 512);
  return CanvasToTexture(canvas, { mipmaps: false });
}
