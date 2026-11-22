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
