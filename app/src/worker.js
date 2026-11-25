// NMY Marketing-App – Cloudflare Worker (API, Planung, Veröffentlichung, Auswertung)
import { json, err, getSetting, setSetting, getSettings, randomToken, berlinNow, fmtBerlin } from './util.js';
import { isAuthed, login, logout, changePassword } from './auth.js';
import { createSet, uploadPhoto, mpuStart, mpuPart, mpuComplete, deleteSet, listSets, serveFile, serveSigned, storageUsed, cleanup, STORAGE_LIMIT } from './media.js';
import { planFromSet, autofill, improveCaptions } from './planner.js';
import { renderPending } from './render.js';
import { oauthStart, oauthCallback, publishDue, syncInsights, refreshTokenIfNeeded, saveManualToken, status as igStatus } from './instagram.js';
import { bioGo } from './bio.js';
import { bioPageV2, bioImage } from './biopage.js';
import { ingestBookings, pullNotifications, addBooking, deleteBooking, stats, runAnalysis, runTrends, runFilmIdeas } from './analytics.js';
import { TREATMENTS } from './brand.js';
import { appsScript } from './appsscript.js';
import { serveStatic } from './static.js';
import { createAktion, listAktionen, endAktion, suggest as suggestAktion } from './aktionen.js';
import { repostHandler, autoRepost, listIgMedia } from './repost.js';
import { processComments, listComments, deleteReply } from './comments.js';

async function listPosts(env, url) {
  const scope = url.searchParams.get('scope') || 'kommend';
  const sql = scope === 'kommend'
    ? "SELECT p.*, a.title AS aktion FROM posts p LEFT JOIN aktionen a ON a.id = p.aktion_id WHERE p.status IN ('render','geplant','bereit','fehler','pausiert') ORDER BY p.scheduled_at LIMIT 80"
    : "SELECT p.*, a.title AS aktion FROM posts p LEFT JOIN aktionen a ON a.id = p.aktion_id WHERE p.status = 'veroeffentlicht' ORDER BY p.published_at DESC LIMIT 60";
  const { results } = await env.DB.prepare(sql).all();
  return json(results.map(p => ({
    id: p.id, kind: p.kind, status: p.status, topic: p.topic, treatment: TREATMENTS[p.treatment]?.label || null,
    caption: p.caption, scheduled_at: p.scheduled_at, when: p.scheduled_at ? fmtBerlin(p.scheduled_at) : null,
    published: p.published_at ? fmtBerlin(p.published_at) : null, permalink: p.ig_permalink, error: p.error, ig_media_id: p.ig_media_id || null,
    assets: JSON.parse(p.assets_json || '[]'), video: p.video_key, manual: !!p.manual, ai: !!(p.ai_text || p.ai_image), aktion: p.aktion || null,
  })));
}

async function updatePost(request, env, id) {
  const body = await request.json().catch(() => ({}));
  const post = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first();
  if (!post) return err('Nicht gefunden', 404);
  if (post.status === 'veroeffentlicht') return err('Schon veröffentlicht');
  if (body.caption != null) await env.DB.prepare('UPDATE posts SET caption = ? WHERE id = ?').bind(String(body.caption).slice(0, 2200), id).run();
  if (body.action === 'jetzt') await env.DB.prepare("UPDATE posts SET scheduled_at = ?, status = CASE WHEN status IN ('fehler','pausiert') THEN 'geplant' ELSE status END, attempts = 0 WHERE id = ?").bind(new Date().toISOString(), id).run();
  if (body.action === 'pausieren') await env.DB.prepare("UPDATE posts SET status = 'pausiert' WHERE id = ?").bind(id).run();
  if (body.action === 'fortsetzen') await env.DB.prepare("UPDATE posts SET status = CASE WHEN assets_json IS NULL AND video_key IS NULL THEN 'render' ELSE 'geplant' END, attempts = 0, error = NULL WHERE id = ?").bind(id).run();
  if (body.action === 'ist-online') await env.DB.prepare("UPDATE posts SET status = 'veroeffentlicht', published_at = ?, error = NULL WHERE id = ?").bind(new Date().toISOString(), id).run();
  if (body.action === 'neu-rendern') await env.DB.prepare("UPDATE posts SET status = 'render', error = NULL WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

async function deletePost(env, id) {
  const post = await env.DB.prepare('SELECT assets_json, status FROM posts WHERE id = ?').bind(id).first();
  if (!post) return err('Nicht gefunden', 404);
  const keys = JSON.parse(post.assets_json || '[]');
  if (keys.length) await env.MEDIA.delete(keys);
  await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

const SETTING_KEYS = ['gemini_key', 'gemini_model', 'fb_app_id', 'fb_app_secret', 'ig_config_id', 'baseline_bookings', 'notify_email', 'music_approved', 'auto_repost', 'google_reviews', 'google_review_url', 'auto_reply'];
const SECRET_KEYS = ['gemini_key', 'fb_app_secret'];

async function getAppSettings(env, url) {
  const s = await getSettings(env, [...SETTING_KEYS, 'ingest_token']);
  let token = s.ingest_token;
  if (!token) { token = randomToken(); await setSetting(env, 'ingest_token', token); }
  const out = {};
  for (const k of SETTING_KEYS) out[k] = SECRET_KEYS.includes(k) ? (s[k] ? '••••••' + s[k].slice(-4) : '') : (s[k] || '');
  return json({
    ...out,
    bioUrl: "https://buchung.nmy-cosmetics.workers.dev",
    igRedirect: `${url.origin}/auth/instagram/callback`,
    appsScript: appsScript(url.origin, token),
  });
}

async function saveAppSettings(request, env) {
  const body = await request.json().catch(() => ({}));
  for (const k of SETTING_KEYS) {
    if (!(k in body)) continue;
    const v = String(body[k] ?? '').trim();
    if (SECRET_KEYS.includes(k) && v.startsWith('••')) continue; // unverändert
    await setSetting(env, k, v || null);
  }
  return json({ ok: true });
}

async function api(request, env, ctx, url) {
  const p = url.pathname;
  const m = request.method;
  if (p === '/api/login' && m === 'POST') return login(request, env);
  if (p === '/api/ingest/bookings' && m === 'POST') return ingestBookings(request, env);
  if (p === '/api/ingest/notifications' && m === 'POST') return pullNotifications(request, env);
  if (!(await isAuthed(request, env))) return err('Bitte anmelden', 401);

  if (p === '/api/logout') return logout();
  if (p === '/api/password' && m === 'POST') return changePassword(request, env);
  if (p === '/api/me') {
    if ((await getSetting(env, 'origin')) !== url.origin) await setSetting(env, 'origin', url.origin); // für Cron-Jobs
    return json({ ok: true, treatments: Object.fromEntries(Object.entries(TREATMENTS).map(([k, t]) => [k, t.label])), hooks: Object.fromEntries(Object.entries(TREATMENTS).map(([k, t]) => [k, t.hooks])) });
  }

  if (p === '/api/sets' && m === 'POST') return createSet(request, env);
  if (p === '/api/sets' && m === 'GET') return listSets(env);
  let r;
  if ((r = p.match(/^\/api\/sets\/([\w-]+)\/planen$/)) && m === 'POST') {
    const opts = await request.json().catch(() => ({}));
    const created = await planFromSet(env, r[1], { manual: !!opts.manual, coverText: String(opts.coverText || '').slice(0, 90), ba: !!opts.ba });
    ctx.waitUntil(renderPending(env, 4).catch(e => console.log('render', e.message)));
    ctx.waitUntil(improveCaptions(env, 3).catch(e => console.log('captions', e.message)));
    return json({ created });
  }
  if ((r = p.match(/^\/api\/sets\/([\w-]+)$/)) && m === 'DELETE') return deleteSet(env, r[1]);
  if (p === '/api/media' && m === 'PUT') return uploadPhoto(request, env, url);
  if (p === '/api/media/mpu/start' && m === 'POST') return mpuStart(request, env);
  if (p === '/api/media/mpu/part' && m === 'PUT') return mpuPart(request, env, url);
  if (p === '/api/media/mpu/complete' && m === 'POST') return mpuComplete(request, env);
  if (p.startsWith('/api/file/')) return serveFile(env, decodeURIComponent(p.slice(10)));

  if (p === '/api/posts' && m === 'GET') return listPosts(env, url);
  if ((r = p.match(/^\/api\/posts\/([\w-]+)$/))) {
    if (m === 'PATCH') { const res = await updatePost(request, env, r[1]); ctx.waitUntil(renderPending(env, 2).catch(() => {})); return res; }
    if (m === 'DELETE') return deletePost(env, r[1]);
  }
  if (p === '/api/plan/auffuellen' && m === 'POST') {
    const made = await autofill(env);
    ctx.waitUntil(renderPending(env, 4).catch(e => console.log('render', e.message)));
    return json({ made });
  }
  if (p === '/api/render' && m === 'POST') return json({ rendered: await renderPending(env, 4) });

  if (p === '/api/kommentare') return listComments(env);
  if ((r = p.match(/^\/api\/kommentare\/([\w-]+)\/antwort$/)) && m === 'DELETE') return deleteReply(env, r[1]);
  if (p === '/api/bewertung/angefragt' && m === 'POST') {
    const n = Number(await getSetting(env, 'review_requests', '0')) + 1;
    await setSetting(env, 'review_requests', n);
    return json({ ok: true, n });
  }
  if (p === '/api/repost' && m === 'POST') return repostHandler(request, env, ctx, renderPending);
  if (p === '/api/instagram/beitraege') return listIgMedia(env);
  if (p === '/api/aktionen' && m === 'GET') return listAktionen(env);
  if (p === '/api/aktionen' && m === 'POST') return createAktion(request, env);
  if (p === '/api/aktionen/vorschlag' && m === 'POST') return suggestAktion(request, env);
  if ((r = p.match(/^\/api\/aktionen\/([\w-]+)$/)) && m === 'DELETE') return endAktion(env, r[1]);
  if (p === '/api/stats') return stats(env);
  if (p === '/api/storage') return json({ used: await storageUsed(env), limit: STORAGE_LIMIT });
  if (p === '/api/bookings' && m === 'POST') return addBooking(request, env);
  if ((r = p.match(/^\/api\/bookings\/([\w-]+)$/)) && m === 'DELETE') return deleteBooking(env, r[1]);
  if (p === '/api/analyse' && m === 'POST') return runAnalysis(env);
  if (p === '/api/trends' && m === 'POST') return runTrends(env);
  if (p === '/api/filmideen' && m === 'POST') return runFilmIdeas(env);
  if (p === '/api/instagram/sync' && m === 'POST') return json({ synced: await syncInsights(env) });

  if (p === '/api/instagram') return igStatus(env);
  if (p === '/api/instagram/token' && m === 'POST') return saveManualToken(request, env);
  if (p === '/api/settings' && m === 'GET') return getAppSettings(env, url);
  if (p === '/api/settings' && m === 'POST') return saveAppSettings(request, env);
  return err('Unbekannt', 404);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) return await api(request, env, ctx, url);
      if (url.pathname.startsWith('/m/')) return await serveSigned(env, url);
      if (/^\/musik\/[a-z]+\.m4a$/.test(url.pathname)) {
        const obj = await env.MEDIA.get(url.pathname.slice(1));
        if (!obj) return new Response('Nicht gefunden', { status: 404 });
        return new Response(obj.body, { headers: { 'content-type': 'audio/mp4', 'cache-control': 'public, max-age=604800' } });
      }
      if (url.pathname === '/b' || url.pathname === '/b/') return await bioPageV2(env, url);
      if (url.pathname.startsWith('/b/bild/')) return await bioImage(env, decodeURIComponent(url.pathname.slice(8)));
      if (/^\/b\/schrift\/(playfair|montserrat|allura)\.woff2$/.test(url.pathname)) return serveStatic(new URL('/fonts/' + url.pathname.split('/').pop(), url.origin));
      if (url.pathname.startsWith('/b/go/')) return await bioGo(env, url, request);
      if (url.pathname === '/auth/instagram/start') {
        if (!(await isAuthed(request, env))) return Response.redirect(url.origin + '/', 302);
        return await oauthStart(env, url);
      }
      if (url.pathname === '/auth/instagram/callback') return await oauthCallback(env, url);
      return serveStatic(url);
    } catch (e) {
      console.log('Fehler', url.pathname, e.stack || e.message);
      return err('Interner Fehler: ' + e.message, 500);
    }
  },

  // alle 15 Minuten
  async scheduled(event, env, ctx) {
    const origin = (await getSetting(env, 'origin')) || '';
    const now = berlinNow();
    const steps = [
      ['nachplanen', async () => {
        const ids = ((await getSetting(env, 'replan_sets')) || '').split(',').filter(Boolean);
        if (!ids.length) return;
        await setSetting(env, 'replan_sets', null);
        for (const id of ids) {
          await env.DB.prepare("DELETE FROM posts WHERE set_id = ? AND status IN ('render','geplant')").bind(id).run();
          await planFromSet(env, id);
        }
      }],
      ['rendern', () => renderPending(env, 4)],
      ['captions', () => improveCaptions(env, 3)],
      ['story-repost', () => autoRepost(env)],
      ['veröffentlichen', () => origin && publishDue(env, origin)],
    ];
    // Kommentare 2× täglich beantworten (12:00 und 19:00 Uhr)
    if ((now.hh === 12 || now.hh === 19) && now.mm < 15) steps.push(['kommentare', () => processComments(env)]);
    // Auf Anforderung (z. B. nach Strategie-Änderung) sofort neu auffüllen
    if (await getSetting(env, 'force_autofill')) {
      await setSetting(env, 'force_autofill', null);
      steps.push(['auffüllen (sofort)', () => autofill(env)]);
    }
    // einmal täglich um ca. 6 Uhr: Plan auffüllen, Kennzahlen holen, Token erneuern
    if (now.hh === 6 && now.mm < 15) {
      steps.push(['aufräumen', () => cleanup(env)], ['auffüllen', () => autofill(env)], ['kennzahlen', () => syncInsights(env)], ['token', () => refreshTokenIfNeeded(env)]);
      if (now.dow === 1) steps.push(['trends', () => runTrends(env)], ['filmideen', () => runFilmIdeas(env)]);
      if (now.dow === 0) steps.push(['analyse', () => runAnalysis(env)]);
    }
    for (const [name, fn] of steps) {
      try { await fn(); } catch (e) { console.log(`Cron ${name}:`, e.message); }
    }
  },
};
