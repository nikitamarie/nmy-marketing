// Buchungen (Treatwell über Gmail, manuell) + Auswertung: Was bringt Buchungen?
import { json, err, uid, getSetting, safeEqual, fmtBerlin } from './util.js';
import { TREATMENTS } from './brand.js';
import { analyse, trendRadar, filmIdeas } from './gemini.js';

const TREATMENT_WORDS = [
  [/lippen|lip/i, 'lip-blush'],
  [/permanent|pmu|powder|ombre|augenbrauen\s*-?\s*pmu/i, 'powder-brows'],
  [/wimpernlifting|lash/i, 'lashlifting'],
  [/augenbrauenlifting|brow ?lift/i, 'browlifting'],
  [/microneedling/i, 'microneedling'],
];
const guessTreatment = text => (TREATMENT_WORDS.find(([r]) => r.test(text)) || [])[1] || null;

async function checkIngest(request, env) {
  const token = await getSetting(env, 'ingest_token');
  return token && safeEqual(request.headers.get('x-ingest-token') || '', token);
}

/** Vom Google-Apps-Script: neue Treatwell-Mails */
export async function ingestBookings(request, env) {
  if (!(await checkIngest(request, env))) return err('Nicht erlaubt', 403);
  const { mails = [] } = await request.json().catch(() => ({}));
  let added = 0;
  for (const m of mails.slice(0, 50)) {
    const text = `${m.subject || ''} ${m.snippet || ''}`;
    const cancelled = /storn|abgesagt|cancel/i.test(text);
    if (!cancelled && !/buchung|termin|booking|reserv/i.test(text)) continue;
    const r = await env.DB.prepare(`INSERT INTO bookings (id, source, status, treatment, booked_at, subject) VALUES (?, 'treatwell', ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING`).bind('tw_' + m.id, cancelled ? 'storniert' : 'gebucht', guessTreatment(text), new Date(m.date || Date.now()).toISOString(), (m.subject || '').slice(0, 200)).run();
    if (r.meta.changes) added++;
  }
  return json({ added });
}

/** Vom Google-Apps-Script: offene Benachrichtigungen abholen (werden als E-Mail verschickt) */
export async function pullNotifications(request, env) {
  if (!(await checkIngest(request, env))) return err('Nicht erlaubt', 403);
  const { results } = await env.DB.prepare('SELECT * FROM notifications WHERE sent = 0 ORDER BY id LIMIT 20').all();
  if (results.length) await env.DB.prepare(`UPDATE notifications SET sent = 1 WHERE id IN (${results.map(() => '?').join(',')})`).bind(...results.map(r => r.id)).run();
  return json(results);
}

export async function addBooking(request, env) {
  const { source = 'whatsapp', treatment = null } = await request.json().catch(() => ({}));
  await env.DB.prepare('INSERT INTO bookings (id, source, treatment, booked_at) VALUES (?, ?, ?, ?)').bind(uid('b_'), source, treatment, new Date().toISOString()).run();
  return json({ ok: true });
}

export async function deleteBooking(env, id) {
  await env.DB.prepare('DELETE FROM bookings WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

const daysAgo = d => new Date(Date.now() - d * 864e5).toISOString();

async function collect(env) {
  const q = (sql, ...b) => env.DB.prepare(sql).bind(...b).all().then(r => r.results);
  const since30 = daysAgo(30), since84 = daysAgo(84);
  const bookings = await q("SELECT id, source, status, treatment, booked_at, subject FROM bookings WHERE booked_at >= ? ORDER BY booked_at DESC", since84);
  const clicks = await q("SELECT target, ref, ts FROM clicks WHERE ts >= datetime('now','-84 days')");
  const published = await q("SELECT id, kind, topic, treatment, published_at, ig_media_id, ig_permalink, caption FROM posts WHERE status = 'veroeffentlicht' AND published_at >= ? ORDER BY published_at DESC", since84);
  const media = await q('SELECT * FROM ig_media ORDER BY ts DESC LIMIT 60');
  const daily = await q('SELECT * FROM ig_daily ORDER BY day DESC LIMIT 60');
  return { bookings, clicks, published, media, daily, since30 };
}

function weekKey(iso) {
  const d = new Date(iso);
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)));
  return monday.toISOString().slice(0, 10);
}

export async function stats(env) {
  const { bookings, clicks, published, media, daily, since30 } = await collect(env);
  const active = bookings.filter(b => b.status === 'gebucht');
  const last30 = active.filter(b => b.booked_at >= since30);
  const baseline = Number(await getSetting(env, 'baseline_bookings', '3.5'));

  // 12 Wochen: Buchungen, Bio-Klicks, veröffentlichte Beiträge
  const weeks = [];
  for (let i = 11; i >= 0; i--) weeks.push(weekKey(daysAgo(i * 7)));
  const perWeek = weeks.map(w => ({
    week: w,
    bookings: active.filter(b => weekKey(b.booked_at) === w).length,
    clicks: clicks.filter(c => c.target === 'treatwell' && weekKey(c.ts.replace(' ', 'T') + 'Z') === w).length,
    posts: published.filter(p => p.kind !== 'story' && weekKey(p.published_at) === w).length,
  }));

  // Welche Beiträge stehen vor Buchungen? (Buchung innerhalb von 72 h nach Veröffentlichung)
  const feed = published.filter(p => p.kind !== 'story');
  const attribution = feed.map(p => {
    const t0 = new Date(p.published_at).getTime();
    const near = active.filter(b => { const t = new Date(b.booked_at).getTime(); return t >= t0 && t - t0 <= 72 * 36e5; }).length;
    const ig = media.find(m => m.id === p.ig_media_id);
    return { id: p.id, kind: p.kind, topic: p.topic, treatment: p.treatment, published: fmtBerlin(p.published_at), permalink: p.ig_permalink, bookings72h: near,
      reach: ig?.reach ?? null, saved: ig?.saved ?? null, title: (p.caption || '').split('\n')[0].slice(0, 70) };
  });

  const top = [...media].filter(m => m.reach != null).sort((a, b) => (b.saved * 3 + b.shares * 3 + b.reach / 50) - (a.saved * 3 + a.shares * 3 + a.reach / 50)).slice(0, 5)
    .map(m => ({ permalink: m.permalink, type: m.product_type || m.media_type, reach: m.reach, saved: m.saved, shares: m.shares, title: (m.caption || '').split('\n')[0].slice(0, 70), ts: m.ts }));

  // Bester Wochentag/Uhrzeit nach Reichweite (ab 6 Beiträgen sinnvoll)
  const slots = {};
  for (const m of media.filter(m => m.reach != null)) {
    const p = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(m.ts));
    const key = `${p.find(x => x.type === 'weekday').value} ${p.find(x => x.type === 'hour').value} Uhr`;
    (slots[key] ||= []).push(m.reach);
  }
  const bestSlots = Object.entries(slots).filter(([, v]) => v.length >= 2).map(([k, v]) => ({ slot: k, avgReach: Math.round(v.reduce((a, b) => a + b, 0) / v.length), n: v.length }))
    .sort((a, b) => b.avgReach - a.avgReach).slice(0, 3);

  const { results: ins } = await env.DB.prepare("SELECT kind, content, created_at FROM insights WHERE id IN (SELECT MAX(id) FROM insights GROUP BY kind)").all();
  return json({
    kpi: {
      bookings30: last30.length,
      baseline,
      treatwell30: last30.filter(b => b.source === 'treatwell').length,
      other30: last30.filter(b => b.source !== 'treatwell').length,
      cancelled30: bookings.filter(b => b.status === 'storniert' && b.booked_at >= since30).length,
      clicks30: clicks.filter(c => c.target === 'treatwell' && c.ts.replace(' ', 'T') + 'Z' >= since30).length,
      whatsapp30: clicks.filter(c => c.target === 'whatsapp' && c.ts.replace(' ', 'T') + 'Z' >= since30).length,
      posts30: published.filter(p => p.published_at >= since30 && p.kind !== 'story').length,
      stories30: published.filter(p => p.published_at >= since30 && p.kind === 'story').length,
      followers: daily[0]?.followers ?? null,
      followersDelta: daily.length > 1 && daily[0].followers != null && daily[daily.length - 1].followers != null ? daily[0].followers - daily[daily.length - 1].followers : null,
    },
    byTreatment: Object.entries(last30.reduce((a, b) => ((a[b.treatment || 'unbekannt'] = (a[b.treatment || 'unbekannt'] || 0) + 1), a), {}))
      .map(([k, v]) => ({ treatment: TREATMENTS[k]?.label || 'Unbekannt', count: v })),
    perWeek, attribution: attribution.slice(0, 15), top, bestSlots,
    recentBookings: bookings.slice(0, 10).map(b => ({ ...b, when: fmtBerlin(b.booked_at), treatment: TREATMENTS[b.treatment]?.label || b.treatment })),
    insights: ins,
  });
}

export async function runAnalysis(env) {
  const data = await collect(env);
  const summary = {
    startwert_buchungen_pro_monat: '2–5',
    buchungen: data.bookings.map(b => ({ quelle: b.source, status: b.status, behandlung: b.treatment, am: b.booked_at })),
    bio_klicks: data.clicks.map(c => ({ ziel: c.target, am: c.ts })),
    beitraege: data.media.map(m => ({ typ: m.product_type || m.media_type, am: m.ts, hook: (m.caption || '').split('\n')[0].slice(0, 90), reichweite: m.reach, gespeichert: m.saved, geteilt: m.shares, likes: m.likes, kommentare: m.comments })),
    konto: data.daily.slice(0, 30),
  };
  const out = await analyse(env, summary);
  if (!out) return err('Für die Analyse bitte zuerst einen Gemini-Schlüssel in den Einstellungen eintragen.');
  await env.DB.prepare("INSERT INTO insights (kind, content) VALUES ('analyse', ?)").bind(out.text).run();
  return json({ text: out.text });
}

export async function runTrends(env) {
  const out = await trendRadar(env);
  if (!out) return err('Für den Trend-Radar bitte zuerst einen Gemini-Schlüssel in den Einstellungen eintragen.');
  const text = out.text + (out.sources.length ? '\n\nQuellen:\n' + out.sources.slice(0, 6).map(s => `- ${s.title}: ${s.uri}`).join('\n') : '');
  await env.DB.prepare("INSERT INTO insights (kind, content) VALUES ('trends', ?)").bind(text).run();
  return json({ text });
}

export async function runFilmIdeas(env) {
  const { results } = await env.DB.prepare("SELECT caption, saved, shares, reach FROM ig_media WHERE reach IS NOT NULL ORDER BY (COALESCE(saved,0)*3 + COALESCE(shares,0)*4 + reach/100.0) DESC LIMIT 3").all();
  const text = await filmIdeas(env, results.map(r => `"${(r.caption || '').split('\n')[0].slice(0, 60)}" (${r.reach} Reichweite, ${r.saved ?? 0} gespeichert)`));
  if (!text) return err('Für Filmideen bitte zuerst einen Gemini-Schlüssel in den Einstellungen eintragen.');
  await env.DB.prepare("INSERT INTO insights (kind, content) VALUES ('filmideen', ?)").bind(text).run();
  return json({ text });
}
