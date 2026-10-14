import * as THREE from 'three';

/** System font stacks — no network fonts, so signage renders offline. */
export const FONT_JP = '"Yu Gothic UI", "Yu Gothic", "Meiryo", "Hiragino Sans", "Noto Sans JP", sans-serif';
export const FONT_LATIN = '"Arial Black", "Segoe UI Black", "Helvetica Neue", Arial, sans-serif';
export const FONT_ROUND = '"Arial Rounded MT Bold", "Segoe UI", "Yu Gothic UI", sans-serif';

/**
 * @param {number} width
 * @param {number} height
 * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}}
 */
export function CreateCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d') };
}

/**
 * Wraps a canvas as a texture with sensible defaults for signage.
 * @param {HTMLCanvasElement} canvas
 * @param {{flipY?: boolean, colorSpace?: string, repeat?: number[], mipmaps?: boolean, nearest?: boolean}} [options]
 * @returns {THREE.CanvasTexture}
 */
export function CanvasToTexture(canvas, options = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = options.flipY ?? true;
  texture.colorSpace = options.colorSpace ?? THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.generateMipmaps = options.mipmaps ?? true;
  texture.minFilter = texture.generateMipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  if (options.repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(options.repeat[0], options.repeat[1]);
  }
  return texture;
}

/**
 * Paints a canvas with `painter` and returns it as a texture.
 * @param {number} width
 * @param {number} height
 * @param {(ctx: CanvasRenderingContext2D, width: number, height: number) => void} painter
 * @param {Parameters<typeof CanvasToTexture>[1]} [options]
 */
export function PaintTexture(width, height, painter, options) {
  const { canvas, ctx } = CreateCanvas(width, height);
  painter(ctx, width, height);
  return CanvasToTexture(canvas, options);
}

/** Traces a rounded rectangle path. */
export function RoundRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/** Fills a rounded rectangle. */
export function FillRoundRect(ctx, x, y, width, height, radius, fillStyle) {
  RoundRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

/**
 * Draws single-line text, shrinking it horizontally if it would exceed `maxWidth`.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {{size: number, font?: string, weight?: string|number, color?: string,
 *          align?: CanvasTextAlign, baseline?: CanvasTextBaseline, maxWidth?: number,
 *          stroke?: string, strokeWidth?: number, scaleY?: number}} style
 */
export function DrawText(ctx, text, x, y, style) {
  ctx.save();
  ctx.font = `${style.weight ?? 'bold'} ${style.size}px ${style.font ?? FONT_JP}`;
  ctx.textAlign = style.align ?? 'center';
  ctx.textBaseline = style.baseline ?? 'middle';
  const measured = ctx.measureText(text).width;
  const squeeze = style.maxWidth && measured > style.maxWidth ? style.maxWidth / measured : 1;
  ctx.translate(x, y);
  ctx.scale(squeeze, style.scaleY ?? 1);
  if (style.stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = style.strokeWidth ?? 6;
    ctx.strokeStyle = style.stroke;
    ctx.strokeText(text, 0, 0);
  }
  ctx.fillStyle = style.color ?? '#ffffff';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/**
 * Draws Japanese text top-to-bottom, one glyph per row (tategaki posters).
 * Long-vowel marks are rotated so they read vertically.
 */
export function DrawVerticalText(ctx, text, x, y, style) {
  const step = style.size * (style.lineHeight ?? 1.08);
  [...text].forEach((glyph, index) => {
    const glyphY = y + index * step;
    if (glyph === 'ー' || glyph === '~' || glyph === '〜') {
      ctx.save();
      ctx.translate(x, glyphY);
      ctx.rotate(Math.PI / 2);
      DrawText(ctx, glyph, 0, 0, style);
      ctx.restore();
    } else {
      DrawText(ctx, glyph, x, glyphY, style);
    }
  });
}

/** Sprinkles translucent speckles — cheap texture "grain" for toon surfaces. */
export function Speckle(ctx, width, height, count, colors, sizeRange, random) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = random.Pick(colors);
    const size = random.Range(sizeRange[0], sizeRange[1]);
    ctx.fillRect(random.Range(0, width), random.Range(0, height), size, size);
  }
}

/** Draws the AMAYADORI brand mark: a mint disc with a white umbrella. */
export function DrawBrandMark(ctx, cx, cy, radius) {
  ctx.save();
  ctx.fillStyle = '#2fbfa2';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy + radius * 0.08, radius * 0.62, Math.PI, 0);
  // Scalloped umbrella rim.
  for (let i = 3; i >= 0; i--) {
    const segment = (radius * 1.24) / 4;
    const sx = cx - radius * 0.62 + segment * (i + 0.5);
    ctx.arc(sx, cy + radius * 0.08, segment / 2, 0, Math.PI, true);
  }
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = radius * 0.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy + radius * 0.05);
  ctx.lineTo(cx, cy + radius * 0.55);
  ctx.arc(cx - radius * 0.12, cy + radius * 0.55, radius * 0.12, 0, Math.PI, false);
  ctx.stroke();
  ctx.fillStyle = '#ff9a3c';
  ctx.beginPath();
  ctx.arc(cx + radius * 0.5, cy - radius * 0.55, radius * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
