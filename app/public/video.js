// Entfernt den Ton aus Videos direkt auf dem Handy (ffmpeg.wasm, kostenlos, kein Upload an fremde Dienste).
// Das Bild wird nicht neu berechnet (Stream-Kopie) – schnell und ohne Qualitätsverlust.
import { FFmpeg } from './vendor/ffmpeg/index.js';
import { toBlobURL, fetchFile } from './vendor/util/index.js';

const CORE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
let ffPromise = null;

function load() {
  if (!ffPromise) {
    ffPromise = (async () => {
      const ff = new FFmpeg();
      await ff.load({
        coreURL: await toBlobURL(`${CORE}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${CORE}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      return ff;
    })().catch(e => { ffPromise = null; throw e; });
  }
  return ffPromise;
}

/** Prüft zwei Einzelbilder: liegt ein Gesicht auf dem Kopf? (gleiche Erkennung wie bei Fotos) */
async function upsideDown(file) {
  try {
    const { uprightCanvas } = await import('./retouch.js');
    for (const t of [1, 2.5]) {
      const blob = await frameFromVideo(file, t);
      if (!blob) continue;
      const img = await createImageBitmap(blob);
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      if (await uprightCanvas(c) !== c) return true;
    }
  } catch { /* Erkennung nicht verfügbar → Video unverändert lassen */ }
  return false;
}

export const TRACKS = [
  { id: 'ruhe', name: 'Ruhe' }, { id: 'seide', name: 'Seide' }, { id: 'morgenlicht', name: 'Morgenlicht' }, { id: 'glow', name: 'Glow' },
];

/**
 * Entfernt den Originalton. Optional wird eigene, lizenzfreie NMY-Musik unterlegt (eingeblendet, ausgeblendet).
 * @param {{music?: string|null, duration?: number}} opts
 * @returns {Promise<File>} MP4 ohne Originalton
 */
export async function muteVideo(file, onStatus = () => {}, { music = null, duration = null } = {}) {
  onStatus('Videowerkzeug wird geladen …');
  const ff = await load();
  const ext = /quicktime|\.mov$/i.test(file.type || file.name) ? 'mov' : 'mp4';
  const input = `in.${ext}`;
  onStatus('Ton wird entfernt …');
  await ff.writeFile(input, await fetchFile(file));
  // Video-Codec erkennen (HEVC braucht für Instagram/iPhone das Kennzeichen hvc1)
  let info = '';
  const onLog = ({ message }) => { info += message + '\n'; };
  ff.on('log', onLog);
  await ff.exec(['-hide_banner', '-i', input]).catch(() => {});
  const hevc = /Video:\s*hevc/i.test(info);
  info = '';
  // Auf dem Kopf gefilmt (Kamera an der Kopfseite der Liege)? Dann um 180° drehen – sonst verlustfreie Stream-Kopie.
  const flip = await upsideDown(file);
  if (flip) onStatus('Video wird gedreht …');
  const code = flip
    ? await ff.exec(['-i', input, '-map', '0:v:0', '-vf', 'hflip,vflip', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', 'out.mp4'])
    : await ff.exec(['-i', input, '-map', '0:v:0', '-c:v', 'copy', ...(hevc ? ['-tag:v', 'hvc1'] : []), '-an', '-movflags', '+faststart', 'out.mp4']);
  ff.off('log', onLog);
  if (code !== 0) throw new Error('Ton konnte nicht entfernt werden');
  let data = await ff.readFile('out.mp4');
  // Prüfen: keine Tonspur mehr vorhanden (vor dem Unterlegen der Musik)
  let check = '';
  const onCheck = ({ message }) => { check += message + '\n'; };
  ff.on('log', onCheck);
  await ff.exec(['-hide_banner', '-i', 'out.mp4']).catch(() => {});
  ff.off('log', onCheck);
  if (/Audio:/i.test(check)) throw new Error('Tonspur noch vorhanden');
  if (music) {
    onStatus('Musik wird unterlegt …');
    await ff.writeFile('music.m4a', await fetchFile(`/musik/${music}.m4a`));
    const d = Number(duration) || 15;
    const fade = `afade=t=in:d=0.8,afade=t=out:st=${Math.max(0.5, d - 1.5).toFixed(2)}:d=1.5`;
    const mc = await ff.exec(['-i', 'out.mp4', '-stream_loop', '-1', '-i', 'music.m4a', '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
      '-c:a', 'aac', '-b:a', '128k', '-af', fade, '-shortest', '-movflags', '+faststart', 'final.mp4']);
    if (mc !== 0) throw new Error('Musik konnte nicht unterlegt werden');
    data = await ff.readFile('final.mp4');
    await ff.deleteFile('final.mp4').catch(() => {});
    await ff.deleteFile('music.m4a').catch(() => {});
  }
  const result = new File([data.slice()], music ? 'video-mit-musik.mp4' : 'video-ohne-ton.mp4', { type: 'video/mp4' }); // Kopie
  await ff.deleteFile(input).catch(() => {});
  await ff.deleteFile('out.mp4').catch(() => {});
  if (!result.size) throw new Error('Leeres Video');
  return result;
}

// ---------- Vorher → Nachher-Reel aus zwei Videos ----------
// Neuer Look (wie Buchungsseite & Beiträge): Archivo Black für Titel, Arimo/Helvetica für Text, Pillen-Schilder, neues Logo
const HEAD_FONT = '"Archivo Black", "Helvetica Neue", Arial, sans-serif';
const TEXT_FONT = 'Arimo, "Helvetica Neue", Helvetica, Arial, sans-serif';
let logoImg = null;
async function loadLogo() {
  if (!logoImg) logoImg = new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = '/logo-light.png'; });
  return logoImg;
}
async function loadFonts() { await Promise.all([document.fonts.load(`400 80px ${HEAD_FONT}`), document.fonts.load(`400 30px ${TEXT_FONT}`)]).catch(() => {}); }
function pillPath(g, x, y, w, h) { const r = h / 2; g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
async function drawLogo(g) {
  const logo = await loadLogo(); if (!logo) return;
  const h = 96, w = logo.width * h / logo.height;
  g.save(); g.shadowColor = 'rgba(0,0,0,0.25)'; g.shadowBlur = 14; g.drawImage(logo, 64, 210, w, h); g.restore();  // unterhalb der Instagram-Profilzeile
}

/** Beschriftung (transparentes PNG 1080x1920): Pillen-Schild unten links + Logo oben */
export async function labelPng(text) {
  await loadFonts();
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
  const g = c.getContext('2d');
  const label = text.toUpperCase();
  g.font = `400 32px ${TEXT_FONT}`;
  g.letterSpacing = '2px';
  const w = g.measureText(label).width + 64, x = 64, y = 1920 - 340, h = 72;
  g.fillStyle = 'rgba(241,240,237,0.95)'; pillPath(g, x, y, w, h); g.fill();
  g.fillStyle = '#3B3834'; g.textBaseline = 'middle'; g.fillText(label, x + 32, y + h / 2 + 1);
  await drawLogo(g);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Setzt Vorher- und Nachher-Video zu einem Reel zusammen (9:16, 30 fps, weicher Übergang, Beschriftung, ohne Originalton).
 * @returns {Promise<{file: File, duration: number}>}
 */
export async function combineBeforeAfter(before, after, { durBefore, durAfter, afterLabel = 'Direkt danach', music = null, text = '', label = '' } = {}, onStatus = () => {}) {
  onStatus('Videowerkzeug wird geladen …');
  const ff = await load();
  const tb = Math.max(2, Math.min(Number(durBefore) || 6, 12));
  const ta = Math.max(3, Math.min(Number(durAfter) || 8, 15));
  const fade = 0.4;
  await ff.writeFile('b.in', await fetchFile(before));
  await ff.writeFile('a.in', await fetchFile(after));
  await ff.writeFile('tb.png', await labelPng('Vorher'));
  await ff.writeFile('ta.png', await labelPng(afterLabel));
  const withText = !!String(text || '').trim();
  if (withText) await ff.writeFile('ov.png', await overlayPng(text, label));
  const total = tb + ta - fade;
  const onProg = ({ time }) => { if (time > 0) onStatus(`Vorher → Nachher wird erstellt … ${Math.min(99, Math.round((time / 1e6 / total) * 100))} %`); };
  ff.on('progress', onProg);
  const fit = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p';
  const filter = [
    `[0:v]trim=0:${tb},setpts=PTS-STARTPTS,${fit}[b0]`, '[b0][2:v]overlay=0:0[b1]',
    `[1:v]trim=0:${ta},setpts=PTS-STARTPTS,${fit}[a0]`, '[a0][3:v]overlay=0:0[a1]',
    withText
      ? `[b1][a1]xfade=transition=fade:duration=${fade}:offset=${(tb - fade).toFixed(2)},format=yuv420p[x];[4:v]format=rgba,fade=in:st=0.2:d=0.5:alpha=1,fade=out:st=3.6:d=0.5:alpha=1[ov];[x][ov]overlay=0:0:eof_action=pass,format=yuv420p[v]`
      : `[b1][a1]xfade=transition=fade:duration=${fade}:offset=${(tb - fade).toFixed(2)},format=yuv420p[v]`,
  ].join(';');
  onStatus('Vorher → Nachher wird erstellt …');
  const code = await ff.exec(['-i', 'b.in', '-i', 'a.in', '-i', 'tb.png', '-i', 'ta.png', ...(withText ? ['-loop', '1', '-t', '4.2', '-i', 'ov.png'] : []), '-filter_complex', filter, '-map', '[v]',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '21', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', 'ba.mp4']);
  ff.off('progress', onProg);
  for (const f of ['b.in', 'a.in', 'tb.png', 'ta.png', 'ov.png']) await ff.deleteFile(f).catch(() => {});
  if (code !== 0) throw new Error('Vorher/Nachher-Video konnte nicht erstellt werden');
  const data = await ff.readFile('ba.mp4');
  await ff.deleteFile('ba.mp4').catch(() => {});
  let file = new File([data.slice()], 'vorher-nachher.mp4', { type: 'video/mp4' });
  if (music) file = await muteVideo(file, onStatus, { music, duration: total }); // Musik unterlegen
  return { file, duration: total };
}

// ---------- Schrift im Video & Startbild ----------
function wrapLines(g, text, maxW) {
  const words = String(text).replace(/_/g, '').split(/\s+/); const lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

/** Hook-Text als transparentes PNG (1080x1920), im oberen Drittel – innerhalb des Bereichs, den Instagram anzeigt */
export async function overlayPng(text, label = '') {
  await loadFonts();
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
  const g = c.getContext('2d');
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  let y = 520;
  if (label) {
    g.font = `400 28px ${TEXT_FONT}`; g.letterSpacing = '2px';
    const t = label.toUpperCase(), w = g.measureText(t).width + 56;
    g.save(); g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 12;
    pillPath(g, 64, y - 46, w, 62); g.lineWidth = 2.5; g.strokeStyle = '#fff'; g.stroke();
    g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(t, 92, y - 14); g.restore(); g.textBaseline = 'alphabetic'; y += 100;
  }
  g.letterSpacing = '-3px';
  g.font = `400 92px ${HEAD_FONT}`; g.fillStyle = '#fff';
  g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 26; g.shadowOffsetY = 2;
  for (const l of wrapLines(g, text, 950)) { g.fillText(l, 64, y); y += 96; }
  g.shadowColor = 'transparent'; g.letterSpacing = '0px';
  await drawLogo(g);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

/** Einzelvideo: ins Reel-Format bringen, Hook-Text einblenden, Originalton entfernen (optional Musik) */
export async function videoWithText(file, { text, label = '', duration = null, music = null } = {}, onStatus = () => {}) {
  if (!String(text || '').trim()) return muteVideo(file, onStatus, { music, duration });
  onStatus('Videowerkzeug wird geladen …');
  const ff = await load();
  const d = Math.min(Number(duration) || 15, 90);
  await ff.writeFile('s.in', await fetchFile(file));
  await ff.writeFile('ov.png', await overlayPng(text, label));
  const onProg = ({ time }) => { if (time > 0) onStatus(`Schrift wird eingefügt … ${Math.min(99, Math.round((time / 1e6 / d) * 100))} %`); };
  ff.on('progress', onProg);
  const filter = `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p[v0];` +
    `[1:v]format=rgba,fade=in:st=0.2:d=0.5:alpha=1,fade=out:st=3.6:d=0.5:alpha=1[ov];[v0][ov]overlay=0:0:eof_action=pass,format=yuv420p[v]`;
  onStatus('Schrift wird eingefügt …');
  const code = await ff.exec(['-i', 's.in', '-loop', '1', '-t', '4.2', '-i', 'ov.png', '-filter_complex', filter, '-map', '[v]', '-t', String(d),
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '21', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', 'tx.mp4']);
  ff.off('progress', onProg);
  await ff.deleteFile('s.in').catch(() => {}); await ff.deleteFile('ov.png').catch(() => {});
  if (code !== 0) throw new Error('Schrift konnte nicht eingefügt werden');
  const data = await ff.readFile('tx.mp4'); await ff.deleteFile('tx.mp4').catch(() => {});
  let out = new File([data.slice()], 'video-mit-text.mp4', { type: 'video/mp4' });
  if (music) out = await muteVideo(out, onStatus, { music, duration: d });
  return out;
}

/** Standbild aus einem Video (für das Startbild), als JPEG */
export async function frameFromVideo(file, atSec = 1) {
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = URL.createObjectURL(file);
  await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error('Video nicht lesbar')); setTimeout(res, 8000); });
  const d = v.duration || 2;
  const c = document.createElement('canvas'); c.width = v.videoWidth || 1080; c.height = v.videoHeight || 1920;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  // Mehrere Zeitpunkte probieren: schwarze Bilder (noch nicht dekodiert / Abblende) werden übersprungen
  for (const at of [atSec, atSec + 0.8, d / 2, d * 0.7]) {
    const t = Math.min(Math.max(0.1, at), Math.max(0.1, d - 0.2));
    await new Promise(res => { v.onseeked = res; v.currentTime = t; setTimeout(res, 5000); });
    await new Promise(res => (v.requestVideoFrameCallback ? v.requestVideoFrameCallback(() => res()) : setTimeout(res, 150)) && setTimeout(res, 600));
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const px = ctx.getImageData(0, 0, c.width, c.height).data;
    let sum = 0, n = 0;
    for (let i = 0; i < px.length; i += 4 * 997) { sum += px[i] + px[i + 1] + px[i + 2]; n++; }
    if (sum / (n * 3) > 14) break;
  }
  URL.revokeObjectURL(v.src);
  return new Promise(r => c.toBlob(r, 'image/jpeg', 0.92));
}
