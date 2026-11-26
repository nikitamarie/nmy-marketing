// Profi-Look direkt auf dem Handy (kein Upload an fremde Dienste):
//  - Gesichtserkennung (MediaPipe, läuft lokal im Browser) -> Maske "nur Haut"
//  - Behandelte Zonen (Brauen / Lippen / Augen) werden NIE geglättet – das Ergebnis bleibt echt
//  - Dezente Hautglättung mit Struktur-Erhalt (Guided Filter), leichte Rauschminderung,
//    Schärfe für Details, sanfte Vignette
// Rechtlicher Hintergrund: Ergebnisbilder dürfen nicht beschönigt werden (UWG). Deshalb ist
// die behandelte Stelle immer ausgenommen und bei Microneedling (Haut = Ergebnis) wird nicht geglättet.

const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// Welche Zonen pro Behandlung geschützt sind
const PROTECT = {
  'powder-brows': ['brows', 'eyes'],
  'browlifting': ['brows', 'eyes'],
  'lip-blush': ['lips'],
  'lashlifting': ['eyes', 'brows'],
  'microneedling': null, // keine Glättung
  portrait: [],          // Fotos von Nikita: Haut dezent glätten, Augen/Lippen bleiben scharf
  studio: null,          // Raumfotos: nur Licht & Schärfe
};

// Stärke der Hautglättung (0..1). 0.42 = dezent, Sommersprossen und Poren bleiben sichtbar.
const STRENGTH = 0.42;

let landmarkerPromise = null;
function loadLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import(`${MP}/vision_bundle.mjs`);
      const fileset = await FilesetResolver.forVisionTasks(`${MP}/wasm`);
      const lm = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' }, runningMode: 'IMAGE', numFaces: 1,
      });
      return { lm, FaceLandmarker };
    })().catch(e => { landmarkerPromise = null; throw e; });
  }
  return landmarkerPromise;
}

/** Gesicht suchen – auch wenn die Kundin liegt (Bild in 90°-Schritten drehen) */
async function detectFace(canvas) {
  const { lm, FaceLandmarker } = await loadLandmarker();
  const W = canvas.width, H = canvas.height;
  const scale = Math.min(1, 640 / Math.max(W, H));
  for (const k of [0, 1, 3, 2]) {
    const rot = document.createElement('canvas');
    const sw = Math.round(W * scale), sh = Math.round(H * scale);
    rot.width = k % 2 ? sh : sw; rot.height = k % 2 ? sw : sh;
    const c = rot.getContext('2d');
    c.translate(rot.width / 2, rot.height / 2); c.rotate((k * Math.PI) / 2); c.drawImage(canvas, -sw / 2, -sh / 2, sw, sh);
    const res = lm.detect(rot);
    const pts = res.faceLandmarks?.[0];
    if (!pts) continue;
    // zurück in Original-Koordinaten
    const back = pts.map(p => {
      const x = p.x * rot.width - rot.width / 2, y = p.y * rot.height - rot.height / 2;
      const a = (-k * Math.PI) / 2;
      return { x: (x * Math.cos(a) - y * Math.sin(a) + sw / 2) / scale, y: (x * Math.sin(a) + y * Math.cos(a) + sh / 2) / scale };
    });
    return { pts: back, FaceLandmarker, k };
  }
  return null;
}

/** Steht das Gesicht auf dem Kopf (Foto von der Kopfseite der Liege)? Dann Bild um 180° drehen – das Ergebnis bleibt unverändert. */
export async function uprightCanvas(canvas) {
  let face = null;
  try { face = await detectFace(canvas); } catch { return canvas; }
  if (!face || face.k !== 2) return canvas;
  const out = document.createElement('canvas'); out.width = canvas.width; out.height = canvas.height;
  const c = out.getContext('2d', { willReadFrequently: true });
  c.translate(out.width, out.height); c.rotate(Math.PI); c.drawImage(canvas, 0, 0);
  return out;
}

function hull(points) {
  const p = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [], upper = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), q) <= 0) lower.pop(); lower.push(q); }
  for (const q of p.reverse()) { while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), q) <= 0) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function idx(conns) { return [...new Set(conns.flatMap(c => [c.start, c.end]))]; }

/** Maske 0..1: 1 = Haut, die geglättet werden darf */
function skinMask(face, W, H, protect) {
  const { pts, FaceLandmarker: F } = face;
  const m = document.createElement('canvas'); m.width = W; m.height = H;
  const c = m.getContext('2d');
  const poly = (ids, grow = 1) => {
    const h = hull(ids.map(i => pts[i]));
    const cx = h.reduce((s, p) => s + p.x, 0) / h.length, cy = h.reduce((s, p) => s + p.y, 0) / h.length;
    c.beginPath(); h.forEach((p, i) => { const x = cx + (p.x - cx) * grow, y = cy + (p.y - cy) * grow; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); c.fill();
  };
  const oval = idx(F.FACE_LANDMARKS_FACE_OVAL);
  const faceW = Math.max(...oval.map(i => pts[i].x)) - Math.min(...oval.map(i => pts[i].x));
  c.fillStyle = '#fff'; poly(oval, 0.97);
  c.fillStyle = '#000';
  const zones = {
    brows: [F.FACE_LANDMARKS_LEFT_EYEBROW, F.FACE_LANDMARKS_RIGHT_EYEBROW],
    eyes: [F.FACE_LANDMARKS_LEFT_EYE, F.FACE_LANDMARKS_RIGHT_EYE],
    lips: [F.FACE_LANDMARKS_LIPS],
  };
  // Augen und Lippen immer etwas schützen (Wimpern, Lippenkontur bleiben scharf); behandelte Zonen großzügig
  const always = { eyes: 1.35, lips: 1.15, brows: 1.0 };
  for (const [zone, sets] of Object.entries(zones)) {
    const treated = protect.includes(zone);
    const grow = treated ? (zone === 'brows' ? 1.9 : 1.6) : always[zone];
    if (!treated && zone === 'brows') { for (const s of sets) poly(idx(s), 1.5); continue; }
    for (const s of sets) poly(idx(s), grow);
  }
  // weiche Kanten
  const soft = document.createElement('canvas'); soft.width = W; soft.height = H;
  const sc = soft.getContext('2d'); sc.filter = `blur(${Math.max(4, Math.round(faceW * 0.025))}px)`; sc.drawImage(m, 0, 0);
  const d = sc.getImageData(0, 0, W, H).data;
  const out = new Float32Array(W * H);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4] / 255;
  return out;
}

// ---------- Bildfilter (Float32, 0..1) ----------
function boxBlur(src, W, H, r) {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  const n = 2 * r + 1;
  for (let y = 0; y < H; y++) {
    let s = 0; const o = y * W;
    for (let x = -r; x <= r; x++) s += src[o + Math.min(W - 1, Math.max(0, x))];
    for (let x = 0; x < W; x++) {
      tmp[o + x] = s / n;
      s += src[o + Math.min(W - 1, x + r + 1)] - src[o + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < W; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
    for (let y = 0; y < H; y++) {
      out[y * W + x] = s / n;
      s += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x];
    }
  }
  return out;
}

/** Kantenerhaltendes Glätten (selbstgeführter Guided Filter) */
function guided(I, W, H, r, eps) {
  const mean = boxBlur(I, W, H, r);
  const sq = new Float32Array(I.length);
  for (let i = 0; i < I.length; i++) sq[i] = I[i] * I[i];
  const meanSq = boxBlur(sq, W, H, r);
  const a = new Float32Array(I.length), b = new Float32Array(I.length);
  for (let i = 0; i < I.length; i++) {
    const v = meanSq[i] - mean[i] * mean[i];
    a[i] = v / (v + eps); b[i] = mean[i] - a[i] * mean[i];
  }
  const ma = boxBlur(a, W, H, r), mb = boxBlur(b, W, H, r);
  const q = new Float32Array(I.length);
  for (let i = 0; i < I.length; i++) q[i] = ma[i] * I[i] + mb[i];
  return q;
}

/**
 * Wendet den Profi-Look auf ein Canvas an (in-place).
 * @returns {{smoothed:boolean, face:boolean}}
 */
export async function retouch(canvas, { treatment = 'powder-brows', smooth = true } = {}) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const ch = [0, 1, 2].map(c => { const a = new Float32Array(W * H); for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + c] / 255; return a; });

  const protect = PROTECT[treatment];
  let mask = null, face = null;
  if (smooth && protect) {
    try { face = await detectFace(canvas); } catch (e) { console.warn('Gesichtserkennung nicht verfügbar:', e); }
    if (face) mask = skinMask(face, W, H, protect);
  }

  const R = Math.max(2, Math.round(Math.max(W, H) * 0.006));
  for (let c = 0; c < 3; c++) {
    const I = ch[c];
    // 1) leichte Rauschminderung überall (Handy-Fotos bei wenig Licht)
    const dn = guided(I, W, H, 2, 0.0012);
    // 2) Hautglättung nur in der Maske, Struktur bleibt teilweise erhalten
    const sm = mask ? guided(I, W, H, R, 0.003) : null;
    // 3) Detailschärfe (Unscharf maskieren) – v. a. für Brauen, Wimpern, Augen
    const bl = boxBlur(I, W, H, 1);
    for (let i = 0; i < I.length; i++) {
      let v = I[i] + (dn[i] - I[i]) * 0.5;
      const sharp = I[i] - bl[i];
      const k = mask ? mask[i] : 0;
      if (sm) v += (sm[i] - v) * k * STRENGTH;
      v += sharp * (0.35 * (1 - k) + 0.08 * k);
      I[i] = v;
    }
  }
  // 4) sanfte Vignette
  const cx = W / 2, cy = H / 2, md = Math.hypot(cx, cy);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const t = Math.hypot(x - cx, y - cy) / md;
    const f = 1 - 0.1 * t * t;
    d[i * 4] = Math.max(0, Math.min(255, ch[0][i] * f * 255 + 0.5));
    d[i * 4 + 1] = Math.max(0, Math.min(255, ch[1][i] * f * 255 + 0.5));
    d[i * 4 + 2] = Math.max(0, Math.min(255, ch[2][i] * f * 255 + 0.5));
  }
  ctx.putImageData(img, 0, 0);
  return { smoothed: !!mask, face: !!face };
}
