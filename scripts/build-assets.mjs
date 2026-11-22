// Erzeugt shared/brand-assets.gen.mjs: Schriften (latin, dedupliziert) + Logos + Brand-CSS als Strings.
// Wird von Node-Renderer und Cloudflare Worker gemeinsam genutzt. Aufruf: node scripts/build-assets.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const fontsDir = path.join(root, 'renderer/fonts');
const css = fs.readFileSync(path.join(fontsDir, 'fonts.css'), 'utf8');
const faces = [...css.matchAll(/@font-face \{([\s\S]*?)\}/g)].map(m => m[1]);
const groups = new Map();
for (const f of faces) {
  const file = f.match(/url\('fonts\/(.+?)'\)/)[1];
  if (!file.includes('-latin.')) continue; // Umlaute liegen im latin-Bereich
  const family = f.match(/font-family: '(.+?)'/)[1];
  const weight = +f.match(/font-weight: (\d+)/)[1];
  const buf = fs.readFileSync(path.join(fontsDir, file));
  const key = family + crypto.createHash('md5').update(buf).digest('hex');
  const g = groups.get(key) || { family, weights: [], buf, range: f.match(/unicode-range: (.+?);/)[1] };
  g.weights.push(weight);
  groups.set(key, g);
}
const fontCss = [...groups.values()].map(g => {
  const w = g.weights.length > 1 ? `${Math.min(...g.weights)} ${Math.max(...g.weights)}` : g.weights[0];
  return `@font-face{font-family:'${g.family}';font-style:normal;font-weight:${w};font-display:block;src:url(data:font/woff2;base64,${g.buf.toString('base64')}) format('woff2');unicode-range:${g.range};}`;
}).join('\n');

const b64 = p => fs.readFileSync(path.join(root, p)).toString('base64');
const out = `// AUTOMATISCH ERZEUGT von scripts/build-assets.mjs – nicht von Hand bearbeiten.
export const FONT_CSS = ${JSON.stringify(fontCss)};
export const BRAND_CSS = ${JSON.stringify(fs.readFileSync(path.join(root, 'renderer/templates/brand.css'), 'utf8'))};
export const LOGO_DARK = 'data:image/png;base64,${b64('renderer/assets/logo-dark.png')}';
export const LOGO_LIGHT = 'data:image/png;base64,${b64('renderer/assets/logo-light.png')}';
`;
fs.writeFileSync(path.join(root, 'shared/brand-assets.gen.mjs'), out);
console.log('brand-assets.gen.mjs:', (out.length / 1024).toFixed(0), 'KB,', groups.size, 'Schriftdateien');
