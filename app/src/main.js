// Neon Coast — the editor wiring.
//
// Pick photos (your own files, or the bundled samples), crop and position
// each one, choose a panel layout, a colour grade and caption lettering,
// then export a PNG in a post size. A `?shot=` query instead sets up one
// fixed scene for a screenshot; see shots.js for the query it reads.
import { drawCover, SIZES, LAYOUTS, GRADES, TITLE_STYLES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const titleField = document.getElementById('title');
const subtitleField = document.getElementById('subtitle');
const sizeField = document.getElementById('size');
const sunField = document.getElementById('sun');
const statusLine = document.getElementById('status');
const exportButton = document.getElementById('export');

// The whole editor is this one object; every control edits it and then
// calls repaint() to redraw the live preview from it.
const state = {
  photos: [null, null, null],
  layout: 'trio',
  grade: 'sunset',
  title: 'Sunset Heist',
  subtitle: 'Vice City Nights',
  titleStyle: 'block',
  zoom: [1, 1, 1],
  panX: [0, 0, 0],
  panY: [0, 0, 0],
  sun: true,
  size: 'square',
};

/** Redraws the preview canvas at the size the state currently asks for. */
function repaint() {
  const size = SIZES[state.size];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(canvas, state);
}

function setStatus(text) {
  statusLine.textContent = text;
}

/** Loads an image from a URL, resolving once it is ready to draw. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/**
 * Wires one photo slot: its file picker (a photo from the user's machine,
 * read locally and never uploaded), its sample picker, and its three crop
 * sliders — zoom, sideways pan, up/down pan.
 */
function wirePhotoSlot(slot) {
  const slotEl = document.querySelector(`[data-slot="${slot}"]`);
  const fileInput = slotEl.querySelector('input[type="file"]');
  const samplePick = slotEl.querySelector('select');
  const zoomInput = slotEl.querySelector('input[data-crop="zoom"]');
  const panXInput = slotEl.querySelector('input[data-crop="panx"]');
  const panYInput = slotEl.querySelector('input[data-crop="pany"]');
  const letter = 'ABC'[slot];

  fileInput.addEventListener('change', async () => {
    const picked = fileInput.files[0];
    if (!picked) return;
    try {
      state.photos[slot] = await loadImage(URL.createObjectURL(picked));
      samplePick.value = 'none';
      repaint();
      setStatus(`Photo ${letter} loaded from your file.`);
    } catch {
      setStatus(`Photo ${letter} could not be read.`);
    }
  });
  samplePick.addEventListener('change', async () => {
    if (samplePick.value === 'none') {
      state.photos[slot] = null;
    } else {
      try {
        state.photos[slot] = await loadImage(`samples/${samplePick.value}.jpg`);
      } catch {
        setStatus(`Sample ${samplePick.value} could not be loaded.`);
        return;
      }
    }
    fileInput.value = '';
    repaint();
  });
  zoomInput.addEventListener('input', () => { state.zoom[slot] = Number(zoomInput.value); repaint(); });
  panXInput.addEventListener('input', () => { state.panX[slot] = Number(panXInput.value); repaint(); });
  panYInput.addEventListener('input', () => { state.panY[slot] = Number(panYInput.value); repaint(); });
}

/** Wires a row of option buttons to one key of the state. */
function wireOptionRow(groupId, key) {
  const group = document.getElementById(groupId);
  group.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      state[key] = button.dataset.value;
      group.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === button));
      repaint();
    });
  });
}

/** Marks the button of one option row whose value matches `value`. */
function markOptionRow(groupId, value) {
  document.querySelectorAll(`#${groupId} button`).forEach((b) =>
    b.classList.toggle('active', b.dataset.value === value));
}

[0, 1, 2].forEach(wirePhotoSlot);
wireOptionRow('layout-options', 'layout');
wireOptionRow('grade-options', 'grade');
wireOptionRow('style-options', 'titleStyle');

titleField.addEventListener('input', () => { state.title = titleField.value; repaint(); });
subtitleField.addEventListener('input', () => { state.subtitle = subtitleField.value; repaint(); });
sizeField.addEventListener('change', () => {
  state.size = sizeField.value;
  repaint();
  setStatus(`Preview is now ${SIZES[state.size].label}.`);
});
sunField.addEventListener('change', () => { state.sun = sunField.checked; repaint(); });

exportButton.addEventListener('click', () => {
  const size = SIZES[state.size];
  const out = document.createElement('canvas');
  out.width = size.w;
  out.height = size.h;
  drawCover(out, state);
  out.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed: the browser could not make the PNG.');
      return;
    }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `neon-coast-cover-${size.w}x${size.h}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
    setStatus(`Saved neon-coast-cover-${size.w}x${size.h}.png`);
  }, 'image/png');
});

const query = new URLSearchParams(location.search);
if (query.get('shot')) {
  // Screenshot mode: apply one fixed scene, then flag readiness.
  runShot(query.get('shot'), query, async (scene) => {
    state.layout = scene.layout;
    state.grade = scene.grade;
    state.title = scene.caption;
    state.subtitle = scene.subtitle;
    state.titleStyle = scene.style;
    state.sun = scene.sun;
    state.size = scene.size;
    titleField.value = scene.caption;
    subtitleField.value = scene.subtitle;
    sizeField.value = scene.size;
    sunField.checked = scene.sun;
    markOptionRow('layout-options', scene.layout);
    markOptionRow('grade-options', scene.grade);
    markOptionRow('style-options', scene.style);
    const names = [scene.photoA, scene.photoB, scene.photoC];
    state.photos = await Promise.all(names.map((name) => loadImage(`samples/${name}.jpg`)));
    names.forEach((name, slot) => {
      document.querySelector(`[data-slot="${slot}"] select`).value = name;
    });
    repaint();
  });
} else {
  // First paint already shows the poster: preload the two samples.
  Promise.all([loadImage('samples/pier.jpg'), loadImage('samples/boulevard.jpg')])
    .then(([pier, boulevard]) => {
      state.photos = [pier, boulevard, pier];
      document.querySelector('[data-slot="0"] select').value = 'pier';
      document.querySelector('[data-slot="1"] select').value = 'boulevard';
      document.querySelector('[data-slot="2"] select').value = 'pier';
      repaint();
    })
    .catch(() => repaint());
  repaint();
}
