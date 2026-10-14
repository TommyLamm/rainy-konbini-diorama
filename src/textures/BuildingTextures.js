import { Random } from '../utils/Random.js';
import { PaintTexture } from './CanvasKit.js';

/** Faded striped canvas awning of the old shop next door. */
export function CreateAwningTexture() {
  return PaintTexture(256, 64, (ctx, width, height) => {
    for (let x = 0, index = 0; x < width; x += 32, index++) {
      ctx.fillStyle = index % 2 === 0 ? '#5f8f7b' : '#e8e1cf';
      ctx.fillRect(x, 0, 32, height);
    }
    ctx.fillStyle = 'rgba(40,30,20,0.18)';
    ctx.fillRect(0, height - 10, width, 10);
  });
}

/**
 * Warm lit window seen from outside: glowing room, curtains, a plant silhouette.
 * @param {number} seed
 * @param {{warm?: boolean}} [options]
 */
export function CreateLitWindowTexture(seed, options = {}) {
  const random = new Random(seed);
  const warm = options.warm ?? true;
  return PaintTexture(256, 192, (ctx, width, height) => {
    const gradient = ctx.createRadialGradient(width * 0.5, height * 0.4, 10, width * 0.5, height * 0.5, width * 0.7);
    gradient.addColorStop(0, warm ? '#ffe2a8' : '#cfe3ff');
    gradient.addColorStop(1, warm ? '#d98a3c' : '#5a7fb5');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = warm ? 'rgba(170,80,60,0.85)' : 'rgba(60,80,120,0.85)';
    const curtain = random.Range(0.18, 0.3) * width;
    ctx.fillRect(0, 0, curtain, height);
    ctx.fillRect(width - curtain * 0.8, 0, curtain * 0.8, height);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = 6; x < curtain; x += 14) ctx.fillRect(x, 0, 4, height);
    ctx.fillStyle = 'rgba(40,40,40,0.55)';
    ctx.fillRect(width * 0.55, height - 40, 30, 40);
    ctx.beginPath();
    ctx.arc(width * 0.55 + 15, height - 52, 24, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Flat-roof waterproof membrane: one seam per texture tile, faint wet blotches. */
export function CreateRoofTexture(repeatX, repeatY) {
  const random = new Random(77);
  return PaintTexture(128, 128, (ctx, width, height) => {
    ctx.fillStyle = '#5f6878';
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(30,36,50,${random.Range(0.08, 0.18)})`;
      ctx.beginPath();
      ctx.ellipse(random.Range(0, width), random.Range(0, height), random.Range(10, 30), random.Range(6, 16), random.Range(0, Math.PI), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#748093';
    ctx.fillRect(0, 0, width, 4);
    ctx.fillStyle = '#4c5464';
    ctx.fillRect(0, 4, width, 2);
  }, { repeat: [repeatX, repeatY] });
}

/** Grey concrete block wall (ブロック塀) tile. */
export function CreateBlockWallTexture(repeatX, repeatY) {
  return PaintTexture(128, 64, (ctx, width, height) => {
    ctx.fillStyle = '#8d8f93';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#9a9ca0';
    for (let row = 0; row < 2; row++) {
      const offset = row % 2 === 0 ? 0 : width / 4;
      for (let x = -offset; x < width; x += width / 2) ctx.fillRect(x + 2, row * 32 + 2, width / 2 - 4, 28);
    }
  }, { repeat: [repeatX, repeatY] });
}
