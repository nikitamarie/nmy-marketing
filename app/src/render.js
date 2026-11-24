// Rendert Beiträge mit Cloudflare Browser Rendering (kostenloses Kontingent) als JPEG (Instagram verlangt JPEG).
import puppeteer from '@cloudflare/puppeteer';
import { buildSlideDocs, SIZES } from '../../shared/slides.mjs';
import { arrayBufferToBase64 } from './util.js';

const IMAGE_FIELDS = ['before', 'after', 'image'];

async function loadImages(env, job) {
  const refs = new Set();
  for (const s of job.slides) for (const f of IMAGE_FIELDS) if (s[f]) refs.add(s[f]);
  const map = {};
  for (const ref of refs) {
    if (ref.startsWith('r2:')) {
      const obj = await env.MEDIA.get(ref.slice(3));
      if (!obj) throw new Error('Bilddatei fehlt: ' + ref);
      map[ref] = `data:image/jpeg;base64,${arrayBufferToBase64(await obj.arrayBuffer())}`;
      continue;
    }
    if (ref.startsWith('url:')) {
      const res = await fetch(ref.slice(4));
      if (!res.ok) throw new Error('Instagram-Bild nicht abrufbar (' + res.status + ')');
      map[ref] = `data:${res.headers.get('content-type') || 'image/jpeg'};base64,${arrayBufferToBase64(await res.arrayBuffer())}`;
      continue;
    }
    const id = ref.replace(/^media:/, '');
    const row = await env.DB.prepare('SELECT r2_key, mime FROM media WHERE id = ?').bind(id).first();
    if (!row) throw new Error('Bild nicht gefunden: ' + id);
    const obj = await env.MEDIA.get(row.r2_key);
    if (!obj) throw new Error('Bilddatei fehlt: ' + row.r2_key);
    map[ref] = `data:${row.mime || 'image/jpeg'};base64,${arrayBufferToBase64(await obj.arrayBuffer())}`;
  }
  return ref => map[ref] || '';
}

/** Rendert alle Beiträge mit Status "render" (max. `limit` pro Aufruf, eine Browser-Sitzung). */
export async function renderPending(env, limit = 4) {
  const { results } = await env.DB.prepare("SELECT * FROM posts WHERE status = 'render' AND video_key IS NULL ORDER BY created_at LIMIT ?").bind(limit).all();
  if (!results.length) return 0;
  const browser = await puppeteer.launch(env.BROWSER);
  let done = 0;
  try {
    const page = await browser.newPage();
    for (const post of results) {
      try {
        const job = JSON.parse(post.job_json);
        const [w, h] = SIZES[job.format || 'post'];
        await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
        const docs = buildSlideDocs(job, await loadImages(env, job));
        const keys = [];
        for (const [i, html] of docs.entries()) {
          await page.setContent(html, { waitUntil: 'load' });
          await page.evaluate(() => document.fonts.ready);
          const buf = await page.screenshot({ type: 'jpeg', quality: 94 });
          const key = `posts/${post.id}/${String(i + 1).padStart(2, '0')}.jpg`;
          await env.MEDIA.put(key, buf, { httpMetadata: { contentType: 'image/jpeg' } });
          keys.push(key);
        }
        await env.DB.prepare("UPDATE posts SET assets_json = ?, status = 'geplant', error = NULL WHERE id = ?").bind(JSON.stringify(keys), post.id).run();
        done++;
      } catch (e) {
        await env.DB.prepare("UPDATE posts SET status = 'fehler', error = ? WHERE id = ?").bind('Rendern: ' + e.message, post.id).run();
      }
    }
  } finally {
    await browser.close();
  }
  return done;
}
