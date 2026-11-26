// Die Handy-App wird direkt aus dem Worker ausgeliefert.
import indexHtml from '../public/index.html';
import styleCss from '../public/style.css';
import appJs from '../public/app.js';
import photoJs from '../public/photo.js';
import retouchJs from '../public/retouch.js';
import videoJs from '../public/video.js';
import ffIndex from '../public/vendor/ffmpeg/index.js';
import ffClasses from '../public/vendor/ffmpeg/classes.js';
import ffConst from '../public/vendor/ffmpeg/const.js';
import ffErrors from '../public/vendor/ffmpeg/errors.js';
import ffTypes from '../public/vendor/ffmpeg/types.js';
import ffUtils from '../public/vendor/ffmpeg/utils.js';
import ffWorker from '../public/vendor/ffmpeg/worker.js';
import utIndex from '../public/vendor/util/index.js';
import utConst from '../public/vendor/util/const.js';
import utErrors from '../public/vendor/util/errors.js';
import utTypes from '../public/vendor/util/types.js';
import swJs from '../public/sw.js';
import manifest from '../public/manifest.webmanifest';
import icon192 from '../public/icon-192.png';
import icon512 from '../public/icon-512.png';
import appleIcon from '../public/apple-touch-icon.png';
import logoPng from '../public/logo.png';
import playfair from '../public/fonts/playfair.woff2';
import montserrat from '../public/fonts/montserrat.woff2';
import allura from '../public/fonts/allura.woff2';
import hanken from '../public/fonts/hanken.woff2';
import instrument from '../public/fonts/instrument.woff2';
import instrumentItalic from '../public/fonts/instrument-italic.woff2';
import archivoBlack from '../public/fonts/archivo-black.woff2';
import arimo from '../public/fonts/arimo.woff2';
import arimoBold from '../public/fonts/arimo-bold.woff2';

// Versionsnummer aus dem Inhalt: Bei jeder Änderung lädt das Handy automatisch die neue App
function hash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
const V = hash(appJs + photoJs + retouchJs + videoJs + styleCss);
const page = indexHtml.replace('/style.css', `/style.css?v=${V}`).replace('/app.js', `/app.js?v=${V}`);
const appJsV = appJs.replace("from './photo.js'", `from './photo.js?v=${V}'`).replace("from './video.js'", `from './video.js?v=${V}'`);
const photoJsV = photoJs.replace("from './retouch.js'", `from './retouch.js?v=${V}'`);

const FILES = {
  '/': [page, 'text/html; charset=utf-8', 'no-store'],
  '/index.html': [page, 'text/html; charset=utf-8', 'no-cache'],
  '/style.css': [styleCss, 'text/css; charset=utf-8', 'no-cache'],
  '/app.js': [appJsV, 'text/javascript; charset=utf-8', 'no-cache'],
  '/photo.js': [photoJsV, 'text/javascript; charset=utf-8', 'no-cache'],
  '/retouch.js': [retouchJs, 'text/javascript; charset=utf-8', 'no-cache'],
  '/video.js': [videoJs, 'text/javascript; charset=utf-8', 'no-cache'],
  ...Object.fromEntries(Object.entries({
    'ffmpeg/index.js': ffIndex, 'ffmpeg/classes.js': ffClasses, 'ffmpeg/const.js': ffConst, 'ffmpeg/errors.js': ffErrors,
    'ffmpeg/types.js': ffTypes, 'ffmpeg/utils.js': ffUtils, 'ffmpeg/worker.js': ffWorker,
    'util/index.js': utIndex, 'util/const.js': utConst, 'util/errors.js': utErrors, 'util/types.js': utTypes,
  }).map(([k, v]) => [`/vendor/${k}`, [v, 'text/javascript; charset=utf-8', 'max-age=604800']])),
  '/sw.js': [swJs, 'text/javascript; charset=utf-8', 'no-cache'],
  '/manifest.webmanifest': [manifest, 'application/manifest+json', 'max-age=86400'],
  '/icon-192.png': [icon192, 'image/png', 'max-age=604800'],
  '/icon-512.png': [icon512, 'image/png', 'max-age=604800'],
  '/apple-touch-icon.png': [appleIcon, 'image/png', 'max-age=604800'],
  '/logo.png': [logoPng, 'image/png', 'max-age=86400'],
  '/fonts/playfair.woff2': [playfair, 'font/woff2', 'max-age=31536000'],
  '/fonts/montserrat.woff2': [montserrat, 'font/woff2', 'max-age=31536000'],
  '/fonts/allura.woff2': [allura, 'font/woff2', 'max-age=31536000'],
  '/fonts/hanken.woff2': [hanken, 'font/woff2', 'max-age=31536000'],
  '/fonts/instrument.woff2': [instrument, 'font/woff2', 'max-age=31536000'],
  '/fonts/instrument-italic.woff2': [instrumentItalic, 'font/woff2', 'max-age=31536000'],
  '/fonts/archivo-black.woff2': [archivoBlack, 'font/woff2', 'max-age=31536000'],
  '/fonts/arimo.woff2': [arimo, 'font/woff2', 'max-age=31536000'],
  '/fonts/arimo-bold.woff2': [arimoBold, 'font/woff2', 'max-age=31536000'],
};

export function serveStatic(url) {
  const f = FILES[url.pathname];
  if (!f) return new Response('Nicht gefunden', { status: 404 });
  return new Response(f[0], { headers: { 'content-type': f[1], 'cache-control': f[2], 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin' } });
}
