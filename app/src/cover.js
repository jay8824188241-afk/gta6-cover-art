// Neon Coast — the cover painter.
//
// Everything on the poster is drawn here with plain canvas calls: the
// photo panels, the sunset / neon / noir colour wash, a striped synthwave
// sun and the big caption lettering. No game artwork, logo or font is
// involved anywhere; the lettering is a system heavyweight face filled
// with gradients the app builds itself.
//
// A cover is described by a state object:
//   photos:    three HTMLImageElement values (or null) — one per slot
//   layout:    'solo' | 'duo' | 'trio' | 'quad'
//   grade:     'sunset' | 'neon' | 'noir'
//   title:     the big caption line, subtitle: the small line under it
//   titleStyle:'block' | 'sunset' | 'neon'
//   zoom, panX, panY: per-slot crop numbers (zoom >= 0.5, pans in [-1, 1])
//   sun:       whether the striped sun is drawn
//   size:      one of the keys of SIZES
//
// drawCover(canvas, state) paints that state onto the canvas at whatever
// pixel size the canvas already has, so the live preview and the exported
// PNG are the same drawing at different resolutions.

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 x 1350' },
  wide: { w: 1920, h: 1080, label: '1920 x 1080' },
};

export const LAYOUTS = {
  solo: { label: 'One photo', panels: 1 },
  duo: { label: 'Two panels', panels: 2 },
  trio: { label: 'Three panels', panels: 3 },
  quad: { label: 'Four panels', panels: 4 },
};

export const GRADES = {
  sunset: { label: 'Vice sunset' },
  neon: { label: 'Neon nights' },
  noir: { label: 'Noir' },
};

export const TITLE_STYLES = {
  block: { label: 'Block' },
  sunset: { label: 'Sunset fill' },
  neon: { label: 'Neon glow' },
};

// The gap between panels, as a share of the cover's shorter side.
const PANEL_GAP = 0.007;

/** Where each panel sits on a w-by-h cover, in layout order. */
export function panelRects(layout, w, h) {
  const gap = Math.max(2, Math.round(Math.min(w, h) * PANEL_GAP));
  if (layout === 'solo') return [{ x: 0, y: 0, w, h }];
  if (layout === 'duo') {
    const half = (w - gap) / 2;
    return [
      { x: 0, y: 0, w: half, h },
      { x: half + gap, y: 0, w: half, h },
    ];
  }
  if (layout === 'quad') {
    const halfW = (w - gap) / 2;
    const halfH = (h - gap) / 2;
    return [
      { x: 0, y: 0, w: halfW, h: halfH },
      { x: halfW + gap, y: 0, w: halfW, h: halfH },
      { x: 0, y: halfH + gap, w: halfW, h: halfH },
      { x: halfW + gap, y: halfH + gap, w: halfW, h: halfH },
    ];
  }
  // trio: three equal vertical strips.
  const third = (w - gap * 2) / 3;
  return [
    { x: 0, y: 0, w: third, h },
    { x: third + gap, y: 0, w: third, h },
    { x: third * 2 + gap * 2, y: 0, w: third, h },
  ];
}

/** Which photo slot paints each panel, in the same order as panelRects. */
export function panelSlots(layout) {
  if (layout === 'solo') return [0];
  if (layout === 'duo') return [0, 1];
  if (layout === 'quad') return [0, 1, 2, 0];
  return [0, 1, 2];
}

/**
 * Paints one photo into one panel, cover-fitting it and then applying the
 * slot's zoom and pan. Pan is a fraction of the slack left over after the
 * cover fit, so 0 always means centred and +/-1 pushes to the edge.
 */
function paintPhoto(ctx, img, rect, zoom, panX, panY) {
  if (!img) return;
  const fit = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = fit * zoom;
  const drawnW = img.naturalWidth * scale;
  const drawnH = img.naturalHeight * scale;
  const centreX = rect.x + rect.w / 2 + (panX * (drawnW - rect.w)) / 2;
  const centreY = rect.y + rect.h / 2 + (panY * (drawnH - rect.h)) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, centreX - drawnW / 2, centreY - drawnH / 2, drawnW, drawnH);
  ctx.restore();
}

/** A panel with no photo yet: a dark gradient so the poster still holds together. */
function paintEmptyPanel(ctx, rect) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, '#411a58');
  g.addColorStop(1, '#140822');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/** Tints the whole poster with the chosen grade, then darkens the corners. */
function paintGrade(ctx, grade, w, h) {
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  if (grade === 'neon') {
    wash.addColorStop(0, 'rgba(0, 229, 255, 0.11)');
    wash.addColorStop(0.5, 'rgba(255, 0, 128, 0.09)');
    wash.addColorStop(1, 'rgba(120, 0, 255, 0.24)');
  } else if (grade === 'noir') {
    wash.addColorStop(0, 'rgba(24, 34, 68, 0.18)');
    wash.addColorStop(1, 'rgba(0, 0, 0, 0.44)');
  } else {
    wash.addColorStop(0, 'rgba(255, 170, 60, 0.09)');
    wash.addColorStop(0.55, 'rgba(255, 90, 120, 0.11)');
    wash.addColorStop(1, 'rgba(140, 30, 140, 0.30)');
  }
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  const edge = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.78,
  );
  edge.addColorStop(0, 'rgba(0, 0, 0, 0)');
  edge.addColorStop(1, 'rgba(0, 0, 0, 0.30)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);
}

/**
 * The striped sun: a yellow-to-pink disc on a scratch canvas, with
 * widening horizontal gaps cut out of its lower half, then stamped onto
 * the poster at partial opacity.
 */
function paintSun(ctx, cx, cy, r) {
  const scratch = document.createElement('canvas');
  scratch.width = Math.ceil(r * 2);
  scratch.height = Math.ceil(r * 2);
  const s = scratch.getContext('2d');
  const glow = s.createLinearGradient(0, 0, 0, r * 2);
  glow.addColorStop(0, '#ffe95e');
  glow.addColorStop(0.5, '#ff9a3d');
  glow.addColorStop(1, '#ff2e88');
  s.fillStyle = glow;
  s.beginPath();
  s.arc(r, r, r, 0, Math.PI * 2);
  s.fill();
  s.globalCompositeOperation = 'destination-out';
  let y = r * 1.02;
  let cut = Math.max(2, r * 0.02);
  while (y < r * 2) {
    s.fillRect(0, y, r * 2, cut);
    y += cut + Math.max(3, r * 0.05);
    cut *= 1.55;
  }
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.drawImage(scratch, cx - r, cy - r);
  ctx.restore();
}

function titleFont(px) {
  return `900 ${px}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
}

/** Breaks a title into at most two lines that fit inside maxWidth. */
function wrapTitle(ctx, text, px, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    ctx.font = titleFont(px);
    if (ctx.measureText(trial).width <= maxWidth || !current) {
      current = trial;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  while (lines.length > 2) {
    lines[1] = `${lines[1]} ${lines[2]}`;
    lines.splice(2, 1);
  }
  return lines;
}

/** The caption band across the bottom: big title, small subtitle. */
function paintCaption(ctx, state, w, h) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  if (!title && !subtitle) return;
  const bandH = h * (title && subtitle ? 0.22 : 0.17);
  const bandY = h - bandH;
  ctx.fillStyle = 'rgba(12, 6, 24, 0.74)';
  ctx.fillRect(0, bandY, w, bandH);
  ctx.fillStyle = state.grade === 'neon' ? '#00e5ff' : '#ff9a3d';
  ctx.fillRect(0, bandY, w, Math.max(3, h * 0.005));
  if (!title) return;

  const maxWidth = w * 0.9;
  let px = h * 0.085;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let lines = wrapTitle(ctx, title, px, maxWidth);
  while (px > h * 0.03 && lines.some((line) => ctx.measureText(line).width > maxWidth)) {
    px *= 0.94;
    ctx.font = titleFont(px);
    lines = wrapTitle(ctx, title, px, maxWidth);
  }
  const lineH = px * 1.05;
  const top = bandY + ((bandH - lineH * lines.length) / 2) - (subtitle ? px * 0.28 : 0);
  ctx.font = titleFont(px);
  try { ctx.letterSpacing = `${Math.round(px * 0.02)}px`; } catch { /* canvas without letterSpacing */ }
  lines.forEach((line, i) => {
    const y = top + lineH * (i + 0.5);
    if (state.titleStyle === 'sunset') {
      const fill = ctx.createLinearGradient(0, y - px / 2, 0, y + px / 2);
      fill.addColorStop(0, '#ffe95e');
      fill.addColorStop(0.55, '#ff7a3d');
      fill.addColorStop(1, '#ff2e88');
      ctx.fillStyle = fill;
    } else if (state.titleStyle === 'neon') {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ff2e88';
      ctx.shadowBlur = px * 0.35;
    } else {
      ctx.fillStyle = '#ffffff';
    }
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(10, 4, 20, 0.85)';
    ctx.lineWidth = Math.max(2, px * 0.07);
    ctx.strokeText(line, w / 2, y);
    ctx.fillText(line, w / 2, y);
    if (state.titleStyle === 'neon') {
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = px * 0.16;
      ctx.fillText(line, w / 2, y);
    }
    ctx.shadowBlur = 0;
  });
  try { ctx.letterSpacing = '0px'; } catch { /* canvas without letterSpacing */ }
  if (subtitle) {
    const subPx = Math.max(12, h * 0.022);
    ctx.font = `700 ${subPx}px "Helvetica Neue", Arial, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subPx * 0.32)}px`; } catch { /* canvas without letterSpacing */ }
    ctx.fillStyle = state.grade === 'neon' ? '#8ef4ff' : '#ffd9a0';
    ctx.fillText(subtitle, w / 2, bandY + bandH - subPx * 1.15);
    try { ctx.letterSpacing = '0px'; } catch { /* canvas without letterSpacing */ }
  }
}

/** Paints the full cover for `state` onto `canvas` at its own pixel size. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, w, h);
  const rects = panelRects(state.layout, w, h);
  const slots = panelSlots(state.layout);
  rects.forEach((rect, i) => {
    const slot = slots[i];
    const img = state.photos[slot] || null;
    if (img) {
      paintPhoto(ctx, img, rect, state.zoom[slot] ?? 1, state.panX[slot] ?? 0, state.panY[slot] ?? 0);
    } else {
      paintEmptyPanel(ctx, rect);
    }
  });
  paintGrade(ctx, state.grade, w, h);
  if (state.sun) {
    // Tucked into the top-right corner so it never covers a face.
    const r = Math.min(w, h) * 0.11;
    paintSun(ctx, w - r * 0.85, r * 0.95, r);
  }
  // The app's own small mark, top left — an original wordmark, not a game logo.
  const markPx = Math.max(11, h * 0.016);
  ctx.font = `700 ${markPx}px "Helvetica Neue", Arial, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(h * 0.004)}px`; } catch { /* canvas without letterSpacing */ }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText('NEON COAST', w * 0.03, h * 0.035);
  try { ctx.letterSpacing = '0px'; } catch { /* canvas without letterSpacing */ }
  paintCaption(ctx, state, w, h);
}
