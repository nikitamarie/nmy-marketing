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
  const code = await ff.exec(['-i', input, '-map', '0:v:0', '-c:v', 'copy', ...(hevc ? ['-tag:v', 'hvc1'] : []), '-an', '-movflags', '+faststart', 'out.mp4']);
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
/** Beschriftung (transparentes PNG 1080x1920) im NMY-Stil: Schild unten links + kleines Logo oben */
async function labelPng(text) {
  await Promise.all([document.fonts.load('500 30px Montserrat'), document.fonts.load('700 40px "Playfair Display"')]).catch(() => {});
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
  const g = c.getContext('2d');
  const label = text.toUpperCase().split('').join(String.fromCharCode(8202)); // feiner Buchstabenabstand
  g.font = '500 34px Montserrat, Helvetica, Arial, sans-serif';
  const w = g.measureText(label).width + 64;
  const x = 64, y = 1920 - 330;
  g.fillStyle = 'rgba(241,236,232,0.94)'; g.fillRect(x, y, w, 76);
  g.fillStyle = '#4A423D'; g.textBaseline = 'middle'; g.fillText(label, x + 32, y + 40);
  g.font = '400 30px Montserrat, Helvetica, Arial, sans-serif'; g.fillStyle = 'rgba(255,255,255,0.9)';
  g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 12;
  g.fillText('NMY Cosmetics · Seevetal', 64, 150);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Setzt Vorher- und Nachher-Video zu einem Reel zusammen (9:16, 30 fps, weicher Übergang, Beschriftung, ohne Originalton).
 * @returns {Promise<{file: File, duration: number}>}
 */
export async function combineBeforeAfter(before, after, { durBefore, durAfter, afterLabel = 'Direkt danach', music = null } = {}, onStatus = () => {}) {
  onStatus('Videowerkzeug wird geladen …');
  const ff = await load();
  const tb = Math.max(2, Math.min(Number(durBefore) || 6, 12));
  const ta = Math.max(3, Math.min(Number(durAfter) || 8, 15));
  const fade = 0.4;
  await ff.writeFile('b.in', await fetchFile(before));
  await ff.writeFile('a.in', await fetchFile(after));
  await ff.writeFile('tb.png', await labelPng('Vorher'));
  await ff.writeFile('ta.png', await labelPng(afterLabel));
  const total = tb + ta - fade;
  const onProg = ({ time }) => { if (time > 0) onStatus(`Vorher → Nachher wird erstellt … ${Math.min(99, Math.round((time / 1e6 / total) * 100))} %`); };
  ff.on('progress', onProg);
  const fit = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p';
  const filter = [
    `[0:v]trim=0:${tb},setpts=PTS-STARTPTS,${fit}[b0]`, '[b0][2:v]overlay=0:0[b1]',
    `[1:v]trim=0:${ta},setpts=PTS-STARTPTS,${fit}[a0]`, '[a0][3:v]overlay=0:0[a1]',
    `[b1][a1]xfade=transition=fade:duration=${fade}:offset=${(tb - fade).toFixed(2)},format=yuv420p[v]`,
  ].join(';');
  onStatus('Vorher → Nachher wird erstellt …');
  const code = await ff.exec(['-i', 'b.in', '-i', 'a.in', '-i', 'tb.png', '-i', 'ta.png', '-filter_complex', filter, '-map', '[v]',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '21', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', 'ba.mp4']);
  ff.off('progress', onProg);
  for (const f of ['b.in', 'a.in', 'tb.png', 'ta.png']) await ff.deleteFile(f).catch(() => {});
  if (code !== 0) throw new Error('Vorher/Nachher-Video konnte nicht erstellt werden');
  const data = await ff.readFile('ba.mp4');
  await ff.deleteFile('ba.mp4').catch(() => {});
  let file = new File([data.slice()], 'vorher-nachher.mp4', { type: 'video/mp4' });
  if (music) file = await muteVideo(file, onStatus, { music, duration: total }); // Musik unterlegen
  return { file, duration: total };
}
