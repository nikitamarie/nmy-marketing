// Rendert Karussells & Stories lokal als PNG (nutzt dieselben Vorlagen wie die App).
// Aufruf: node renderer/render.mjs content/<datei>.json [ausgabeordner]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // CommonJS-Paket, auch global installiert
import { buildSlideDocs, SIZES } from '../shared/slides.mjs';

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

export async function render(contentFile, outDir) {
  const job = JSON.parse(fs.readFileSync(contentFile, 'utf8'));
  const [w, h] = SIZES[job.format || 'post'];
  const base = path.dirname(path.resolve(contentFile));
  const img = p => `data:${MIME[path.extname(p).toLowerCase()] || 'image/jpeg'};base64,${fs.readFileSync(path.resolve(base, p)).toString('base64')}`;
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const files = [];
  for (const [i, html] of buildSlideDocs(job, img).entries()) {
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(outDir, `${job.id}-${String(i + 1).padStart(2, '0')}.png`);
    await page.screenshot({ path: file });
    files.push(file);
  }
  await browser.close();
  return files;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , contentFile, outDir = 'output'] = process.argv;
  render(contentFile, outDir).then(f => console.log(f.join('\n'))).catch(e => { console.error(e); process.exit(1); });
}
