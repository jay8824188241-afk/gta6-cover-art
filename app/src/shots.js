// Fixed scenes for screenshots.
//
//   ?shot=editor — the editor with sample photos loaded and the controls visible
//   ?shot=cover  — the finished cover alone, editor hidden (see the shot-cover class)
//
// Query knobs: photo / photo2 / photo3 (sample for slots A, B, C), caption,
// subtitle, layout, grade, size, style, sun (0 hides the sun). Once the
// scene has been painted, window.__shotReady is set so a screenshot
// script knows the frame is ready to capture.
export async function runShot(shot, query, apply) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const scene = {
    photoA: query.get('photo') ?? 'pier',
    photoB: query.get('photo2') ?? 'boulevard',
    photoC: query.get('photo3') ?? 'pier',
    caption: query.get('caption') ?? 'Sunset Heist',
    subtitle: query.get('subtitle') ?? 'Vice City Nights',
    layout: query.get('layout') ?? 'trio',
    grade: query.get('grade') ?? 'sunset',
    size: query.get('size') ?? 'square',
    style: query.get('style') ?? 'block',
    sun: query.get('sun') !== '0',
  };
  await apply(scene);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
