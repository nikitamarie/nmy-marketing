// Eigene Instagram-Beiträge in der Story teilen („Neu im Feed“-Story im NMY-Stil).
// Hinweis: Den Instagram-eigenen Link-Sticker zum Beitrag kann die Schnittstelle nicht setzen –
// dafür gibt es in der App zusätzlich „Mit Link-Sticker teilen“ (öffnet den Beitrag in Instagram).
import { json, err, uid, getSetting, berlinDay, berlinToUtc } from './util.js';
import { insertPost, nextStorySlot } from './planner.js';

const firstLine = c => String(c || '').split('\n').map(l => l.trim()).find(l => l && !l.startsWith('#')) || '';
const isReelOf = (post, ig) => post?.kind === 'reel' || /REELS|VIDEO/.test(ig?.product_type || ig?.media_type || '');
const short = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + ' …' : s);

/** Bildquelle für den Beitrag: eigenes gerendertes Bild (R2) oder Vorschaubild von Instagram */
async function sourceFor(env, igMediaId) {
  const post = await env.DB.prepare("SELECT * FROM posts WHERE ig_media_id = ? AND status = 'veroeffentlicht'").bind(igMediaId).first();
  const ig = await env.DB.prepare('SELECT * FROM ig_media WHERE id = ?').bind(igMediaId).first();
  const keys = JSON.parse(post?.assets_json || '[]');
  let image = keys[0] ? 'r2:' + keys[0] : ig?.thumb ? 'url:' + ig.thumb : null;
  if (!image && post?.ig_media_id) {
    // frisch veröffentlicht, noch nicht synchronisiert -> Vorschaubild direkt bei Instagram holen
    const { mediaImage } = await import('./instagram.js');
    const u = await mediaImage(env, igMediaId).catch(() => null);
    if (u) image = 'url:' + u;
  }
  const caption = post?.caption || ig?.caption || '';
  const job = post?.job_json ? JSON.parse(post.job_json) : null;
  const hook = (job?.slides?.[0]?.headline || firstLine(caption)).replace(/\*\*/g, '');
  const isReel = post?.kind === 'reel' || /REELS|VIDEO/.test(ig?.product_type || ig?.media_type || '');
  // Steht der Hook schon im Bild (von der App gestaltet), darunter nur kurzer Hinweis statt Wiederholung
  const textInImage = !!keys[0] && job?.slides?.[0] && ['cover', 'photo'].includes(job.slides[0].type);
  return { image, hook: textInImage ? (isReelOf(post, ig) ? 'Neues _Reel_ ist online.' : 'Neuer Beitrag ist _online._') : short(hook, 70), isReel, ai_text: post?.ai_text || 0, ai_image: post?.ai_image || 0, permalink: post?.ig_permalink || ig?.permalink };
}

export async function createRepost(env, igMediaId, when = 'spaeter') {
  const src = await sourceFor(env, igMediaId);
  if (!src.image) throw new Error('Für diesen Beitrag ist kein Bild verfügbar');
  let at;
  if (when === 'jetzt') at = new Date(Date.now() + 2 * 6e4).toISOString();
  else if (when === 'morgen') { const d = berlinDay(1); at = berlinToUtc(d.y, d.m, d.d, '12:30').toISOString(); } // eigener Platz mittags am Folgetag
  else at = await nextStorySlot(env);
  const id = uid('p_');
  await insertPost(env, {
    id, kind: 'story', topic: 'repost', repost_of: igMediaId, scheduled_at: at, aiText: !!src.ai_text, aiImage: !!src.ai_image,
    job: { format: 'story', theme: 'edition', label: src.isReel ? 'Neues Reel' : 'Neu im Feed',
      slides: [{ type: 'repost', image: src.image, headline: src.hook || 'Neuer Beitrag', pill: src.isReel ? 'Jetzt im Profil ansehen' : 'Jetzt im Profil ansehen', reel: src.isReel }] },
  });
  return { id, scheduled_at: at };
}

export async function repostHandler(request, env, ctx, renderPending) {
  const { ig_media_id, when } = await request.json().catch(() => ({}));
  if (!ig_media_id) return err('Beitrag fehlt');
  try {
    const r = await createRepost(env, String(ig_media_id), when);
    ctx.waitUntil(renderPending(env, 2).catch(() => {}));
    return json(r);
  } catch (e) { return err(e.message); }
}

/** Cron: neue Feed-Beiträge am nächsten Tag automatisch in der Story teilen (abschaltbar) */
export async function autoRepost(env) {
  if ((await getSetting(env, 'auto_repost', '1')) === '0') return 0;
  const { results } = await env.DB.prepare(`SELECT ig_media_id FROM posts p WHERE p.status = 'veroeffentlicht' AND p.kind IN ('carousel','image','reel')
    AND p.ig_media_id IS NOT NULL AND p.published_at >= ? AND NOT EXISTS (SELECT 1 FROM posts r WHERE r.repost_of = p.ig_media_id)`)
    .bind(new Date(Date.now() - 2 * 864e5).toISOString()).all();
  let n = 0;
  for (const r of results) { try { await createRepost(env, r.ig_media_id, 'morgen'); n++; } catch (e) { console.log('Repost:', e.message); } }
  return n;
}

export async function listIgMedia(env) {
  const { results } = await env.DB.prepare(`SELECT m.id, m.caption, m.media_type, m.product_type, m.permalink, m.thumb, m.ts, m.reach,
      (SELECT COUNT(*) FROM posts r WHERE r.repost_of = m.id) AS reposts FROM ig_media m ORDER BY m.ts DESC LIMIT 60`).all();
  return json(results.map(m => ({ ...m, title: short(firstLine(m.caption), 80) })));
}
