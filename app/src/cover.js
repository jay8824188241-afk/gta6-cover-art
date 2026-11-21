// Neon Coast — the cover painter, second pass.
//
// Every mark on the poster is painted here with plain canvas calls: the
// photo panels, the colour wash for the chosen grade, a striped synthwave
// sun, and the big caption lettering. Nothing here is game artwork, a
// game logo, or a game font; the lettering is a system heavyweight face
// filled with gradients this file builds on the fly.
//
// A cover is described by one plain state object:
//   photos:    three image elements (or null), one per photo slot
//   layout:    'solo' | 'duo' | 'trio' | 'quad' | 'hero'
//   grade:     'sunset' | 'neon' | 'noir' | 'midnight' | 'golden'
//   title:     the big caption line; subtitle: the small line under it
//   titleStyle:'block' | 'sunset' | 'neon'
//   captionPos:'bottom' | 'top' | 'floating' — where the caption band sits
//   captionFont:'heavy' | 'condensed' | 'outline' — the caption face
//   captionSize: a multiplier around 1 (0.7–1.4) for the title size
//   kicker:     a short eyebrow line set in small caps above the title
//   captionShade: whether the title gets a soft drop shadow for legibility
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
  hero: { label: 'Hero + two stacked', panels: 3 },
};

export const GRADES = {
  sunset: { label: 'Vice sunset' },
  neon: { label: 'Neon nights' },
  noir: { label: 'Noir' },
  midnight: { label: 'Midnight neon' },
  golden: { label: 'Golden hour' },
};

export const TITLE_STYLES = {
  block: { label: 'Block' },
  sunset: { label: 'Sunset fill' },
  neon: { label: 'Neon glow' },
};

export const CAPTION_POSITIONS = {
  bottom: { label: 'Bottom band' },
  top: { label: 'Top band' },
  floating: { label: 'Floating over photo' },
};

export const CAPTION_FONTS = {
  heavy: { label: 'Heavy block' },
  condensed: { label: 'Tall condensed' },
  outline: { label: 'Outlined' },
};

/**
 * The kicker is the eyebrow line above the title: one short phrase in
 * wide-tracked small caps, in the grade's accent colour. It is optional —
 * an empty kicker simply leaves the title where it was.
 */
export function hasKicker(state) {
  return Boolean((state.kicker || '').trim());
}

/** Pixel height reserved for the kicker inside the caption band. */
function kickerReserve(h, state) {
  return hasKicker(state) ? Math.max(14, h * 0.028) : 0;
}

// The gap between panels, as a share of the cover's shorter side.
const PANEL_GAP = 0.007;

// How far the floating caption sits from the poster's vertical centre,
// as a share of the height; 0 would be dead centre.
const FLOAT_OFFSET = 0.08;

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
  if (layout === 'hero') {
    // Hero: one tall panel takes the left ~62% of the cover, and the
    // other two stack on the right, so a single strong shot leads while
    // two supporting shots fill the rest of the frame.
    const heroW = Math.round((w - gap) * 0.62);
    const sideW = w - heroW - gap;
    const sideH = (h - gap) / 2;
    return [
      { x: 0, y: 0, w: heroW, h },
      { x: heroW + gap, y: 0, w: sideW, h: sideH },
      { x: heroW + gap, y: sideH + gap, w: sideW, h: sideH },
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
  if (layout === 'hero') return [0, 1, 2];
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

/**
 * The colour wash for one grade, painted over the whole poster, plus a
 * soft darkening of the corners so the caption stays readable.
 *
 * Midnight neon is the new night grade: deep indigo at the top fading
 * into electric violet, with a cold cyan lift in the middle — a darker,
 * bluer night than the old neon grade, which stays pink-led. Golden hour
 * is the new warm grade: honey amber at the top, soft rose in the middle
 * and a warm ember base, brighter and dustier than the sunset grade.
 */
function paintGrade(ctx, grade, w, h) {
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  if (grade === 'neon') {
    wash.addColorStop(0, 'rgba(0, 229, 255, 0.11)');
    wash.addColorStop(0.5, 'rgba(255, 0, 128, 0.09)');
    wash.addColorStop(1, 'rgba(120, 0, 255, 0.24)');
  } else if (grade === 'noir') {
    wash.addColorStop(0, 'rgba(24, 34, 68, 0.18)');
    wash.addColorStop(1, 'rgba(0, 0, 0, 0.44)');
  } else if (grade === 'midnight') {
    wash.addColorStop(0, 'rgba(10, 12, 60, 0.34)');
    wash.addColorStop(0.38, 'rgba(38, 16, 96, 0.22)');
    wash.addColorStop(0.62, 'rgba(0, 190, 220, 0.08)');
    wash.addColorStop(1, 'rgba(88, 0, 180, 0.30)');
  } else if (grade === 'golden') {
    wash.addColorStop(0, 'rgba(255, 196, 90, 0.16)');
    wash.addColorStop(0.45, 'rgba(255, 150, 110, 0.10)');
    wash.addColorStop(0.8, 'rgba(214, 110, 60, 0.14)');
    wash.addColorStop(1, 'rgba(120, 48, 20, 0.26)');
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

/** The accent colour for a grade: used for the caption rule and subtitle. */
export function gradeAccent(grade) {
  if (grade === 'neon') return '#00e5ff';
  if (grade === 'midnight') return '#7dd7ff';
  if (grade === 'golden') return '#ffc95e';
  if (grade === 'noir') return '#c9d4ff';
  return '#ff9a3d';
}

/** The subtitle colour for a grade, a softer echo of its accent. */
export function gradeSubtitle(grade) {
  if (grade === 'neon') return '#8ef4ff';
  if (grade === 'midnight') return '#bfe9ff';
  if (grade === 'golden') return '#ffe3ae';
  if (grade === 'noir') return '#dfe6ff';
  return '#ffd9a0';
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

/**
 * The font string for the title at a given pixel size, for the chosen
 * caption face. Heavy is the wide black face; condensed squeezes the
 * letters tall and tight; outline uses the same heavy face but is drawn
 * stroked-only by the caption painter.
 */
function titleFont(px, face) {
  if (face === 'condensed') {
    return `900 ${px}px "Arial Narrow", "Helvetica Neue Condensed", Arial, sans-serif`;
  }
  return `900 ${px}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
}

/** The letter-spacing for a caption face, as a share of the title size. */
function faceTracking(face, px) {
  if (face === 'condensed') return Math.round(px * 0.06);
  if (face === 'outline') return Math.round(px * 0.03);
  return Math.round(px * 0.02);
}

/** Breaks a title into at most two lines that fit inside maxWidth. */
function wrapTitle(ctx, text, px, face, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    ctx.font = titleFont(px, face);
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

/**
 * Where the caption band goes, for the chosen position. Bottom and top
 * are solid bands pinned to an edge; floating is a translucent band
 * centred just below the poster's middle, over the photos themselves.
 */
function captionBand(state, w, h, hasTitle, hasSubtitle) {
  const bandH = h * (hasTitle && hasSubtitle ? 0.22 : 0.17);
  if (state.captionPos === 'top') return { y: 0, h: bandH, banded: true };
  if (state.captionPos === 'floating') {
    return { y: h * (0.5 + FLOAT_OFFSET) - bandH / 2, h: bandH, banded: false };
  }
  return { y: h - bandH, h: bandH, banded: true };
}

/** The caption band: big title, small subtitle, at the chosen position. */
function paintCaption(ctx, state, w, h) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  if (!title && !subtitle) return;
  const face = state.captionFont || 'heavy';
  const sizeScale = Math.min(1.4, Math.max(0.7, Number(state.captionSize) || 1));
  const band = captionBand(state, w, h, Boolean(title), Boolean(subtitle));
  const bandY = band.y;
  const bandH = band.h;
  ctx.fillStyle = band.banded ? 'rgba(12, 6, 24, 0.74)' : 'rgba(12, 6, 24, 0.55)';
  ctx.fillRect(0, bandY, w, bandH);
  ctx.fillStyle = gradeAccent(state.grade);
  const ruleY = state.captionPos === 'top' ? bandY + bandH : bandY;
  ctx.fillRect(0, ruleY, w, Math.max(3, h * 0.005));
  if (!title) return;

  const maxWidth = w * 0.9;
  let px = h * 0.085 * sizeScale;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Kicker first: it sits at the top of the band and pushes the title
  // block down by the space it reserves, so nothing overlaps.
  const reserve = kickerReserve(h, state);
  if (hasKicker(state)) {
    const kickPx = Math.max(11, h * 0.02);
    ctx.font = `800 ${kickPx}px "Helvetica Neue", Arial, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(kickPx * 0.45)}px`; } catch { /* canvas without letterSpacing */ }
    ctx.fillStyle = gradeAccent(state.grade);
    ctx.fillText((state.kicker || '').trim().toUpperCase(), w / 2, bandY + reserve * 0.55);
    try { ctx.letterSpacing = '0px'; } catch { /* canvas without letterSpacing */ }
  }
  let lines = wrapTitle(ctx, title, px, face, maxWidth);
  while (px > h * 0.03 && lines.some((line) => ctx.measureText(line).width > maxWidth)) {
    px *= 0.94;
    ctx.font = titleFont(px, face);
    lines = wrapTitle(ctx, title, px, face, maxWidth);
  }
  const lineH = px * (face === 'condensed' ? 0.98 : 1.05);
  const top = bandY + reserve + ((bandH - reserve - lineH * lines.length) / 2) - (subtitle ? px * 0.28 : 0);
  ctx.font = titleFont(px, face);
  const tracking = faceTracking(face, px);
  try { ctx.letterSpacing = `${tracking}px`; } catch { /* canvas without letterSpacing */ }
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
    // Optional drop shade: a soft dark blur behind each title line so
    // the letters stay readable over a bright photo, even in the
    // floating position where there is no solid band behind them.
    if (state.captionShade && state.titleStyle !== 'neon') {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = px * 0.18;
      ctx.shadowOffsetY = px * 0.05;
    }
    ctx.strokeStyle = 'rgba(10, 4, 20, 0.85)';
    ctx.lineWidth = Math.max(2, px * 0.07);
    if (face === 'outline') {
      // Outlined face: a thick dark edge, then the letter shape itself
      // is left hollow so the photo shows through the letters.
      ctx.lineWidth = Math.max(3, px * 0.09);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeText(line, w / 2, y);
      ctx.lineWidth = Math.max(2, px * 0.05);
      ctx.strokeStyle = 'rgba(10, 4, 20, 0.9)';
      ctx.strokeText(line, w / 2, y);
    } else {
      ctx.strokeText(line, w / 2, y);
      ctx.fillText(line, w / 2, y);
    }
    if (state.titleStyle === 'neon' && face !== 'outline') {
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = px * 0.16;
      ctx.fillText(line, w / 2, y);
    }
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  });
  try { ctx.letterSpacing = '0px'; } catch { /* canvas without letterSpacing */ }
  if (subtitle) {
    const subPx = Math.max(12, h * 0.022);
    ctx.font = `700 ${subPx}px "Helvetica Neue", Arial, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subPx * 0.32)}px`; } catch { /* canvas without letterSpacing */ }
    ctx.fillStyle = gradeSubtitle(state.grade);
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
