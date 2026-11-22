// Redaktionsplan: macht aus Uploads automatisch Beiträge und füllt freie Sendeplätze.
import { TREATMENTS, PROCESS, WHY, EVERGREEN_STORIES, EVERGREEN_CAROUSELS, FEED_SLOTS, STORY_TIMES, fallbackCaption } from './brand.js';
import { uid, berlinDay, berlinToUtc, getSetting, setSetting } from './util.js';
import { writeCaption } from './gemini.js';

const FEED_KINDS = "('carousel','reel','image')";
const pick = (arr, n) => arr[Math.abs(n) % arr.length];

async function takenTimes(env, kinds) {
  const { results } = await env.DB.prepare(
    `SELECT scheduled_at FROM posts WHERE kind IN ${kinds} AND status IN ('render','geplant','veroeffentlicht') AND scheduled_at >= ?`
  ).bind(new Date(Date.now() - 864e5).toISOString()).all();
  return results.map(r => r.scheduled_at.slice(0, 10)); // belegte Tage (UTC-Datum reicht pro Slot)
}

/** Nächster freier Feed-Platz (Mo/Mi/Fr), frühestens in 2 Stunden */
export async function nextFeedSlot(env, extraTaken = []) {
  const taken = new Set([...(await takenTimes(env, FEED_KINDS)), ...extraTaken]);
  const earliest = Date.now() + 2 * 36e5;
  for (let i = 0; i < 60; i++) {
    const day = berlinDay(i);
    const slot = FEED_SLOTS.find(s => s.dow === day.dow);
    if (!slot) continue;
    const at = berlinToUtc(day.y, day.m, day.d, slot.time);
    if (at.getTime() < earliest) continue;
    const iso = at.toISOString();
    if (!taken.has(iso.slice(0, 10))) return iso;
  }
  return null;
}

/** Nächster freier Story-Platz (täglich 09:30 / 19:30) */
export async function nextStorySlot(env) {
  const { results } = await env.DB.prepare(
    "SELECT scheduled_at FROM posts WHERE kind = 'story' AND status IN ('render','geplant','veroeffentlicht') AND scheduled_at >= ?"
  ).bind(new Date(Date.now() - 864e5).toISOString()).all();
  const taken = new Set(results.map(r => r.scheduled_at.slice(0, 16)));
  const earliest = Date.now() + 20 * 6e4;
  for (let i = 0; i < 30; i++) {
    const day = berlinDay(i);
    for (const t of STORY_TIMES) {
      const at = berlinToUtc(day.y, day.m, day.d, t);
      if (at.getTime() < earliest) continue;
      const iso = at.toISOString();
      if (!taken.has(iso.slice(0, 16))) return iso;
    }
  }
  return null;
}

function treatmentSlides(slide, t) {
  if (slide.type === 'facts' && slide.from === 'treatment') return { type: 'facts', headline: 'Gut zu wissen', items: t.facts, note: t.factNote };
  if (slide.type === 'cta' && slide.from === 'treatment')
    return { type: 'cta', headline: 'Dein Termin in _Seevetal_', body: 'Freie Termine siehst du direkt online.\nFragen vorab? Schreib mir gern per WhatsApp.', price: t.price, pill: 'Link in der Bio' };
  if (slide.type === 'list' && slide.items === 'WHY') return { ...slide, items: WHY };
  return slide;
}

async function insertPost(env, p) {
  await env.DB.prepare(`INSERT INTO posts (id, kind, status, treatment, set_id, topic, job_json, video_key, caption, scheduled_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(p.id, p.kind, p.status || 'render', p.treatment || null, p.set_id || null, p.topic || null,
    p.job ? JSON.stringify(p.job) : null, p.video_key || null, p.caption || null, p.scheduled_at).run();
  return p.id;
}

/** Nach einem Upload: Beiträge aus dem Kundinnen-Set erzeugen */
export async function planFromSet(env, setId) {
  const set = await env.DB.prepare('SELECT * FROM sets WHERE id = ?').bind(setId).first();
  if (!set) throw new Error('Set nicht gefunden');
  const { results: media } = await env.DB.prepare('SELECT * FROM media WHERE set_id = ? ORDER BY created_at').bind(setId).all();
  const t = TREATMENTS[set.treatment] || TREATMENTS['powder-brows'];
  const by = role => media.filter(m => m.role === role);
  const before = by('vorher')[0];
  const fresh = by('danach')[0] || by('ergebnis')[0];
  const healed = by('abgeheilt')[0];
  const after = healed || fresh;
  const hero = healed || fresh || by('studio')[0];
  const video = by('video')[0];
  const n = Number(await getSetting(env, 'rotation', '0'));
  await setSetting(env, 'rotation', n + 1);
  const hook = pick(t.hooks, n);
  const created = [];
  const reserved = [];

  // 1) Feed-Karussell mit Ergebnis
  if (hero) {
    const slides = [{ type: 'photo', image: 'media:' + hero.id, headline: hook, sub: t.sub, pill: 'Swipe' }];
    if (before && after) {
      slides.push({ type: 'beforeafter', before: 'media:' + before.id, after: 'media:' + after.id,
        beforeLabel: 'Vorher', afterLabel: healed ? 'Abgeheilt' : 'Direkt danach', caption: healed ? 'Das **abgeheilte Ergebnis** – weich und natürlich.' : t.healed });
    }
    slides.push({ type: 'list', headline: 'So läuft dein Termin ab', items: PROCESS });
    if (t.facts.length) slides.push({ type: 'facts', headline: 'Gut zu wissen', items: t.facts, note: t.factNote });
    slides.push(treatmentSlides({ type: 'cta', from: 'treatment' }, t));
    const at = await nextFeedSlot(env);
    reserved.push(at.slice(0, 10));
    const caption = await writeCaption(env, { topic: 'ergebnis', treatment: set.treatment, hook, note: set.note, hasBeforeAfter: !!(before && after), healed: !!healed });
    created.push(await insertPost(env, { id: uid('p_'), kind: 'carousel', treatment: set.treatment, set_id: setId, topic: 'ergebnis',
      job: { format: 'post', theme: 'edition', label: t.label, slides }, caption, scheduled_at: at }));

    // 2) Story mit Ergebnis (am selben oder nächsten Tag)
    created.push(await insertPost(env, { id: uid('p_'), kind: 'story', treatment: set.treatment, set_id: setId, topic: 'ergebnis',
      job: { format: 'story', theme: 'edition', label: `${t.label} · Seevetal`, slides: [{ type: 'photostory', image: 'media:' + hero.id, headline: hook, sub: 'Termin über den Link in meiner Bio.', pill: 'Link in der Bio' }] },
      scheduled_at: await nextStorySlot(env) }));
  }

  // 3) Reel aus dem Video (Original-Ton, Caption mit Hook)
  if (video) {
    const at = await nextFeedSlot(env, reserved);
    const caption = await writeCaption(env, { topic: 'reel', treatment: set.treatment, hook, note: set.note });
    created.push(await insertPost(env, { id: uid('p_'), kind: 'reel', status: 'geplant', treatment: set.treatment, set_id: setId, topic: 'reel',
      video_key: video.r2_key, caption, scheduled_at: at }));
    // Videos bis 60 Sek. laufen zusätzlich als Story-Video
    if (video.duration == null || video.duration <= 60) {
      created.push(await insertPost(env, { id: uid('p_'), kind: 'story', status: 'geplant', treatment: set.treatment, set_id: setId, topic: 'video',
        video_key: video.r2_key, scheduled_at: await nextStorySlot(env) }));
    }
  }
  await env.DB.prepare('UPDATE media SET used_count = used_count + 1 WHERE set_id = ?').bind(setId).run();
  return created;
}

/** Täglich: nächste 7 Tage auffüllen (Feed mit Wissens-Karussells, Stories mit Evergreen-Themen) */
export async function autofill(env) {
  let made = 0;
  // Feed
  for (let i = 0; i < 3; i++) {
    const at = await nextFeedSlot(env);
    if (!at || new Date(at) - Date.now() > 7 * 864e5) break;
    const n = Number(await getSetting(env, 'evergreen_feed', '0'));
    await setSetting(env, 'evergreen_feed', n + 1);
    const tpl = pick(EVERGREEN_CAROUSELS, n);
    const t = TREATMENTS[tpl.treatment];
    const slides = tpl.slides.map(s => treatmentSlides(s, t));
    const caption = await writeCaption(env, { topic: tpl.topic, treatment: tpl.treatment, hook: slides[0].headline });
    await insertPost(env, { id: uid('p_'), kind: 'carousel', treatment: tpl.treatment, topic: tpl.topic,
      job: { format: 'post', theme: 'edition', label: tpl.label, slides }, caption, scheduled_at: at });
    made++;
  }
  // Stories: mindestens eine pro Tag in den nächsten 3 Tagen
  for (let i = 0; i < 4; i++) {
    const at = await nextStorySlot(env);
    if (!at || new Date(at) - Date.now() > 3 * 864e5) break;
    const n = Number(await getSetting(env, 'evergreen_story', '0'));
    await setSetting(env, 'evergreen_story', n + 1);
    const s = pick(EVERGREEN_STORIES, n);
    await insertPost(env, { id: uid('p_'), kind: 'story', topic: 'evergreen',
      job: { format: 'story', theme: 'edition', label: s.label, slides: [{ type: 'story', headline: s.headline, body: s.body, pill: 'Link in der Bio' }] },
      scheduled_at: at });
    made++;
  }
  return made;
}

export { fallbackCaption };
