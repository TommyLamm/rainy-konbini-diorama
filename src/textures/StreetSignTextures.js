import { Random } from '../utils/Random.js';
import { DrawText, DrawVerticalText, FillRoundRect, FONT_JP, FONT_LATIN, PaintTexture } from './CanvasKit.js';

const DRINK_COLORS = ['#ff5d5d', '#2f7bff', '#ffd23f', '#3fd08a', '#ff9a3c', '#ffffff', '#7b4bb5', '#1d2b4a', '#e85d9c', '#9be15d'];

/** Draws one drink sample (can or PET bottle) in the vending showcase. */
function DrawDrink(ctx, x, y, width, height, color, isBottle) {
  ctx.fillStyle = color;
  if (isBottle) {
    FillRoundRect(ctx, x + width * 0.18, y + height * 0.22, width * 0.64, height * 0.78, 6, color);
    ctx.fillRect(x + width * 0.36, y, width * 0.28, height * 0.25);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + width * 0.36, y, width * 0.28, height * 0.08);
  } else {
    FillRoundRect(ctx, x + width * 0.12, y + height * 0.12, width * 0.76, height * 0.88, 5, color);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillRect(x + width * 0.22, y + height * 0.5, width * 0.56, height * 0.14);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x + width * 0.24, y + height * 0.2, width * 0.08, height * 0.7);
}

/**
 * Backlit showcase of a vending machine: three rows of samples with price tags.
 * The bottom row is "あったか~い" (hot) for the autumn season.
 * @param {number} seed
 */
export function CreateVendingDisplayTexture(seed) {
  const random = new Random(seed);
  return PaintTexture(400, 460, (ctx, width, height) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#dfeeff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    const columns = 5;
    const slotW = width / columns;
    for (let row = 0; row < 3; row++) {
      const top = 18 + row * 148;
      const isHot = row === 2;
      for (let col = 0; col < columns; col++) {
        DrawDrink(ctx, col * slotW + 6, top, slotW - 12, 92, random.Pick(DRINK_COLORS), random.Chance(0.55));
        ctx.fillStyle = isHot ? '#e8343f' : '#2f6fe0';
        ctx.fillRect(col * slotW + 8, top + 98, slotW - 16, 16);
        DrawText(ctx, isHot ? 'あったか~い' : 'つめた~い', col * slotW + slotW / 2, top + 106, { size: 11, color: '#ffffff', maxWidth: slotW - 18 });
        DrawText(ctx, `${random.Pick([110, 130, 140, 160])}`, col * slotW + slotW / 2 - 6, top + 128, { size: 18, font: FONT_LATIN, color: '#20252f' });
        ctx.fillStyle = '#46e08a';
        ctx.beginPath();
        ctx.arc(col * slotW + slotW - 16, top + 128, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

/** Lower (unlit) panel of a vending machine: coin slot, banner, take-out hatch. */
export function CreateVendingLowerTexture(bodyColor, bannerText) {
  return PaintTexture(400, 420, (ctx, width, height) => {
    ctx.fillStyle = bodyColor;
    ctx.fillRect(0, 0, width, height);
    FillRoundRect(ctx, 20, 18, width - 40, 70, 12, 'rgba(255,255,255,0.92)');
    DrawText(ctx, bannerText, width / 2, 54, { size: 36, color: '#e8343f', maxWidth: width - 70 });
    FillRoundRect(ctx, width - 120, 112, 86, 120, 10, '#2a2f3a');
    ctx.fillStyle = '#9aa3b5';
    ctx.fillRect(width - 92, 132, 30, 8);
    ctx.fillRect(width - 104, 168, 54, 6);
    ctx.fillStyle = '#ff9a3c';
    ctx.fillRect(width - 92, 196, 30, 18);
    FillRoundRect(ctx, 30, 112, 190, 120, 10, 'rgba(0,0,0,0.18)');
    DrawText(ctx, 'ICカード対応', 125, 172, { size: 26, color: '#ffffff' });
    FillRoundRect(ctx, 40, 268, width - 80, 120, 14, '#1b1f27');
    DrawText(ctx, 'とりだしぐち', width / 2, 362, { size: 22, color: '#9aa3b5' });
  });
}

/** Round regulatory speed-limit sign (mapped onto a CircleGeometry). */
export function CreateSpeedSignTexture(limit) {
  return PaintTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#d8232a';
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(128, 128, 100, 0, Math.PI * 2);
    ctx.fill();
    DrawText(ctx, String(limit), 128, 134, { size: 118, font: FONT_LATIN, color: '#1d4fa8' });
  });
}

/** Blue vertical address plate strapped to the utility pole. */
export function CreateAddressPlateTexture() {
  return PaintTexture(96, 360, (ctx, width, height) => {
    ctx.fillStyle = '#1f4fa0';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, width - 12, height - 12);
    DrawVerticalText(ctx, '雨音町', width / 2, 48, { size: 50, color: '#ffffff' });
    DrawVerticalText(ctx, '三丁目', width / 2, 222, { size: 36, color: '#ffffff' });
  });
}

/** White pictogram on black, tinted by the lamp material (red stop / blue walk). */
export function CreatePedestrianIconTexture(pose) {
  return PaintTexture(128, 128, (ctx) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.arc(64, 24, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    if (pose === 'walk') {
      ctx.moveTo(62, 44);
      ctx.lineTo(56, 76);
      ctx.moveTo(56, 76);
      ctx.lineTo(38, 112);
      ctx.moveTo(56, 76);
      ctx.lineTo(80, 110);
      ctx.moveTo(60, 50);
      ctx.lineTo(84, 68);
      ctx.moveTo(60, 50);
      ctx.lineTo(40, 70);
    } else {
      ctx.moveTo(64, 44);
      ctx.lineTo(64, 80);
      ctx.moveTo(56, 80);
      ctx.lineTo(54, 114);
      ctx.moveTo(72, 80);
      ctx.lineTo(74, 114);
      ctx.moveTo(52, 48);
      ctx.lineTo(46, 82);
      ctx.moveTo(76, 48);
      ctx.lineTo(82, 82);
    }
    ctx.stroke();
  });
}

/** Neighbourhood notice board with pinned flyers. */
export function CreateBulletinTexture() {
  return PaintTexture(512, 320, (ctx, width, height) => {
    ctx.fillStyle = '#9c7a52';
    ctx.fillRect(0, 0, width, height);
    const flyers = [
      { x: 20, y: 22, w: 140, h: 190, bg: '#1d2b5a', title: '夏祭り', color: '#ffd23f' },
      { x: 178, y: 30, w: 120, h: 160, bg: '#ffffff', title: '迷いねこ', color: '#d8232a' },
      { x: 318, y: 18, w: 170, h: 120, bg: '#fff2a8', title: '防犯パトロール', color: '#1f4fa0' },
      { x: 330, y: 158, w: 150, h: 140, bg: '#e3f6ea', title: '資源ごみの日', color: '#1f7a4f' },
      { x: 40, y: 228, w: 250, h: 74, bg: '#ffe0e6', title: '町内会のお知らせ', color: '#b0283c' },
    ];
    for (const flyer of flyers) {
      ctx.fillStyle = flyer.bg;
      ctx.fillRect(flyer.x, flyer.y, flyer.w, flyer.h);
      DrawText(ctx, flyer.title, flyer.x + flyer.w / 2, flyer.y + 28, { size: 24, color: flyer.color, maxWidth: flyer.w - 12 });
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      for (let line = 0; line < 4 && 56 + line * 22 < flyer.h - 8; line++) {
        ctx.fillRect(flyer.x + 12, flyer.y + 56 + line * 22, flyer.w - 24, 8);
      }
      ctx.fillStyle = '#e8343f';
      ctx.beginPath();
      ctx.arc(flyer.x + flyer.w / 2, flyer.y + 6, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    // Fireworks on the festival flyer.
    for (const [x, y, color] of [[70, 120, '#ff5d73'], [118, 150, '#5ed1ff']]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle) * 8, y + Math.sin(angle) * 8);
        ctx.lineTo(x + Math.cos(angle) * 26, y + Math.sin(angle) * 26);
        ctx.stroke();
      }
    }
  });
}

/** Brass plaque on the plinth front. */
export function CreateNameplateTexture() {
  return PaintTexture(1024, 128, (ctx, width, height) => {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#b8925a');
    gradient.addColorStop(0.5, '#e6c88e');
    gradient.addColorStop(1, '#a37c45');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#7a5a2c';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, width - 20, height - 20);
    DrawText(ctx, '雨夜のコンビニ   AMAYADORI 24H   雨音町三丁目   1/80', width / 2, height / 2 + 2, {
      size: 46,
      color: '#4a3418',
      maxWidth: width - 60,
    });
  });
}

/** Hanging vertical sign of the closed kissaten next door. */
export function CreateKissatenSignTexture() {
  return PaintTexture(128, 420, (ctx, width, height) => {
    ctx.fillStyle = '#3b2a20';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#d9b77a';
    ctx.lineWidth = 5;
    ctx.strokeRect(8, 8, width - 16, height - 16);
    DrawVerticalText(ctx, '喫茶', width / 2, 56, { size: 48, color: '#f3e3c0' });
    DrawVerticalText(ctx, 'つゆくさ', width / 2, 186, { size: 46, color: '#9fd0ff' });
  });
}

/** Yellow / black diagonal "tora" stripes for the pole guard sleeve. */
export function CreateHazardStripeTexture() {
  return PaintTexture(128, 128, (ctx, width, height) => {
    ctx.fillStyle = '#f2c230';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#1d1f24';
    for (let offset = -height; offset < width; offset += 48) {
      ctx.beginPath();
      ctx.moveTo(offset, height);
      ctx.lineTo(offset + 24, height);
      ctx.lineTo(offset + 24 + height, 0);
      ctx.lineTo(offset + height, 0);
      ctx.closePath();
      ctx.fill();
    }
  }, { repeat: [3, 4] });
}

/** Corrugated roller shutter (tiles vertically). */
export function CreateShutterTexture() {
  return PaintTexture(128, 128, (ctx, width, height) => {
    for (let y = 0; y < height; y += 16) {
      const gradient = ctx.createLinearGradient(0, y, 0, y + 16);
      gradient.addColorStop(0, '#9aa0aa');
      gradient.addColorStop(0.6, '#7d838e');
      gradient.addColorStop(1, '#5f646e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, y, width, 16);
    }
  }, { repeat: [1, 6] });
}

/** Paper notice taped to the shutter. */
export function CreateClosedNoticeTexture() {
  return PaintTexture(160, 220, (ctx, width, height) => {
    ctx.fillStyle = '#fbf6ea';
    ctx.fillRect(0, 0, width, height);
    DrawVerticalText(ctx, '本日休業', width / 2, 40, { size: 40, color: '#2a2a2a', font: FONT_JP });
  });
}
