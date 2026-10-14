import { Random } from '../utils/Random.js';
import {
  CreateCanvas,
  CanvasToTexture,
  DrawBrandMark,
  DrawText,
  DrawVerticalText,
  FillRoundRect,
  FONT_JP,
  FONT_LATIN,
  FONT_ROUND,
  PaintTexture,
} from './CanvasKit.js';

const BRAND = Object.freeze({
  latin: 'AMAYADORI',
  kana: 'あまやどり',
  tagline: '雨の日も、夜ふけも。',
  ink: '#17675c',
  mint: '#2fbfa2',
  orange: '#ff9a3c',
  coral: '#ff5d73',
  paper: '#fbfaf4',
});

function PaintBrandStripes(ctx, x, y, width, scale = 1) {
  ctx.fillStyle = BRAND.mint;
  ctx.fillRect(x, y, width, 14 * scale);
  ctx.fillStyle = BRAND.orange;
  ctx.fillRect(x, y + 17 * scale, width, 10 * scale);
  ctx.fillStyle = BRAND.coral;
  ctx.fillRect(x, y + 30 * scale, width, 7 * scale);
}

/**
 * Internally-lit fascia sign. Layout adapts to the band's aspect ratio.
 * @param {number} widthMeters
 * @param {number} heightMeters
 */
export function CreateStoreSignTexture(widthMeters, heightMeters) {
  const height = 192;
  const width = Math.min(4096, Math.round((height * widthMeters) / heightMeters));
  return PaintTexture(width, height, (ctx) => {
    ctx.fillStyle = BRAND.paper;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#d9ded9';
    ctx.fillRect(0, 0, width, 6);
    PaintBrandStripes(ctx, 0, 146, width);
    DrawBrandMark(ctx, 104, 72, 58);
    DrawText(ctx, BRAND.latin, 190, 76, { size: 92, font: FONT_LATIN, color: BRAND.ink, align: 'left' });
    DrawText(ctx, BRAND.kana, 760, 82, { size: 50, font: FONT_ROUND, color: BRAND.orange, align: 'left' });
    if (width > 1500) {
      DrawText(ctx, BRAND.tagline, width - 520, 78, { size: 40, color: '#5c7f79', align: 'center' });
    }
    FillRoundRect(ctx, width - 250, 26, 210, 98, 22, BRAND.coral);
    DrawText(ctx, '24H', width - 145, 76, { size: 72, font: FONT_LATIN, color: '#ffffff' });
  });
}

/** Square box sign that sits on top of the roadside pole. */
export function CreatePoleSignTexture() {
  return PaintTexture(512, 640, (ctx) => {
    FillRoundRect(ctx, 0, 0, 512, 640, 26, BRAND.paper);
    DrawBrandMark(ctx, 256, 210, 150);
    DrawText(ctx, BRAND.latin, 256, 418, { size: 74, font: FONT_LATIN, color: BRAND.ink, maxWidth: 460 });
    DrawText(ctx, BRAND.kana, 256, 484, { size: 46, font: FONT_ROUND, color: BRAND.orange });
    PaintBrandStripes(ctx, 0, 548, 512, 1.6);
  });
}

/** Paper-texture background with a coloured border, shared by posters. */
function PosterFrame(ctx, width, height, background, border) {
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = border;
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, width - 16, height - 16);
}

const POSTER_PAINTERS = {
  oden(ctx, width, height) {
    PosterFrame(ctx, width, height, '#fff7e8', '#c0392b');
    DrawVerticalText(ctx, 'おでん', 186, 70, { size: 64, color: '#b0281c' });
    DrawVerticalText(ctx, 'はじめました', 92, 52, { size: 34, color: '#5a3b22', lineHeight: 1.05 });
    // Skewer: konnyaku triangle, daikon disc, fish-cake block.
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(186, 280);
    ctx.lineTo(186, 350);
    ctx.stroke();
    ctx.fillStyle = '#6e6a7a';
    ctx.beginPath();
    ctx.moveTo(160, 300);
    ctx.lineTo(212, 300);
    ctx.lineTo(186, 268);
    ctx.fill();
    ctx.fillStyle = '#f2e3c4';
    ctx.beginPath();
    ctx.arc(186, 322, 20, 0, Math.PI * 2);
    ctx.fill();
  },
  karaage(ctx, width, height) {
    PosterFrame(ctx, width, height, '#ffd23f', '#e84a1e');
    DrawText(ctx, 'からあげ', width / 2, 70, { size: 52, color: '#d6361b', stroke: '#ffffff', strokeWidth: 8 });
    DrawText(ctx, '増量中!', width / 2, 132, { size: 46, color: '#3a2a12' });
    ctx.fillStyle = '#c8741e';
    for (const [x, y, r] of [[90, 240, 40], [160, 228, 46], [126, 292, 42]]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    DrawText(ctx, '¥220', width / 2, 334, { size: 40, font: FONT_LATIN, color: '#d6361b' });
  },
  coffee(ctx, width, height) {
    PosterFrame(ctx, width, height, '#3b2418', '#d9a35b');
    DrawText(ctx, 'HOT', width / 2, 66, { size: 54, font: FONT_LATIN, color: '#ffd9a0' });
    DrawText(ctx, 'COFFEE', width / 2, 118, { size: 40, font: FONT_LATIN, color: '#ffffff' });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(88, 170, 80, 96);
    ctx.fillStyle = '#d9a35b';
    ctx.fillRect(88, 196, 80, 24);
    DrawText(ctx, '¥120', width / 2, 316, { size: 44, font: FONT_LATIN, color: '#ffd9a0' });
  },
  umbrella(ctx, width, height) {
    PosterFrame(ctx, width, height, '#e8f4ff', '#2d6fd1');
    DrawText(ctx, '傘あります', width / 2, 62, { size: 40, color: '#1f4fa0' });
    ctx.strokeStyle = '#7fb2ee';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(width / 2, 210, 80, Math.PI, 0);
    ctx.lineTo(width / 2 - 80, 210);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width / 2, 210);
    ctx.lineTo(width / 2, 290);
    ctx.arc(width / 2 - 14, 290, 14, 0, Math.PI);
    ctx.stroke();
    DrawText(ctx, 'ビニール傘 ¥550', width / 2, 330, { size: 28, color: '#1f4fa0' });
  },
  sweets(ctx, width, height) {
    PosterFrame(ctx, width, height, '#fbe3d0', '#b5651d');
    DrawText(ctx, '秋の新作', width / 2, 62, { size: 44, color: '#9a4d12' });
    DrawText(ctx, '栗スイーツ', width / 2, 116, { size: 38, color: '#6b3a10' });
    ctx.fillStyle = '#8a4b1f';
    ctx.beginPath();
    ctx.moveTo(width / 2, 170);
    ctx.quadraticCurveTo(width / 2 + 78, 230, width / 2 + 52, 290);
    ctx.lineTo(width / 2 - 52, 290);
    ctx.quadraticCurveTo(width / 2 - 78, 230, width / 2, 170);
    ctx.fill();
    ctx.fillStyle = '#e8c08a';
    ctx.fillRect(width / 2 - 52, 270, 104, 20);
  },
  open24(ctx, width, height) {
    PosterFrame(ctx, width, height, BRAND.paper, BRAND.mint);
    DrawText(ctx, '24', width / 2, 130, { size: 150, font: FONT_LATIN, color: BRAND.coral });
    DrawText(ctx, '時間営業', width / 2, 240, { size: 46, color: BRAND.ink });
    DrawText(ctx, 'OPEN ALL NIGHT', width / 2, 300, { size: 24, font: FONT_LATIN, color: BRAND.orange });
  },
};

/** @param {'oden'|'karaage'|'coffee'|'umbrella'|'sweets'|'open24'} kind */
export function CreatePosterTexture(kind) {
  return PaintTexture(256, 360, (ctx, width, height) => POSTER_PAINTERS[kind](ctx, width, height));
}

/**
 * Generic flat label / header board.
 * @param {string} text
 * @param {{background?: string, color?: string, width?: number, height?: number, size?: number,
 *          font?: string, accent?: string, rounded?: boolean}} [style]
 */
export function CreateLabelTexture(text, style = {}) {
  const width = style.width ?? 512;
  const height = style.height ?? 96;
  return PaintTexture(width, height, (ctx) => {
    if (style.rounded) {
      ctx.clearRect(0, 0, width, height);
      FillRoundRect(ctx, 0, 0, width, height, height * 0.3, style.background ?? BRAND.mint);
    } else {
      ctx.fillStyle = style.background ?? BRAND.mint;
      ctx.fillRect(0, 0, width, height);
    }
    if (style.accent) {
      ctx.fillStyle = style.accent;
      ctx.fillRect(0, height - height * 0.16, width, height * 0.16);
    }
    DrawText(ctx, text, width / 2, height * 0.47, {
      size: style.size ?? height * 0.58,
      font: style.font ?? FONT_JP,
      color: style.color ?? '#ffffff',
      maxWidth: width * 0.92,
    });
  });
}

/** Atlas of magazine covers: 8 columns x 4 rows of portrait covers. */
export function CreateMagazineAtlas() {
  const columns = 8;
  const rows = 4;
  const cellW = 128;
  const cellH = 176;
  const random = new Random(404);
  const titles = ['WEEKLY', 'MODE', '旅', 'GAME', '料理', 'CAR', 'POP', '週刊', 'NEKO', 'SORA', 'MUSIC', '雨音'];
  const palette = ['#ff5d73', '#2fbfa2', '#ffcf3f', '#4d7cff', '#ff9a3c', '#b15dff', '#5ed1ff', '#ff7fb3', '#ffffff', '#222a3a'];
  const { canvas, ctx } = CreateCanvas(columns * cellW, rows * cellH);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = col * cellW;
      const y = row * cellH;
      const background = random.Pick(palette);
      ctx.fillStyle = background;
      ctx.fillRect(x, y, cellW, cellH);
      ctx.fillStyle = random.Pick(palette);
      ctx.beginPath();
      ctx.arc(x + random.Range(30, 98), y + random.Range(80, 140), random.Range(28, 52), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = random.Pick(palette);
      ctx.fillRect(x + 10, y + cellH - 40, random.Range(40, 108), 12);
      DrawText(ctx, random.Pick(titles), x + cellW / 2, y + 26, {
        size: 30,
        font: FONT_LATIN,
        color: background === '#ffffff' ? '#ff5d73' : '#ffffff',
        maxWidth: cellW - 12,
        stroke: 'rgba(0,0,0,0.25)',
        strokeWidth: 4,
      });
    }
  }
  return { texture: CanvasToTexture(canvas), columns, rows };
}

/** Wall of small cigarette / goods boxes behind the register. */
export function CreateBackShelfTexture() {
  const random = new Random(505);
  return PaintTexture(512, 256, (ctx, width, height) => {
    ctx.fillStyle = '#3d4350';
    ctx.fillRect(0, 0, width, height);
    const colors = ['#f4f4f4', '#2d5aa8', '#d94040', '#1f8a6a', '#e8c040', '#7b4bb5', '#202020', '#f08a2a'];
    for (let row = 0; row < 6; row++) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, row * 42 + 36, width, 4);
      for (let col = 0; col < 22; col++) {
        ctx.fillStyle = random.Pick(colors);
        ctx.fillRect(col * 23 + 3, row * 42 + 6, 18, 30);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(col * 23 + 5, row * 42 + 10, 14, 4);
      }
    }
  });
}

/** Backlit coffee menu above the counter. */
export function CreateMenuBoardTexture() {
  return PaintTexture(768, 160, (ctx, width, height) => {
    ctx.fillStyle = '#2a211c';
    ctx.fillRect(0, 0, width, height);
    PaintBrandStripes(ctx, 0, height - 30, width, 0.7);
    const items = [['ホットコーヒー', '120'], ['カフェラテ', '180'], ['肉まん', '160'], ['おでん', '100〜']];
    items.forEach(([name, price], index) => {
      const x = 30 + index * 185;
      DrawText(ctx, name, x + 80, 46, { size: 30, color: '#ffe7c2', maxWidth: 170 });
      DrawText(ctx, `¥${price}`, x + 80, 94, { size: 34, font: FONT_LATIN, color: BRAND.orange });
    });
  });
}

/** Brand-striped counter front / fixture fascia. */
export function CreateCounterFrontTexture() {
  return PaintTexture(512, 128, (ctx, width, height) => {
    ctx.fillStyle = BRAND.paper;
    ctx.fillRect(0, 0, width, height);
    PaintBrandStripes(ctx, 0, 76, width, 1);
    DrawBrandMark(ctx, 52, 40, 26);
    DrawText(ctx, BRAND.latin, 96, 42, { size: 30, font: FONT_LATIN, color: BRAND.ink, align: 'left' });
  });
}

/** Entrance mat with a welcome message. */
export function CreateDoormatTexture() {
  return PaintTexture(512, 320, (ctx, width, height) => {
    ctx.fillStyle = '#353a44';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = BRAND.mint;
    ctx.lineWidth = 12;
    ctx.strokeRect(20, 20, width - 40, height - 40);
    DrawText(ctx, 'いらっしゃいませ', width / 2, height * 0.42, { size: 54, color: '#e9ecef' });
    DrawText(ctx, 'WELCOME', width / 2, height * 0.68, { size: 40, font: FONT_LATIN, color: BRAND.orange });
  });
}
