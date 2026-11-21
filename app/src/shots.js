// Fixed scenes for screenshots.
//
//   ?shot=editor — the editor with sample photos loaded and the controls visible
//   ?shot=cover  — the finished cover alone, editor hidden (see the shot-cover class)
//
// Query knobs: photo / photo2 / photo3 (sample for slots A, B, C), caption,
// subtitle, kicker, layout, grade, size, style, sun (0 hides the sun),
// captionPos (bottom | top | floating), captionFont (heavy | condensed |
// outline), captionSize (0.7–1.4), shade (1 adds the title drop shade),
// zoom / zoom2 / zoom3 and panx / panx2 / panx3 (per-slot crop). Once the
// scene has been painted, window.__shotReady is set so a screenshot
// script knows the frame is ready to capture.
export async function runShot(shot, query, apply) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const numeric = (key, fallback) => {
    const raw = Number(query.get(key));
    return Number.isFinite(raw) ? raw : fallback;
  };
  const clampedSize = Math.min(1.4, Math.max(0.7, numeric('captionSize', 1)));
  const scene = {
    photoA: query.get('photo') ?? 'pier',
    photoB: query.get('photo2') ?? 'boulevard',
    photoC: query.get('photo3') ?? 'pier',
    caption: query.get('caption') ?? 'Sunset Heist',
    subtitle: query.get('subtitle') ?? 'Vice City Nights',
    kicker: query.get('kicker') ?? '',
    layout: query.get('layout') ?? 'trio',
    grade: query.get('grade') ?? 'sunset',
    size: query.get('size') ?? 'square',
    style: query.get('style') ?? 'block',
    captionPos: query.get('captionPos') ?? 'bottom',
    captionFont: query.get('captionFont') ?? 'heavy',
    captionSize: clampedSize,
    captionShade: query.get('shade') === '1',
    sun: query.get('sun') !== '0',
    zoom: [numeric('zoom', 1), numeric('zoom2', 1), numeric('zoom3', 1)],
    panX: [numeric('panx', 0), numeric('panx2', 0), numeric('panx3', 0)],
    panY: [numeric('pany', 0), numeric('pany2', 0), numeric('pany3', 0)],
  };
  await apply(scene);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
