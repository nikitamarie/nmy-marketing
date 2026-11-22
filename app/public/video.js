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

/** @returns {Promise<File>} MP4 ohne Tonspur */
export async function muteVideo(file, onStatus = () => {}) {
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
  const data = await ff.readFile('out.mp4');
  const result = new File([data.slice()], 'video-ohne-ton.mp4', { type: 'video/mp4' }); // Kopie: writeFile übergibt den Speicher
  await ff.deleteFile(input).catch(() => {});
  await ff.deleteFile('out.mp4').catch(() => {});
  // Prüfen: keine Tonspur mehr vorhanden
  await ff.writeFile('check.mp4', data);
  let check = '';
  const onCheck = ({ message }) => { check += message + '\n'; };
  ff.on('log', onCheck);
  await ff.exec(['-hide_banner', '-i', 'check.mp4']).catch(() => {});
  ff.off('log', onCheck);
  await ff.deleteFile('check.mp4').catch(() => {});
  if (/Audio:/i.test(check)) throw new Error('Tonspur noch vorhanden');
  if (!result.size) throw new Error('Leeres Video');
  return result;
}
