// Redaktionsplan: macht aus Uploads automatisch Beiträge und füllt freie Sendeplätze.
import { TREATMENTS, PROCESS, WHY, EVERGREEN_STORIES, EVERGREEN_CAROUSELS, FEED_SLOTS, STORY_TIMES, OWN_TEMPLATES, OWN_STORY_LINES, STUDIO_TEMPLATES, FUNNEL, ANGLES, TREATMENT_MIX, BOOKING_STORIES, STORY_PLAN, TRUST_LABELS, RESULT_LINES, REVIEWS, fallbackCaption } from './brand.js';
import { uid, berlinDay, berlinToUtc, getSetting, setSetting } from './util.js';
import { writeCaption as aiCaption, generateCarousel, generateBookingStory } from './gemini.js';
import { berlinNow } from './util.js';

const FEED_KINDS = "('carousel','reel','image')";
const pick = (arr, n) => arr[Math.abs(n) % arr.length];

async function takenTimes(env, kinds) {
  const { results } = await env.DB.prepare(
    `SELECT scheduled_at FROM posts WHERE kind IN ${kinds} AND status IN ('render','geplant','veroeffentlicht') AND scheduled_at >= ?`
  ).bind(new Date(Date.now() - 864e5).toISOString()).all();
  return results.map(r => r.scheduled_at.slice(0, 10)); // belegte Tage (UTC-Datum reicht pro Slot)
}

/** Nächster freier Feed-Platz (Mo, Di, Mi, Fr, So), frühestens in 2 Stunden */
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
// Automatische Stories, die für eigenes Material (Upload, Repost) Platz machen dürfen
const AUTO_STORY = ['evergreen', 'wissen', 'ergebnis', 'vertrauen'];

/** Nächster freier Story-Platz. displace: automatische Story an dem Platz wird ersetzt (eigenes Material hat Vorrang) */
export async function nextStorySlot(env, earliestMs = null, { displace = false } = {}) {
  const { results } = await env.DB.prepare(
    "SELECT id, scheduled_at, topic, status, aktion_id, assets_json FROM posts WHERE kind = 'story' AND status IN ('render','geplant','bereit','pausiert','veroeffentlicht') AND scheduled_at >= ?"
  ).bind(new Date(Date.now() - 864e5).toISOString()).all();
  const taken = new Map();
  for (const r of results) { const k = r.scheduled_at.slice(0, 16); taken.set(k, [...(taken.get(k) || []), r]); }
  const earliest = earliestMs || Date.now() + 20 * 6e4;
  for (let i = 0; i < 30; i++) {
    const day = berlinDay(i);
    for (const t of STORY_TIMES) {
      const at = berlinToUtc(day.y, day.m, day.d, t);
      if (at.getTime() < earliest) continue;
      const iso = at.toISOString();
      const here = taken.get(iso.slice(0, 16));
      if (!here) return iso;
      if (displace && here.every(r => r.status !== 'veroeffentlicht' && !r.aktion_id && AUTO_STORY.includes(r.topic))) {
        for (const r of here) {
          const keys = JSON.parse(r.assets_json || '[]');
          if (keys.length) await env.MEDIA.delete(keys).catch(() => {});
          await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(r.id).run();
        }
        return iso;
      }
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

// Beim Planen aus Uploads: sofort Vorlagen-Caption, KI-Caption später im Hintergrund (Upload bleibt schnell)
let deferCaptions = false;
async function writeCaption(env, args) {
  if (deferCaptions) return { deferred: args, ai: false, text: fallbackCaption({ topic: args.topic === 'reel' ? 'ergebnis' : args.topic, treatment: args.treatment, hook: args.hook }) };
  return aiCaption(env, args);
}

export async function insertPost(env, p) {
  p.manual = p.manual ? 1 : 0;
  let captionJob = null, captionAI = false;
  if (p.caption && typeof p.caption === 'object') {
    if (p.caption.deferred) captionJob = JSON.stringify(p.caption.deferred);
    captionAI = !!p.caption.ai;
    p.caption = p.caption.text;
  }
  // KI-Kennzeichnung: Text von Gemini (Caption oder Folien) / Foto mit KI-gestützter Retusche
  const aiText = p.aiText || captionAI ? 1 : 0;
  let aiImage = 0;
  const refs = (p.job?.slides || []).flatMap(s => [s.image, s.before, s.after]).filter(Boolean).map(r => r.replace(/^media:/, ''));
  if (refs.length) {
    const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM media WHERE edit = 'profi' AND id IN (${refs.map(() => '?').join(',')})`).bind(...refs).first();
    aiImage = row.n > 0 ? 1 : 0;
  }
  await env.DB.prepare(`INSERT INTO posts (id, kind, status, treatment, set_id, topic, job_json, video_key, caption, scheduled_at, ai_text, ai_image, manual, aktion_id, repost_of)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(p.id, p.kind, p.status || 'render', p.treatment || null, p.set_id || null, p.topic || null,
    p.job ? JSON.stringify(p.job) : null, p.video_key || null, p.caption || null, p.scheduled_at, aiText, aiImage || (p.aiImage ? 1 : 0), p.manual, p.aktion_id || null, p.repost_of || null).run();
  if (captionJob) await env.DB.prepare('UPDATE posts SET caption_job = ? WHERE id = ?').bind(captionJob, p.id).run();
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
  return insertPost(env, { id: uid('p_'), kind: 'story', topic: 'persoenlich', set_id: photo.set_id || null,
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
  if (storyPhoto) created.push(await ownStory(env, storyPhoto, await nextStorySlot(env, null, { displace: true })));
  await env.DB.prepare('UPDATE media SET used_count = used_count + 1 WHERE set_id = ?').bind(setId).run();
  return created;
}

/** Nach einem Upload: Beiträge aus dem Kundinnen-Set erzeugen */
export async function planFromSet(env, setId, opts = {}) {
  deferCaptions = true;
  try { return await planFromSetInner(env, setId, opts); } finally { deferCaptions = false; }
}

/** Im Hintergrund / per Cron: Vorlagen-Captions durch KI-Captions ersetzen */
export async function improveCaptions(env, limit = 3) {
  const { results } = await env.DB.prepare("SELECT id, caption_job FROM posts WHERE caption_job IS NOT NULL AND status IN ('render','geplant','bereit') ORDER BY scheduled_at LIMIT ?").bind(limit).all();
  let n = 0;
  for (const r of results) {
    const c = await aiCaption(env, JSON.parse(r.caption_job));
    if (!c.ai) break; // KI gerade nicht verfügbar -> später erneut
    await env.DB.prepare('UPDATE posts SET caption = ?, caption_job = NULL, ai_text = 1 WHERE id = ?').bind(c.text, r.id).run();
    n++;
  }
  return n;
}

async function planFromSetInner(env, setId, { manual = false, coverText = '', ba = false } = {}) {
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
      scheduled_at: await nextStorySlot(env, null, { displace: true }) }));
  }

  // 3) Reel aus dem Video (Original-Ton, Caption mit Hook)
  if (video) {
    const at = await nextFeedSlot(env, reserved);
    const caption = await writeCaption(env, { topic: 'reel', treatment: set.treatment, hook, note: set.note });
    // Startbild (Titelbild) im Edition-Look, falls ein Standbild mitgeschickt wurde
    const cover = by('cover')[0];
    const coverJob = cover ? { format: 'story', theme: 'edition', label: t.label,
      slides: [{ type: 'reelcover', image: 'media:' + cover.id, headline: coverText || hook, sub: ba ? 'Vorher → Nachher' : '' }] } : null;
    created.push(await insertPost(env, { id: uid('p_'), kind: 'reel', status: cover ? 'render' : 'geplant', treatment: set.treatment, set_id: setId, topic: 'reel',
      video_key: video.r2_key, caption, scheduled_at: at, manual, job: coverJob }));
    // Videos bis 60 Sek. laufen zusätzlich als Story-Video
    if (video.duration == null || video.duration <= 60) {
      created.push(await insertPost(env, { id: uid('p_'), kind: 'story', status: 'geplant', treatment: set.treatment, set_id: setId, topic: 'video',
        video_key: video.r2_key, scheduled_at: await nextStorySlot(env, null, { displace: true }), manual }));
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

  for (let i = 0; i < FEED_SLOTS.length; i++) {
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
      // Ersatz-Vorlage: passend zum Wochenziel, aber keine, die kürzlich lief
      const fresh = EVERGREEN_CAROUSELS.filter(c => !recentHooks.includes(String(c.slides[0].headline).replace(/_/g, '')));
      const pool = fresh.filter(c => FALLBACK_TOPIC[stage].includes(c.topic));
      const tpl = pick(pool.length ? pool : fresh.length ? fresh : EVERGREEN_CAROUSELS, n);
      slides = tpl.slides.map(s => treatmentSlides(s, TREATMENTS[tpl.treatment]));
      label = tpl.label; hook = slides[0].headline;
    }
    recentHooks.unshift(String(hook).replace(/_/g, '')); recentAngles.unshift(angle);
    const caption = await writeCaption(env, { topic: stage, angle, treatment, hook });
    await insertPost(env, { id: uid('p_'), kind: 'carousel', treatment, topic: stage, aiText,
      job: { format: 'post', theme: 'edition', label, angle, slides }, caption, scheduled_at: at });
    made++;
  }

  // Stories der nächsten 7 Tage – 4 pro Tag, jede mit eigener Aufgabe:
  // 09:30 Wissen · 12:30 echtes Ergebnis · 16:30 Vertrauen/Kundenstimme · 19:30 Buchungsaufruf
  const { results: rs } = await env.DB.prepare("SELECT job_json FROM posts WHERE kind = 'story' ORDER BY created_at DESC LIMIT 12").all();
  const recentStory = rs.map(r => JSON.parse(r.job_json || '{}').slides?.[0]?.headline).filter(Boolean);
  const rot = async key => { const n = Number(await getSetting(env, key, '0')); await setSetting(env, key, n + 1); return n; };
  const wissen = EVERGREEN_STORIES.filter(x => !TRUST_LABELS.includes(x.label));
  const vertrauen = EVERGREEN_STORIES.filter(x => TRUST_LABELS.includes(x.label));
  let gemini = 0;
  for (let i = 0; i < 40; i++) {
    const at = await nextStorySlot(env);
    if (!at || new Date(at) - Date.now() > 7 * 864e5) break;
    const t = berlinNow(new Date(at));
    let role = STORY_PLAN[`${String(t.hh).padStart(2, '0')}:${String(t.mm).padStart(2, '0')}`] || 'wissen';
    let job = null, aiText = false;
    if (role === 'ergebnis') {
      job = await resultStoryJob(env, at, await rot('story_ergebnis'));
      if (!job) role = 'vertrauen'; // keine passenden Fotos frei → Kundenstimme
    }
    if (role === 'buchung') {
      const n = await rot('booking_story');
      let s = null;
      if (gemini < 7) { if (gemini++) await new Promise(r => setTimeout(r, 7000)); s = await generateBookingStory(env, { treatment: pick(TREATMENT_MIX, n), recent: recentStory }); }
      if (s) aiText = true; else s = pick(BOOKING_STORIES, n);
      job = textStory(s);
    }
    if (role === 'vertrauen') {
      const n = await rot('story_vertrauen');
      job = textStory(n % 2 === 0 ? await reviewStory(env, n / 2) : pick(vertrauen, (n - 1) / 2));
    }
    if (role === 'wissen') job = textStory(pick(wissen, await rot('evergreen_story')));
    recentStory.unshift(job.slides[0].headline);
    await insertPost(env, { id: uid('p_'), kind: 'story', topic: role, aiText, job, scheduled_at: at });
    made++;
  }
  return made;
}

const textStory = s => ({ format: 'story', theme: 'edition', label: s.label, slides: [{ type: 'story', headline: s.headline, body: s.body, pill: 'Link in der Bio' }] });

/** Echte Kundenstimme – unverändert (Google-Bewertungen aus der App, sonst Stimmen von der Website) */
async function reviewStory(env, n) {
  let G = {}; try { G = JSON.parse((await getSetting(env, 'google_reviews')) || '{}'); } catch { G = {}; }
  const google = (G.reviews || []).filter(r => r.text && r.text.length <= 230).map(r => ({ text: r.text, who: `${r.name || 'Kundin'} · Google-Bewertung` }));
  const pool = google.length ? google : REVIEWS.map(text => ({ text, who: 'Kundenstimme' }));
  const r = pick(pool, n);
  const heads = ['Das sagen _Kundinnen._', 'In ihren _Worten._', 'Ehrlich _gesagt._', 'Echtes _Feedback._'];
  return { label: 'Kundenstimme', headline: pick(heads, n), body: `„${r.text}“\n– ${r.who}` };
}

/** Ergebnis-Story mit einem Kundinnen-Foto (nur mit Einwilligung, gleiches Foto frühestens nach 10 Tagen wieder) */
async function resultStoryJob(env, at, n) {
  const since = new Date(new Date(at) - 10 * 864e5).toISOString();
  const keys = Object.keys(TREATMENTS);
  const m = await env.DB.prepare(`SELECT m.id, m.role, s.treatment FROM media m JOIN sets s ON s.id = m.set_id
      WHERE m.kind = 'photo' AND s.consent = 1 AND m.role IN ('danach','abgeheilt','ergebnis') AND s.treatment IN (${keys.map(() => '?').join(',')})
      AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.kind = 'story' AND p.scheduled_at > ? AND p.job_json LIKE '%media:' || m.id || '%')
      ORDER BY m.used_count, RANDOM() LIMIT 1`).bind(...keys, since).first();
  if (!m) return null;
  await env.DB.prepare('UPDATE media SET used_count = used_count + 1 WHERE id = ?').bind(m.id).run();
  const t = TREATMENTS[m.treatment];
  const tag = { danach: 'Direkt danach', abgeheilt: 'Abgeheilt', ergebnis: 'Ergebnis' }[m.role];
  return { format: 'story', theme: 'edition', label: 'Echte Ergebnisse',
    slides: [{ type: 'resultstory', image: 'media:' + m.id, headline: pick(RESULT_LINES[m.treatment] || [t.sub], n), tag: `${tag} · ${t.label}`, pill: 'Link in der Bio' }] };
}

export { fallbackCaption };
