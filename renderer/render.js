// Rendert Karussells & Stories im NMY-Brand-Stil als PNG (1080x1350 / 1080x1920).
// Aufruf: node renderer/render.js content/<datei>.json [ausgabeordner]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const SIZES = { post: [1080, 1350], story: [1080, 1920] };
// Schriften lokal einbetten (keine Abhängigkeit von Google Fonts beim Rendern)
const fontCss = fs.readFileSync(path.join(__dirname, 'fonts/fonts.css'), 'utf8')
  .replace(/url\('fonts\/(.+?)'\)/g, (_, f) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(__dirname, 'fonts', f)).toString('base64')})`);
const css = fontCss + fs.readFileSync(path.join(__dirname, 'templates/brand.css'), 'utf8');

const esc = (s = '') => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// **fett** im Fließtext erlauben
const rich = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

const logo = `<div class="logo"><span class="nmy">NMY</span><span class="script">Cosmetics</span></div>`;
const pill = (t = 'Swipe') => `<div class="pill">${esc(t)}<span class="arrow"></span></div>`;

function slideHtml(s, i, total, label) {
  const page = `<span class="page">${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span>`;
  switch (s.type) {
    case 'cover':
      return `<div class="label">${esc(s.label || label)}</div>
        <div class="spacer"></div>
        <h1 class="headline ${s.size || 'xl'}">${rich(s.headline)}</h1>
        <div class="spacer"></div>
        <div style="display:flex;justify-content:flex-end">${pill(s.pill)}</div>
        <div class="bottom" style="margin-top:56px">${logo}</div>`;
    case 'text':
      return `<div class="label">${esc(s.label || label)}</div>
        <div class="spacer"></div>
        <h2 class="headline ${s.size || 'l'}">${rich(s.headline)}</h2>
        <div class="rule"></div>
        <p class="body">${rich(s.body)}</p>
        <div class="spacer"></div>
        <div class="bottom">${logo}${page}</div>`;
    case 'list':
      return `<div class="label">${esc(s.label || label)}</div>
        <h2 class="headline m" style="margin-top:80px">${rich(s.headline)}</h2>
        <div class="rule"></div>
        <ul class="list">${s.items.map((it, n) => `<li><span class="num">${n + 1}</span><span class="t"><b>${esc(it.title)}</b>${rich(it.text)}</span></li>`).join('')}</ul>
        <div class="bottom">${logo}${page}</div>`;
    case 'facts':
      return `<div class="label">${esc(s.label || label)}</div>
        <h2 class="headline m" style="margin-top:80px;margin-bottom:64px">${rich(s.headline)}</h2>
        <div class="facts">${s.items.map(f => `<div><span>${esc(f.k)}</span><em>${esc(f.v)}</em></div>`).join('')}</div>
        ${s.note ? `<p class="body" style="margin-top:44px;font-size:32px">${rich(s.note)}</p>` : ''}
        <div class="bottom">${logo}${page}</div>`;
    case 'cta':
      return `<div class="label">${esc(s.label || label)}</div>
        <div class="spacer"></div>
        <h2 class="headline l">${rich(s.headline)}</h2>
        <div class="rule"></div>
        <p class="body">${rich(s.body)}</p>
        <div style="margin-top:64px">${pill(s.pill || 'Termin buchen')}</div>
        <div class="spacer"></div>
        <div class="bottom">${logo}${page}</div>`;
    case 'story':
      return `<div style="height:120px"></div>
        <div class="label">${esc(s.label || label)}</div>
        <div class="spacer"></div>
        <h1 class="headline xl">${rich(s.headline)}</h1>
        <div class="rule"></div>
        <p class="body">${rich(s.body)}</p>
        <div class="spacer"></div>
        <div style="display:flex;justify-content:center">${pill(s.pill || 'Link in der Bio')}</div>
        <div class="bottom" style="justify-content:center;margin:90px 0 140px">${logo}</div>`;
    default:
      throw new Error('Unbekannter Folientyp: ' + s.type);
  }
}

async function render(contentFile, outDir) {
  const job = JSON.parse(fs.readFileSync(contentFile, 'utf8'));
  const [w, h] = SIZES[job.format || 'post'];
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const files = [];
  for (const [i, s] of job.slides.entries()) {
    const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>:root{--w:${w}px;--h:${h}px}${css}</style></head>
      <body><div class="frame">${slideHtml(s, i, job.slides.length, job.label)}</div></body></html>`;
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(outDir, `${job.id}-${String(i + 1).padStart(2, '0')}.png`);
    await page.screenshot({ path: file });
    files.push(file);
  }
  await browser.close();
  return files;
}

if (require.main === module) {
  const [, , contentFile, outDir = path.join(__dirname, '..', 'output')] = process.argv;
  render(contentFile, outDir).then(f => console.log(f.join('\n'))).catch(e => { console.error(e); process.exit(1); });
}
module.exports = { render };
