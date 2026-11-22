// Lichtkorrektur im Browser (gleicher Ablauf wie photo/lichtkorrektur.py):
// Weißabgleich, einheitliche Helligkeit, sanfter Kontrast, warmer Brand-Ton. Keine Retusche.
// Ergebnis: JPEG, längste Kante max. 1600 px, ohne Metadaten (kein GPS).
import { retouch } from './retouch.js';
const TARGET_MEDIAN = 0.56, WB_STRENGTH = 0.55, VIBRANCE = 1.08, WARM = [1.022, 1.0, 0.972], CONTRAST = 0.18, MAX_EDGE = 1600;

const toLin = v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const toSrgb = v => { v = Math.min(1, Math.max(0, v)); return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; };
const LIN = new Float32Array(256).map((_, i) => toLin(i / 255));

function quantile(arr, q) {
  const a = Float32Array.from(arr).sort();
  return a[Math.min(a.length - 1, Math.floor(q * a.length))];
}

function analyse(data, w, h) {
  // Statistik auf jedem n-ten Pixel (schnell auch auf dem Handy)
  const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 40000)));
  const lums = [], rgb = [];
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
    const i = (y * w + x) * 4;
    const r = LIN[data[i]], g = LIN[data[i + 1]], b = LIN[data[i + 2]];
    lums.push(0.2126 * r + 0.7152 * g + 0.0722 * b); rgb.push(r, g, b);
  }
  const lo = quantile(lums, 0.15), hi = quantile(lums, 0.95);
  let sr = 0, sg = 0, sb = 0, n = 0;
  for (let k = 0; k < lums.length; k++) if (lums[k] > lo && lums[k] < hi) { sr += rgb[3 * k]; sg += rgb[3 * k + 1]; sb += rgb[3 * k + 2]; n++; }
  const means = n ? [sr / n, sg / n, sb / n] : [1, 1, 1];
  const gray = (means[0] + means[1] + means[2]) / 3;
  const gains = means.map(m => Math.min(1.35, Math.max(0.75, 1 + (gray / Math.max(m, 1e-6) - 1) * WB_STRENGTH)));
  // Helligkeit der Bildmitte (dort liegt meist das Gesicht)
  const center = [];
  for (let y = Math.floor(h * 0.2); y < h * 0.8; y += step) for (let x = Math.floor(w * 0.2); x < w * 0.8; x += step) {
    const i = (y * w + x) * 4;
    const r = toSrgb(LIN[data[i]] * gains[0]), g = toSrgb(LIN[data[i + 1]] * gains[1]), b = toSrgb(LIN[data[i + 2]] * gains[2]);
    center.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
  }
  const med = Math.min(0.95, Math.max(0.05, quantile(center, 0.5)));
  const gamma = Math.min(1.35, Math.max(0.75, Math.log(TARGET_MEDIAN) / Math.log(med)));
  return { gains, gamma };
}

function buildLut(gain, gamma, warm) {
  // pro Kanal: 8-Bit-Eingang -> korrigierter Wert (vor Sättigung)
  const lut = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    let v = Math.pow(toSrgb(LIN[i] * gain), gamma);
    v = v + CONTRAST * v * (1 - v) * (2 * v - 1);
    if (v > 0.92) v = 0.92 + (v - 0.92) * 0.6;
    lut[i] = v * warm;
  }
  return lut;
}

export async function correctPhoto(file, { treatment, smooth = true, edit = true } = {}) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, (edit ? MAX_EDGE : 2160) / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  if (!edit) {
    // Unbearbeitet: nur verkleinern und neu speichern (entfernt Standort-/Kameradaten), Farben bleiben exakt
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.95));
    return { blob, width: w, height: h, preview: URL.createObjectURL(blob), smoothed: false, face: false, original: true };
  }
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const { gains, gamma } = analyse(d, w, h);
  const luts = [0, 1, 2].map(c => buildLut(gains[c], gamma, WARM[c]));
  for (let i = 0; i < d.length; i += 4) {
    const r = luts[0][d[i]], g = luts[1][d[i + 1]], b = luts[2][d[i + 2]];
    const m = (r + g + b) / 3;
    d[i] = Math.min(255, Math.max(0, (m + (r - m) * VIBRANCE) * 255 + 0.5));
    d[i + 1] = Math.min(255, Math.max(0, (m + (g - m) * VIBRANCE) * 255 + 0.5));
    d[i + 2] = Math.min(255, Math.max(0, (m + (b - m) * VIBRANCE) * 255 + 0.5));
  }
  ctx.putImageData(img, 0, 0);
  let info = { smoothed: false, face: false };
  try { info = await retouch(canvas, { treatment, smooth }); } catch (e) { console.warn('Retusche übersprungen:', e); }
  const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
  return { blob, width: w, height: h, preview: URL.createObjectURL(blob), ...info };
}
