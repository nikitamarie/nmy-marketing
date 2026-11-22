// Die Handy-App wird direkt aus dem Worker ausgeliefert.
import indexHtml from '../public/index.html';
import styleCss from '../public/style.css';
import appJs from '../public/app.js';
import photoJs from '../public/photo.js';
import swJs from '../public/sw.js';
import manifest from '../public/manifest.webmanifest';
import icon192 from '../public/icon-192.png';
import icon512 from '../public/icon-512.png';
import appleIcon from '../public/apple-touch-icon.png';
import playfair from '../public/fonts/playfair.woff2';
import montserrat from '../public/fonts/montserrat.woff2';

// Versionsnummer aus dem Inhalt: Bei jeder Änderung lädt das Handy automatisch die neue App
function hash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
const V = hash(appJs + photoJs + styleCss);
const page = indexHtml.replace('/style.css', `/style.css?v=${V}`).replace('/app.js', `/app.js?v=${V}`);
const appJsV = appJs.replace("from './photo.js'", `from './photo.js?v=${V}'`);

const FILES = {
  '/': [page, 'text/html; charset=utf-8', 'no-store'],
  '/index.html': [page, 'text/html; charset=utf-8', 'no-cache'],
  '/style.css': [styleCss, 'text/css; charset=utf-8', 'no-cache'],
  '/app.js': [appJsV, 'text/javascript; charset=utf-8', 'no-cache'],
  '/photo.js': [photoJs, 'text/javascript; charset=utf-8', 'no-cache'],
  '/sw.js': [swJs, 'text/javascript; charset=utf-8', 'no-cache'],
  '/manifest.webmanifest': [manifest, 'application/manifest+json', 'max-age=86400'],
  '/icon-192.png': [icon192, 'image/png', 'max-age=604800'],
  '/icon-512.png': [icon512, 'image/png', 'max-age=604800'],
  '/apple-touch-icon.png': [appleIcon, 'image/png', 'max-age=604800'],
  '/fonts/playfair.woff2': [playfair, 'font/woff2', 'max-age=31536000'],
  '/fonts/montserrat.woff2': [montserrat, 'font/woff2', 'max-age=31536000'],
};

export function serveStatic(url) {
  const f = FILES[url.pathname];
  if (!f) return new Response('Nicht gefunden', { status: 404 });
  return new Response(f[0], { headers: { 'content-type': f[1], 'cache-control': f[2], 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin' } });
}
