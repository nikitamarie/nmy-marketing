// Uploads (Fotos direkt, Videos in Teilen), Auslieferung, signierte Links für Instagram, Löschen.
import { json, err, uid, sign, safeEqual } from './util.js';

const ROLES = ['vorher', 'danach', 'abgeheilt', 'ergebnis', 'studio', 'video'];

// Kostenbremse: R2 ist bis 10 GB kostenlos. Die App bleibt sicher darunter.
export const STORAGE_LIMIT = 8 * 1024 ** 3;
const RENDER_ESTIMATE = 600 * 1024; // pro gerenderter Folie (großzügig geschätzt)

export async function storageUsed(env) {
  const m = await env.DB.prepare('SELECT COALESCE(SUM(size), 0) AS b FROM media').first();
  const { results } = await env.DB.prepare('SELECT assets_json FROM posts WHERE assets_json IS NOT NULL').all();
  const slides = results.reduce((n, r) => n + JSON.parse(r.assets_json).length, 0);
  return m.b + slides * RENDER_ESTIMATE;
}
async function guard(env, incoming) {
  const used = await storageUsed(env);
  if (used + incoming > STORAGE_LIMIT) {
    return err(`Speicher fast voll (${(used / 1024 ** 3).toFixed(1)} von 8 GB). Damit keine Kosten entstehen, bitte alte Sets löschen.`, 507);
  }
  return null;
}

/** Täglich: Dateien entfernen, die nicht mehr gebraucht werden (Instagram hat sie bereits). */
export async function cleanup(env) {
  const old = new Date(Date.now() - 45 * 864e5).toISOString();
  const { results } = await env.DB.prepare("SELECT id, assets_json, video_key FROM posts WHERE status = 'veroeffentlicht' AND published_at < ? AND (assets_json IS NOT NULL OR video_key IS NOT NULL)").bind(old).all();
  for (const p of results) {
    const keys = JSON.parse(p.assets_json || '[]');
    if (keys.length) await env.MEDIA.delete(keys);
    await env.DB.prepare('UPDATE posts SET assets_json = NULL WHERE id = ?').bind(p.id).run();
  }
  // Original-Videos 30 Tage nach Veröffentlichung löschen (groß, werden nicht wiederverwendet)
  const vOld = new Date(Date.now() - 30 * 864e5).toISOString();
  const { results: vids } = await env.DB.prepare("SELECT m.id, m.r2_key FROM media m JOIN posts p ON p.video_key = m.r2_key WHERE p.status = 'veroeffentlicht' AND p.published_at < ?").bind(vOld).all();
  for (const v of vids) {
    await env.MEDIA.delete(v.r2_key);
    await env.DB.prepare('DELETE FROM media WHERE id = ?').bind(v.id).run();
  }
  return results.length + vids.length;
}

export async function createSet(request, env) {
  const { treatment, note = '', consent } = await request.json().catch(() => ({}));
  if (!treatment) return err('Behandlung fehlt');
  if (!consent) return err('Ohne Einwilligung der Kundin kann nichts hochgeladen werden');
  const id = uid('s_');
  await env.DB.prepare('INSERT INTO sets (id, treatment, note, consent) VALUES (?, ?, ?, 1)').bind(id, treatment, note).run();
  return json({ id });
}

async function insertMedia(env, { id, set, kind, role, key, mime, w, h, size }) {
  await env.DB.prepare('INSERT INTO media (id, set_id, kind, role, r2_key, mime, width, height, size) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(id, set, kind, role, key, mime, w || null, h || null, size || null).run();
}

async function checkSet(env, set) {
  return !!(await env.DB.prepare('SELECT id FROM sets WHERE id = ?').bind(set).first());
}

// Foto (bereits auf dem Handy lichtkorrigiert & verkleinert)
export async function uploadPhoto(request, env, url) {
  const set = url.searchParams.get('set');
  const role = url.searchParams.get('role');
  if (!(await checkSet(env, set))) return err('Set unbekannt', 404);
  if (!ROLES.includes(role)) return err('Rolle unbekannt');
  const mime = request.headers.get('content-type') || 'image/jpeg';
  if (!mime.startsWith('image/')) return err('Nur Bilder');
  const blocked = await guard(env, +(request.headers.get('content-length') || 0));
  if (blocked) return blocked;
  const id = uid('m_');
  const key = `sets/${set}/${id}.jpg`;
  const body = await request.arrayBuffer();
  await env.MEDIA.put(key, body, { httpMetadata: { contentType: mime } });
  await insertMedia(env, { id, set, kind: 'photo', role, key, mime, w: +url.searchParams.get('w'), h: +url.searchParams.get('h'), size: body.byteLength });
  return json({ id, key });
}

// Video: Multipart-Upload (Teile à 10 MB), damit auch große iPhone-Videos funktionieren
export async function mpuStart(request, env) {
  const { set, mime = 'video/mp4', size = 0 } = await request.json();
  if (!(await checkSet(env, set))) return err('Set unbekannt', 404);
  if (size > 1024 ** 3) return err('Video zu groß (max. 1 GB)');
  const blocked = await guard(env, size);
  if (blocked) return blocked;
  const id = uid('m_');
  const ext = mime.includes('quicktime') ? 'mov' : 'mp4';
  const key = `sets/${set}/${id}.${ext}`;
  const mpu = await env.MEDIA.createMultipartUpload(key, { httpMetadata: { contentType: mime } });
  return json({ id, key, uploadId: mpu.uploadId });
}
export async function mpuPart(request, env, url) {
  const key = url.searchParams.get('key');
  if (!key?.startsWith('sets/')) return err('Ungültig');
  const mpu = env.MEDIA.resumeMultipartUpload(key, url.searchParams.get('uploadId'));
  const part = await mpu.uploadPart(+url.searchParams.get('n'), request.body);
  return json(part);
}
export async function mpuComplete(request, env) {
  const { id, key, uploadId, parts, set, mime, size } = await request.json();
  const mpu = env.MEDIA.resumeMultipartUpload(key, uploadId);
  await mpu.complete(parts);
  await insertMedia(env, { id, set, kind: 'video', role: 'video', key, mime, size });
  return json({ id, key });
}

export async function deleteSet(env, setId) {
  const { results } = await env.DB.prepare('SELECT r2_key FROM media WHERE set_id = ?').bind(setId).all();
  if (results.length) await env.MEDIA.delete(results.map(r => r.r2_key));
  // gerenderte Beiträge aus diesem Set, die noch nicht online sind, ebenfalls entfernen
  const { results: posts } = await env.DB.prepare("SELECT id, assets_json FROM posts WHERE set_id = ? AND status != 'veroeffentlicht'").bind(setId).all();
  for (const p of posts) {
    const keys = JSON.parse(p.assets_json || '[]');
    if (keys.length) await env.MEDIA.delete(keys);
    await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(p.id).run();
  }
  await env.DB.prepare('DELETE FROM media WHERE set_id = ?').bind(setId).run();
  await env.DB.prepare('DELETE FROM sets WHERE id = ?').bind(setId).run();
  return json({ ok: true });
}

export async function listSets(env) {
  const { results } = await env.DB.prepare(`
    SELECT s.id, s.treatment, s.note, s.created_at,
      json_group_array(json_object('id', m.id, 'kind', m.kind, 'role', m.role, 'key', m.r2_key)) AS media
    FROM sets s LEFT JOIN media m ON m.set_id = s.id
    GROUP BY s.id ORDER BY s.created_at DESC LIMIT 60`).all();
  return json(results.map(r => ({ ...r, media: JSON.parse(r.media).filter(m => m.id) })));
}

// Für die App selbst (mit Login)
export async function serveFile(env, key) {
  const obj = await env.MEDIA.get(key);
  if (!obj) return new Response('Nicht gefunden', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('cache-control', 'private, max-age=3600');
  headers.set('etag', obj.httpEtag);
  return new Response(obj.body, { headers });
}

// Signierte, zeitlich begrenzte Links (Instagram lädt die Bilder/Videos darüber)
export async function signedUrl(env, origin, key, ttlSec = 60 * 60 * 6) {
  const e = Math.floor(Date.now() / 1000) + ttlSec;
  const s = await sign(env.SESSION_SECRET, `media:${key}:${e}`);
  return `${origin}/m/${key}?e=${e}&s=${s}`;
}
export async function serveSigned(env, url) {
  const key = decodeURIComponent(url.pathname.slice(3));
  const e = url.searchParams.get('e'), s = url.searchParams.get('s') || '';
  if (!e || Date.now() / 1000 > +e) return new Response('Abgelaufen', { status: 403 });
  if (!safeEqual(s, await sign(env.SESSION_SECRET, `media:${key}:${e}`))) return new Response('Ungültig', { status: 403 });
  const obj = await env.MEDIA.get(key);
  if (!obj) return new Response('Nicht gefunden', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('content-length', String(obj.size));
  return new Response(obj.body, { headers });
}
