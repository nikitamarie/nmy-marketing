// Redaktionsplan: macht aus Uploads automatisch Beiträge und füllt freie Sendeplätze.
import { TREATMENTS, PROCESS, WHY, EVERGREEN_STORIES, EVERGREEN_CAROUSELS, FEED_SLOTS, STORY_TIMES, OWN_TEMPLATES, OWN_STORY_LINES, STUDIO_TEMPLATES, FUNNEL, ANGLES, TREATMENT_MIX, BOOKING_STORIES, fallbackCaption } from './brand.js';
import { uid, berlinDay, berlinToUtc, getSetting, setSetting } from './util.js';
import { writeCaption, generateCarousel, generateBookingStory, AI_MARK } from './gemini.js';
import { berlinNow } from './util.js';

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
    return { type: 'cta', headline: 'Dein Termin in _Seevetal_', body: 'Freie Termine siehst du direkt online.\nFragen vorab? Schreib mir gern per WhatsApp.', pill: 'Link in der Bio' };
  if (slide.type === 'list' && slide.items === 'WHY') return { ...slide, items: WHY };
  return slide;
}

async function insertPost(env, p) {
  // KI-Kennzeichnung: Text von Gemini (Caption oder Folien) / Foto mit KI-gestützter Retusche
  const aiText = p.aiText || (p.caption || '').includes(AI_MARK) ? 1 : 0;
  let aiImage = 0;
  const refs = (p.job?.slides || []).flatMap(s => [s.image, s.before, s.after]).filter(Boolean).map(r => r.replace(/^media:/, ''));
  if (refs.length) {
    const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM media WHERE edit = 'profi' AND id IN (${refs.map(() => '?').join(',')})`).bind(...refs).first();
    aiImage = row.n > 0 ? 1 : 0;
  }
  await env.DB.prepare(`INSERT INTO posts (id, kind, status, treatment, set_id, topic, job_json, video_key, caption, scheduled_at, ai_text, ai_image)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(p.id, p.kind, p.status || 'render', p.treatment || null, p.set_id || null, p.topic || null,
    p.job ? JSON.stringify(p.job) : null, p.video_key || null, p.caption || null, p.scheduled_at, aiText, aiImage).run();
  return p.id;
}

/** Ein „Etwas von mir“-Beitrag: Foto von Nikita + ein Wert (rotierend) */
async function valuesPost(env, photos, at, setId = null) {
  const t = TREATMENTS['powder-brows'];
  const n = Number(await getSetting(env, 'own_rotation', '0'));
  await setSetting(env, 'own_rotation', n + 1);
  const tpl = pick(OWN_TEMPLATES, n);
  const body = tpl.slides.map(sl => (sl.items === 'PROCESS' ? { ...sl, items: PROCESS } : sl));
  const [p1, p2] = photos;
  const slides = [
    { type: 'photo', image: 'media:' + p1.id, headline: tpl.hook, sub: 'Nikita · NMY Cosmetics, Seevetal', pill: 'Swipe' },
    ...body.slice(0, 1),
    ...(p2 ? [{ type: 'photo', image: 'media:' + p2.id, headline: body[1]?.headline || 'Natürlich statt _gemalt._', sub: '' }] : []),
    ...body.slice(p2 ? 2 : 1),
    treatmentSlides({ type: 'cta', from: 'treatment' }, t),
  ];
  for (const p of photos) await env.DB.prepare('UPDATE media SET used_count = used_count + 1 WHERE id = ?').bind(p.id).run();
  return insertPost(env, { id: uid('p_'), kind: 'carousel', treatment: 'powder-brows', set_id: setId, topic: 'werte',
    job: { format: 'post', theme: 'edition', label: tpl.label, slides },
    caption: await writeCaption(env, { topic: 'werte', treatment: 'powder-brows', hook: tpl.hook, note: `Thema: ${tpl.label}. Nicht mit „Hi, ich bin Nikita“ beginnen.` }), scheduled_at: at });
}

async function ownStory(env, photo, at) {
  const n = Number(await getSetting(env, 'own_story_rotation', '0'));
  await setSetting(env, 'own_story_rotation', n + 1);
  const [headline, sub] = pick(OWN_STORY_LINES, n);
  await env.DB.prepare('UPDATE media SET used_count = used_count + 1 WHERE id = ?').bind(photo.id).run();
  return insertPost(env, { id: uid('p_'), kind: 'story', topic: 'persoenlich',
    job: { format: 'story', theme: 'edition', label: photo.role === 'ich' ? 'Nikita · NMY Cosmetics' : 'Homestudio · Seevetal', slides: [{ type: 'photostory', image: 'media:' + photo.id, headline, sub, pill: 'Link in der Bio' }] },
    scheduled_at: at });
}

/** Fotos von Nikita / dem Homestudio: Vertrauens-Beiträge */
async function planOwnPhotos(env, setId, media) {
  const t = TREATMENTS['powder-brows'];
  const me = media.filter(m => m.role === 'ich'), studio = media.filter(m => m.role === 'studio');
  const created = [], reserved = [];
  const cta = treatmentSlides({ type: 'cta', from: 'treatment' }, t);
  const rot = async key => { const n = Number(await getSetting(env, key, '0')); await setSetting(env, key, n + 1); return n; };
  if (me.length) {
    const at = await nextFeedSlot(env); reserved.push(at.slice(0, 10));
    created.push(await valuesPost(env, me.slice(0, 2), at, setId));
  }
  if (studio.length) {
    const st = pick(STUDIO_TEMPLATES, await rot('studio_rotation'));
    const slides = [
      { type: 'photo', image: 'media:' + studio[0].id, headline: st.hook, sub: st.sub, pill: 'Swipe' },
      ...studio.slice(1, 3).map((m, i) => ({ type: 'photo', image: 'media:' + m.id, headline: st.extra[i] })),
      { type: 'list', headline: 'Hygiene hat Priorität', items: [
        { title: 'Nur für dich geöffnet', text: 'Einweg-Nadelmodule und Einweg-Pigmentcups – bei jeder Behandlung neu.' },
        { title: 'Saubere Arbeitsfläche', text: 'Desinfektion von Liege, Arbeitsbereich und Tools.' },
        { title: 'Handschuhe & Mundschutz', text: 'Sauberkeit und Sicherheit vom ersten Moment an.' },
      ] },
      cta,
    ];
    const at = await nextFeedSlot(env, reserved);
    created.push(await insertPost(env, { id: uid('p_'), kind: 'carousel', treatment: 'powder-brows', set_id: setId, topic: 'studio',
      job: { format: 'post', theme: 'edition', label: 'Homestudio Seevetal', slides }, caption: await writeCaption(env, { topic: 'studio', treatment: 'powder-brows', hook: st.hook }), scheduled_at: at }));
  }
  // Stories: bis zu 3 Fotos als „Hinter den Kulissen“
  // eine persönliche Story pro Upload
  const storyPhoto = me[0] || studio[0];
  if (storyPhoto) created.push(await ownStory(env, storyPhoto, await nextStorySlot(env)));
  await env.DB.prepare('UPDATE media SET used_count = used_count + 1 WHERE set_id = ?').bind(setId).run();
  return created;
}

/** Nach einem Upload: Beiträge aus dem Kundinnen-Set erzeugen */
export async function planFromSet(env, setId) {
  const set = await env.DB.prepare('SELECT * FROM sets WHERE id = ?').bind(setId).first();
  if (!set) throw new Error('Set nicht gefunden');
  const { results: media } = await env.DB.prepare('SELECT * FROM media WHERE set_id = ? ORDER BY created_at').bind(setId).all();
  if (set.treatment === 'ich-studio') return planOwnPhotos(env, setId, media);
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

/** Was hat bisher funktioniert? Punkte je Blickwinkel aus Instagram-Zahlen und Buchungen (72 h). */
async function angleScores(env) {
  const { results } = await env.DB.prepare(`SELECT p.job_json, p.published_at, m.reach, m.saved, m.shares FROM posts p
    LEFT JOIN ig_media m ON m.id = p.ig_media_id WHERE p.status = 'veroeffentlicht' AND p.kind = 'carousel' AND p.published_at >= ?`)
    .bind(new Date(Date.now() - 120 * 864e5).toISOString()).all();
  const { results: bk } = await env.DB.prepare("SELECT booked_at FROM bookings WHERE status = 'gebucht' AND booked_at >= ?").bind(new Date(Date.now() - 120 * 864e5).toISOString()).all();
  const scores = {};
  for (const r of results) {
    const angle = JSON.parse(r.job_json || '{}').angle; if (!angle || r.reach == null) continue;
    const t0 = new Date(r.published_at).getTime();
    const b = bk.filter(x => { const t = new Date(x.booked_at).getTime(); return t >= t0 && t - t0 <= 72 * 36e5; }).length;
    const score = (r.saved || 0) * 3 + (r.shares || 0) * 4 + (r.reach || 0) / 100 + b * 25;
    (scores[angle] ||= []).push(score);
  }
  return Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, v.reduce((a, c) => a + c, 0) / v.length]));
}

/** Blickwinkel wählen: Bewährtes öfter, Neues weiter ausprobieren */
function chooseAngle(stage, scores, recentAngles) {
  const list = ANGLES[stage].filter(a => !recentAngles.slice(0, 3).includes(a));
  const max = Math.max(1, ...list.map(a => scores[a] || 0));
  const weights = list.map(a => (a in scores ? 0.6 + 2 * (scores[a] / max) : 1.4));
  let r = Math.random() * weights.reduce((a, c) => a + c, 0);
  for (const [i, w] of weights.entries()) { if ((r -= w) <= 0) return list[i]; }
  return list[0];
}

const FALLBACK_TOPIC = { reichweite: ['wissen'], vertrauen: ['vertrauen', 'heilung'], buchung: ['angebot'] };

/** Täglich: nächste 7 Tage auffüllen – Mo Reichweite, Mi Vertrauen, Fr Buchung; Stories: morgens Mehrwert, abends Buchung */
export async function autofill(env) {
  let made = 0;
  const scores = await angleScores(env);
  const { results: recent } = await env.DB.prepare("SELECT job_json FROM posts WHERE kind = 'carousel' ORDER BY created_at DESC LIMIT 12").all();
  const recentJobs = recent.map(r => JSON.parse(r.job_json || '{}'));
  const recentAngles = recentJobs.map(j => j.angle).filter(Boolean);
  const recentHooks = recentJobs.map(j => j.slides?.[0]?.headline).filter(Boolean).map(h => h.replace(/_/g, ''));
  const learnings = Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a]) => a);

  for (let i = 0; i < 3; i++) {
    const at = await nextFeedSlot(env);
    if (!at || new Date(at) - Date.now() > 7 * 864e5) break;
    const dow = berlinNow(new Date(at)).dow;
    const stage = FUNNEL[dow] || 'reichweite';
    const n = Number(await getSetting(env, 'evergreen_feed', '0'));
    await setSetting(env, 'evergreen_feed', n + 1);
    const treatment = stage === 'buchung' || stage === 'reichweite' ? pick(TREATMENT_MIX, n) : 'powder-brows';
    const t = TREATMENTS[treatment];
    const angle = chooseAngle(stage, scores, recentAngles);
    if (i) await new Promise(r => setTimeout(r, 7000)); // Gratis-Kontingent schonen
    const ai = await generateCarousel(env, { treatment, stage, angle, learnings, recentHooks });
    let slides, label, hook, aiText = false;
    if (ai) {
      aiText = true;
      hook = ai.hook;
      label = t.label;
      slides = [{ type: 'cover', headline: ai.hook, sub: ai.sub || '' }, ...ai.slides];
      if (stage !== 'reichweite' && t.facts.length) slides.push({ type: 'facts', headline: 'Gut zu wissen', items: t.facts, note: t.factNote });
      slides.push(treatmentSlides({ type: 'cta', from: 'treatment' }, t));
    } else {
      const pool = EVERGREEN_CAROUSELS.filter(c => FALLBACK_TOPIC[stage].includes(c.topic));
      const tpl = pick(pool.length ? pool : EVERGREEN_CAROUSELS, n);
      slides = tpl.slides.map(s => treatmentSlides(s, TREATMENTS[tpl.treatment]));
      label = tpl.label; hook = slides[0].headline;
    }
    recentHooks.unshift(String(hook).replace(/_/g, '')); recentAngles.unshift(angle);
    const caption = await writeCaption(env, { topic: stage, angle, treatment, hook });
    await insertPost(env, { id: uid('p_'), kind: 'carousel', treatment, topic: stage, aiText,
      job: { format: 'post', theme: 'edition', label, angle, slides }, caption, scheduled_at: at });
    made++;
  }

  // Stories der nächsten 3 Tage: 09:30 Mehrwert/Vertrauen, 19:30 Buchungsaufruf
  const { results: rs } = await env.DB.prepare("SELECT job_json FROM posts WHERE kind = 'story' ORDER BY created_at DESC LIMIT 8").all();
  const recentStory = rs.map(r => JSON.parse(r.job_json || '{}').slides?.[0]?.headline).filter(Boolean);
  for (let i = 0; i < 6; i++) {
    const at = await nextStorySlot(env);
    if (!at || new Date(at) - Date.now() > 3 * 864e5) break;
    const evening = berlinNow(new Date(at)).hh >= 15;
    const n = Number(await getSetting(env, evening ? 'booking_story' : 'evergreen_story', '0'));
    await setSetting(env, evening ? 'booking_story' : 'evergreen_story', n + 1);
    let s, aiText = false;
    if (evening) {
      await new Promise(r => setTimeout(r, 7000));
      s = await generateBookingStory(env, { treatment: pick(TREATMENT_MIX, n), recent: recentStory });
      if (s) aiText = true; else s = pick(BOOKING_STORIES, n);
    } else s = pick(EVERGREEN_STORIES, n);
    recentStory.unshift(s.headline);
    await insertPost(env, { id: uid('p_'), kind: 'story', topic: evening ? 'buchung' : 'evergreen', aiText,
      job: { format: 'story', theme: 'edition', label: s.label, slides: [{ type: 'story', headline: s.headline, body: s.body, pill: 'Link in der Bio' }] },
      scheduled_at: at });
    made++;
  }
  return made;
}

export { fallbackCaption };
