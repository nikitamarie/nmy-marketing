// Instagram-Anbindung über Metas "Unified Login" (Facebook Login for Business + Konfiguration).
// Liefert einen System-User-Token ohne Ablauf; veröffentlicht wird über graph.facebook.com/{ig-id}.
import { json, err, getSetting, setSetting, getSettings, randomToken, notify, fmtBerlin } from './util.js';
import { signedUrl } from './media.js';
import { nextFeedSlot, nextStorySlot } from './planner.js';

const GRAPH = 'https://graph.facebook.com/v25.0';

export async function igFetch(env, path, params = {}, method = 'GET') {
  const token = await getSetting(env, 'ig_token');
  if (!token) throw new Error('Instagram ist nicht verbunden');
  const base = (await getSetting(env, 'ig_api')) || GRAPH;
  const url = new URL(path.startsWith('http') ? path : `${base}/${path}`);
  const body = new URLSearchParams({ ...params, access_token: token });
  let res;
  if (method === 'GET' || method === 'DELETE') {
    for (const [k, v] of body) url.searchParams.set(k, v);
    res = await fetch(url, { method });
  } else {
    res = await fetch(url, { method, body });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error?.message || `Instagram ${res.status}`);
  return data;
}

const fail = (url, why) => Response.redirect(`${url.origin}/#einstellungen?ig=fehler&grund=${encodeURIComponent(why).slice(0, 300)}`, 302);

// ---------- Verbinden (OAuth) ----------
export async function oauthStart(env, url) {
  const s = await getSettings(env, ['fb_app_id', 'ig_config_id']);
  if (!s.fb_app_id || !s.ig_config_id) return new Response('Bitte zuerst App-ID, App-Geheimcode und Konfigurations-ID in den Einstellungen eintragen.', { status: 400 });
  const state = randomToken(12);
  await setSetting(env, 'ig_oauth_state', state);
  const auth = new URL('https://www.facebook.com/dialog/oauth');
  auth.search = new URLSearchParams({ client_id: s.fb_app_id, config_id: s.ig_config_id, redirect_uri: `${url.origin}/auth/instagram/callback`, response_type: 'code', state });
  return Response.redirect(auth.toString(), 302);
}

export async function oauthCallback(env, url) {
  const s = await getSettings(env, ['fb_app_id', 'fb_app_secret', 'ig_oauth_state']);
  if (url.searchParams.get('error')) return fail(url, url.searchParams.get('error_description') || url.searchParams.get('error'));
  if (!url.searchParams.get('code') || url.searchParams.get('state') !== s.ig_oauth_state) return fail(url, 'Anmeldung abgebrochen oder abgelaufen');
  const tokenUrl = new URL(`${GRAPH}/oauth/access_token`);
  tokenUrl.search = new URLSearchParams({ client_id: s.fb_app_id, client_secret: s.fb_app_secret, redirect_uri: `${url.origin}/auth/instagram/callback`, code: url.searchParams.get('code') });
  const tok = await (await fetch(tokenUrl)).json().catch(() => ({}));
  if (!tok.access_token) return fail(url, tok.error?.message || 'Kein Zugriffstoken erhalten (App-Geheimcode prüfen)');
  await setSetting(env, 'ig_api', GRAPH);
  await setSetting(env, 'ig_token', tok.access_token);
  await setSetting(env, 'ig_token_at', Date.now());
  let accounts;
  try { accounts = (await igFetch(env, 'me/assigned_instagram_accounts', { fields: 'id,username', limit: '100' })).data || []; }
  catch (e) { return fail(url, 'Instagram-Konto nicht gefunden: ' + e.message); }
  const acc = accounts.find(a => /nmy/i.test(a.username || '')) || accounts[0];
  if (!acc) return fail(url, 'Bei der Anmeldung wurde kein Instagram-Konto freigegeben');
  await setSetting(env, 'ig_user_id', acc.id);
  await setSetting(env, 'ig_username', acc.username);
  await setSetting(env, 'warned_not_connected', null);
  await notify(env, 'Instagram verbunden', `@${acc.username} ist jetzt mit der App verbunden. Beiträge werden ab jetzt automatisch veröffentlicht.`);
  return Response.redirect(`${url.origin}/#einstellungen?ig=ok`, 302);
}

/** Alternative ohne Login-Dialog: Zugriffstoken aus dem Meta-Dashboard ("Zugriffstokens generieren") einfügen.
 *  Erkennt automatisch, ob es ein Facebook- (graph.facebook.com) oder Instagram-Token (graph.instagram.com) ist. */
export async function saveManualToken(request, env) {
  const { token = '' } = await request.json().catch(() => ({}));
  const t = token.trim();
  if (t.length < 30) return err('Das sieht nicht nach einem Zugriffstoken aus');
  const get = async (u) => { const r = await fetch(u); return r.json().catch(() => ({})); };
  let api = null, acc = null;
  // 1) Instagram-Token (Instagram-Login)
  const ig = await get(`https://graph.instagram.com/v25.0/me?fields=user_id,username&access_token=${encodeURIComponent(t)}`);
  if (ig.username) { api = 'https://graph.instagram.com/v25.0'; acc = { id: ig.user_id || ig.id, username: ig.username }; }
  // 2) Facebook-/System-User-Token
  if (!acc) {
    const a = await get(`${GRAPH}/me/assigned_instagram_accounts?fields=id,username&access_token=${encodeURIComponent(t)}`);
    if (a.data?.length) { api = GRAPH; acc = a.data.find(x => /nmy/i.test(x.username || '')) || a.data[0]; }
  }
  if (!acc) {
    const pages = await get(`${GRAPH}/me/accounts?fields=instagram_business_account{id,username}&access_token=${encodeURIComponent(t)}`);
    const page = (pages.data || []).find(p => p.instagram_business_account);
    if (page) { api = GRAPH; acc = page.instagram_business_account; }
  }
  if (!acc) return err('Mit diesem Token wurde kein Instagram-Konto gefunden. ' + (ig.error?.message || ''));
  await setSetting(env, 'ig_api', api);
  await setSetting(env, 'ig_token', t);
  await setSetting(env, 'ig_token_at', Date.now());
  await setSetting(env, 'ig_user_id', acc.id);
  await setSetting(env, 'ig_username', acc.username);
  await setSetting(env, 'warned_not_connected', null);
  await notify(env, 'Instagram verbunden', `@${acc.username} ist jetzt mit der App verbunden. Beiträge werden ab jetzt automatisch veröffentlicht.`);
  return json({ ok: true, username: acc.username });
}

/** System-User-Token läuft nicht ab. Wir prüfen nur einmal täglich, ob er noch gültig ist. */
export async function refreshTokenIfNeeded(env) {
  const me = await getSetting(env, 'ig_user_id');
  if (!me) return;
  // Instagram-Tokens laufen nach 60 Tagen ab -> alle 20 Tage verlängern
  if (((await getSetting(env, 'ig_api')) || '').includes('graph.instagram.com')) {
    const at = Number(await getSetting(env, 'ig_token_at', '0'));
    if (Date.now() - at > 20 * 864e5) {
      try {
        const d = await igFetch(env, 'https://graph.instagram.com/refresh_access_token', { grant_type: 'ig_refresh_token' });
        if (d.access_token) { await setSetting(env, 'ig_token', d.access_token); await setSetting(env, 'ig_token_at', Date.now()); }
      } catch (e) { console.log('Token-Verlängerung:', e.message); }
    }
  }
  try { await igFetch(env, me, { fields: 'id' }); }
  catch (e) {
    if (!(await getSetting(env, 'warned_token'))) {
      await setSetting(env, 'warned_token', '1');
      await notify(env, '⚠️ Instagram neu verbinden', 'Die Verbindung zu Instagram funktioniert nicht mehr (' + e.message + '). Bitte in der App unter „Mehr → Instagram“ neu verbinden.');
    }
    return;
  }
  await setSetting(env, 'warned_token', null);
}

// ---------- Veröffentlichen ----------
async function containerStatus(env, id) {
  const d = await igFetch(env, id, { fields: 'status_code,status' });
  return d.status_code; // FINISHED | IN_PROGRESS | ERROR | EXPIRED | PUBLISHED
}

const ALT = {
  'powder-brows': 'Powder Brows – Permanent Make-up Augenbrauen bei NMY Cosmetics in Seevetal bei Hamburg-Harburg',
  'lip-blush': 'Lip Blush – Permanent Make-up Lippen bei NMY Cosmetics in Seevetal bei Hamburg-Harburg',
  lashlifting: 'Lashlifting bei NMY Cosmetics in Seevetal',
  browlifting: 'Browlifting bei NMY Cosmetics in Seevetal',
  microneedling: 'Microneedling bei NMY Cosmetics in Seevetal',
};

async function createContainer(env, origin, post) {
  const me = await getSetting(env, 'ig_user_id');
  const keys = JSON.parse(post.assets_json || '[]');
  const urlOf = k => signedUrl(env, origin, k);
  // KI-Kennzeichnung (Instagram-Label „KI-Info“), sobald KI für Text oder Bild genutzt wurde
  const ai = post.ai_text || post.ai_image ? { is_ai_generated: 'true' } : {};
  const caption = post.caption || '';
  const alt = ALT[post.treatment] || 'Permanent Make-up bei NMY Cosmetics in Seevetal';
  // Bildbeschreibung (Alt-Text) hilft der Instagram-Suche; falls nicht unterstützt, ohne erneut versuchen
  const create = async (params) => {
    try { return (await igFetch(env, `${me}/media`, params, 'POST')).id; }
    catch (e) {
      if (params.alt_text && /alt_text/i.test(e.message)) { const { alt_text, ...rest } = params; return (await igFetch(env, `${me}/media`, rest, 'POST')).id; }
      throw e;
    }
  };
  // Sicherheitssperre: Videos nur ohne Originalton veröffentlichen
  if (post.video_key) {
    const v = await env.DB.prepare('SELECT edit FROM media WHERE r2_key = ?').bind(post.video_key).first();
    if (!v || !['stumm', 'stumm-bestaetigt', 'original-bestaetigt'].includes(v.edit)) throw new Error('Video hat noch Originalton – wird nicht veröffentlicht. Bitte erneut hochladen.');
  }
  if (post.kind === 'story' && post.video_key) return create({ media_type: 'STORIES', video_url: await urlOf(post.video_key), ...ai });
  if (post.kind === 'story') return create({ media_type: 'STORIES', image_url: await urlOf(keys[0]), ...ai });
  if (post.kind === 'reel') return create({ media_type: 'REELS', video_url: await urlOf(post.video_key), caption, share_to_feed: 'true', ...(keys[0] ? { cover_url: await urlOf(keys[0]) } : {}), ...ai });
  if (keys.length === 1) return create({ image_url: await urlOf(keys[0]), caption, alt_text: alt, ...ai });
  const children = [];
  for (const k of keys.slice(0, 10)) children.push(await create({ image_url: await urlOf(k), is_carousel_item: 'true', alt_text: alt }));
  // Bei Karussells gehört das KI-Label nur an den Karussell-Container
  return create({ media_type: 'CAROUSEL', children: children.join(','), caption, ...ai });
}

/** Fällige Beiträge veröffentlichen. Reels brauchen Verarbeitungszeit -> zweistufig über mehrere Cron-Läufe. */
export async function publishDue(env, origin) {
  const connected = await getSetting(env, 'ig_user_id');
  // Überfällige Beiträge (> 3 Std.) nicht nachträglich auf einmal posten, sondern neu einplanen
  const stale = new Date(Date.now() - 3 * 36e5).toISOString();
  const { results: old } = await env.DB.prepare("SELECT id, kind FROM posts WHERE status = 'geplant' AND scheduled_at < ? AND ig_container IS NULL").bind(stale).all();
  for (const p of old) {
    const at = p.kind === 'story' ? await nextStorySlot(env, null, { displace: true }) : await nextFeedSlot(env);
    if (at) await env.DB.prepare('UPDATE posts SET scheduled_at = ? WHERE id = ?').bind(at, p.id).run();
  }
  const { results } = await env.DB.prepare("SELECT * FROM posts WHERE status = 'geplant' AND scheduled_at <= ? ORDER BY scheduled_at LIMIT 5")
    .bind(new Date().toISOString()).all();
  if (!results.length) return 0;
  if (!connected) {
    if (!(await getSetting(env, 'warned_not_connected'))) {
      await setSetting(env, 'warned_not_connected', '1');
      await notify(env, 'Beitrag wartet', 'Ein Beitrag ist fällig, aber Instagram ist noch nicht verbunden. Bitte in der App unter Einstellungen verbinden.');
    }
    return 0;
  }
  let published = 0;
  const me = connected;
  for (const post of results) {
    if (post.manual) {
      await env.DB.prepare("UPDATE posts SET status = 'bereit' WHERE id = ?").bind(post.id).run();
      const what = post.kind === 'reel' ? 'Reel' : 'Story-Video';
      await notify(env, `🎵 ${what} bereit zum Posten`, `Dein ${what} ist fertig vorbereitet (ohne Originalton). Öffne die NMY-App → Plan → „In Instagram öffnen“ und wähle dort die Musik. Abmahnsicher: Meta Sound Collection bzw. ruhige Instrumentals ohne bekannten Interpreten – keine Chart-Hits, kein „Originalton“ anderer Accounts. Die Caption ist schon kopiert.`, `${origin}/#plan`);
      continue;
    }
    try {
      let container = post.ig_container;
      if (!container) {
        container = await createContainer(env, origin, post);
        await env.DB.prepare('UPDATE posts SET ig_container = ?, attempts = attempts + 1 WHERE id = ?').bind(container, post.id).run();
      }
      const status = await containerStatus(env, container);
      if (status === 'IN_PROGRESS') continue; // nächster Lauf
      if (status === 'ERROR' || status === 'EXPIRED') throw new Error('Instagram konnte die Datei nicht verarbeiten (' + status + ')');
      const pub = await igFetch(env, `${me}/media_publish`, { creation_id: container }, 'POST');
      let permalink = null;
      try { permalink = (await igFetch(env, pub.id, { fields: 'permalink' })).permalink; } catch { /* Stories haben keinen Permalink */ }
      await env.DB.prepare("UPDATE posts SET status = 'veroeffentlicht', published_at = ?, ig_media_id = ?, ig_permalink = ?, error = NULL WHERE id = ?")
        .bind(new Date().toISOString(), pub.id, permalink, post.id).run();
      const what = { carousel: 'Beitrag', reel: 'Reel', story: 'Story', image: 'Beitrag' }[post.kind];
      await notify(env, `✅ ${what} ist online`, `${what} „${(post.caption || '').split('\n')[0].slice(0, 80) || post.topic || ''}“ wurde am ${fmtBerlin(new Date().toISOString())} veröffentlicht.`, permalink || '');
      published++;
    } catch (e) {
      const final = post.attempts >= 3 || /Originalton/.test(e.message);
      await env.DB.prepare(`UPDATE posts SET ${final ? "status = 'fehler'," : ''} error = ?, ig_container = NULL WHERE id = ?`).bind(e.message, post.id).run();
      if (final) await notify(env, '⚠️ Veröffentlichung fehlgeschlagen', `${post.kind}: ${e.message}`);
    }
  }
  return published;
}

// ---------- Kennzahlen ----------
const METRICS = ['reach', 'saved', 'shares', 'views', 'total_interactions'];

export async function syncInsights(env) {
  const me = await getSetting(env, 'ig_user_id');
  if (!me) return 0;
  const list = await igFetch(env, `${me}/media`, { fields: 'id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count', limit: '50' });
  let n = 0;
  for (const m of list.data || []) {
    const vals = {};
    for (const metric of METRICS) {
      try {
        const d = await igFetch(env, `${m.id}/insights`, { metric });
        vals[metric] = d.data?.[0]?.values?.[0]?.value ?? d.data?.[0]?.total_value?.value ?? null;
      } catch { vals[metric] = null; }
    }
    await env.DB.prepare(`INSERT INTO ig_media (id, caption, media_type, product_type, permalink, thumb, ts, likes, comments, reach, saved, shares, views, interactions, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET caption=excluded.caption, likes=excluded.likes, comments=excluded.comments,
      reach=excluded.reach, saved=excluded.saved, shares=excluded.shares, views=excluded.views, interactions=excluded.interactions, thumb=excluded.thumb, updated_at=excluded.updated_at`)
      .bind(m.id, m.caption || '', m.media_type, m.media_product_type, m.permalink, m.thumbnail_url || m.media_url || null, m.timestamp,
        m.like_count ?? null, m.comments_count ?? null, vals.reach, vals.saved, vals.shares, vals.views, vals.total_interactions, new Date().toISOString()).run();
    n++;
  }
  // Konto-Werte des Tages
  try {
    const acc = await igFetch(env, me, { fields: 'followers_count' });
    const day = new Date().toISOString().slice(0, 10);
    const daily = {};
    for (const metric of ['reach', 'profile_views', 'website_clicks']) {
      try {
        const d = await igFetch(env, `${me}/insights`, { metric, period: 'day', metric_type: 'total_value' });
        daily[metric] = d.data?.[0]?.total_value?.value ?? null;
      } catch { daily[metric] = null; }
    }
    await env.DB.prepare(`INSERT INTO ig_daily (day, followers, reach, profile_views, link_clicks) VALUES (?,?,?,?,?)
      ON CONFLICT(day) DO UPDATE SET followers=excluded.followers, reach=excluded.reach, profile_views=excluded.profile_views, link_clicks=excluded.link_clicks`)
      .bind(day, acc.followers_count ?? null, daily.reach, daily.profile_views, daily.website_clicks).run();
  } catch (e) { console.log('Konto-Insights:', e.message); }
  return n;
}

export async function status(env) {
  const s = await getSettings(env, ['ig_username', 'fb_app_id', 'ig_token_at']);
  return json({ connected: !!s.ig_username, username: s.ig_username || null, hasApp: !!s.fb_app_id, tokenAge: s.ig_token_at ? Math.round((Date.now() - +s.ig_token_at) / 864e5) : null });
}

export { err };

/** Vorschaubild-URL eines veröffentlichten Beitrags (für Story-Reposts) */
export async function mediaImage(env, igMediaId) {
  const d = await igFetch(env, igMediaId, { fields: 'media_type,media_url,thumbnail_url,children{media_url,media_type}' });
  if (d.media_type === 'VIDEO') return d.thumbnail_url || null;
  if (d.media_type === 'CAROUSEL_ALBUM') return d.media_url || d.children?.data?.find(c => c.media_type === 'IMAGE')?.media_url || null;
  return d.media_url || null;
}
