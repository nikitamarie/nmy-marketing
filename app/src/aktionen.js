// Eigene Aktionen: Nikita legt fest, was (Story/Beitrag/Reel), womit (Bild/Video/Text) und wann (einmal oder täglich bis …).
import { json, err, uid, berlinToUtc, berlinNow, fmtBerlin, getSetting } from './util.js';
import { insertPost } from './planner.js';
import { suggestActionCaption } from './gemini.js';

const MAX_DAYS = 31;

function days(start, end) {
  const out = [];
  const d = new Date(start + 'T12:00:00Z'), e = new Date(end + 'T12:00:00Z');
  while (d <= e && out.length < MAX_DAYS) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}

export async function createAktion(request, env) {
  const b = await request.json().catch(() => ({}));
  const title = String(b.title || '').trim().slice(0, 60);
  const kind = ['story', 'post', 'reel'].includes(b.kind) ? b.kind : null;
  const content = ['bild', 'video', 'text'].includes(b.content) ? b.content : null;
  if (!title || !kind || !content) return err('Bitte Titel, Format und Inhalt wählen');
  if (kind === 'reel' && content !== 'video') return err('Ein Reel braucht ein Video');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.start || '') || !/^\d{2}:\d{2}$/.test(b.time || '')) return err('Datum oder Uhrzeit fehlt');
  const end = b.repeat === 'taeglich' && /^\d{4}-\d{2}-\d{2}$/.test(b.end || '') ? b.end : b.start;
  if (end < b.start) return err('Das Enddatum liegt vor dem Startdatum');

  let media = null;
  if (content !== 'text') {
    media = await env.DB.prepare('SELECT * FROM media WHERE id = ?').bind(b.media_id || '').first();
    if (!media) return err('Bitte zuerst ein Bild oder Video hochladen');
    if (content === 'video' && !['stumm', 'stumm-bestaetigt', 'original-bestaetigt'].includes(media.edit)) return err('Bitte beim Ton auswählen, ob der Originalton bleiben soll (mit Bestätigung) oder entfernt wird');
  }
  const text = b.text || {};
  if (content === 'text' && !String(text.headline || '').trim()) return err('Bitte eine Überschrift eingeben');

  const id = uid('a_');
  await env.DB.prepare('INSERT INTO aktionen (id, title, kind, content, start_date, end_date, time) VALUES (?,?,?,?,?,?,?)')
    .bind(id, title, kind, content, b.start, end, b.time).run();

  const caption = kind === 'story' ? null : String(b.caption || '').slice(0, 2200);
  const manual = content === 'video' && !!b.manual; // Trend-Sound: selbst in Instagram posten
  const label = String(text.label || title).slice(0, 40);
  const soonest = Date.now() + 10 * 6e4;
  let n = 0;
  for (const day of days(b.start, end)) {
    const [y, m, d] = day.split('-').map(Number);
    let at = berlinToUtc(y, m, d, b.time);
    if (at.getTime() < Date.now() - 60e3) continue; // Zeitpunkt heute schon vorbei -> überspringen
    if (at.getTime() < soonest) at = new Date(soonest);
    const base = { id: uid('p_'), aktion_id: id, topic: 'aktion', scheduled_at: at.toISOString(), caption, aiText: !!b.aiCaption, manual };
    if (content === 'video') {
      await insertPost(env, { ...base, kind: kind === 'story' ? 'story' : 'reel', status: 'geplant', video_key: media.r2_key });
    } else if (content === 'bild') {
      await insertPost(env, { ...base, kind: kind === 'story' ? 'story' : 'image',
        job: { format: kind === 'story' ? 'story' : 'post', theme: 'edition', label, slides: [{ type: 'raw', image: 'media:' + media.id }] } });
    } else {
      const slide = kind === 'story'
        ? { type: 'story', headline: text.headline, body: text.body || '', pill: text.pill || 'Link in der Bio' }
        : { type: 'cover', headline: text.headline, sub: text.body || '', pill: text.pill || 'Link in der Bio' };
      await insertPost(env, { ...base, kind: kind === 'story' ? 'story' : 'image', job: { format: kind === 'story' ? 'story' : 'post', theme: 'edition', label, slides: [slide] } });
    }
    n++;
  }
  if (!n) {
    await env.DB.prepare('DELETE FROM aktionen WHERE id = ?').bind(id).run();
    return err('Alle gewählten Zeitpunkte liegen in der Vergangenheit');
  }
  return json({ id, posts: n });
}

export async function listAktionen(env) {
  const { results } = await env.DB.prepare(`SELECT a.*,
      (SELECT COUNT(*) FROM posts p WHERE p.aktion_id = a.id AND p.status = 'veroeffentlicht') AS online,
      (SELECT COUNT(*) FROM posts p WHERE p.aktion_id = a.id AND p.status != 'veroeffentlicht') AS offen,
      (SELECT MIN(scheduled_at) FROM posts p WHERE p.aktion_id = a.id AND p.status != 'veroeffentlicht') AS naechster
    FROM aktionen a WHERE a.active = 1 ORDER BY a.start_date DESC LIMIT 30`).all();
  return json(results.map(a => ({ ...a, naechster: a.naechster ? fmtBerlin(a.naechster) : null })));
}

/** Aktion beenden: alle noch nicht veröffentlichten Termine löschen */
export async function endAktion(env, id) {
  const { results } = await env.DB.prepare("SELECT id, assets_json FROM posts WHERE aktion_id = ? AND status != 'veroeffentlicht'").bind(id).all();
  for (const p of results) {
    const keys = JSON.parse(p.assets_json || '[]');
    if (keys.length) await env.MEDIA.delete(keys);
  }
  await env.DB.prepare("DELETE FROM posts WHERE aktion_id = ? AND status != 'veroeffentlicht'").bind(id).run();
  await env.DB.prepare('UPDATE aktionen SET active = 0 WHERE id = ?').bind(id).run();
  return json({ ok: true, removed: results.length });
}

export async function suggest(request, env) {
  const b = await request.json().catch(() => ({}));
  const text = await suggestActionCaption(env, { title: b.title, details: b.details, kind: b.kind });
  if (!text) return err('Gemini ist gerade nicht verfügbar (Schlüssel fehlt oder Tageskontingent aufgebraucht). Bitte selbst schreiben oder später erneut versuchen.');
  return json({ text });
}
