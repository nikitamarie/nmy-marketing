// Instagram API mit Instagram-Login: Verbinden, Veröffentlichen, Kennzahlen, Token erneuern.
import { json, err, getSetting, setSetting, getSettings, randomToken, notify, fmtBerlin } from './util.js';
import { signedUrl } from './media.js';

const SCOPES = ['instagram_business_basic', 'instagram_business_content_publish', 'instagram_business_manage_insights', 'instagram_business_manage_comments'].join(',');

async function igFetch(env, path, params = {}, method = 'GET') {
  const token = await getSetting(env, 'ig_token');
  if (!token) throw new Error('Instagram ist nicht verbunden');
  const url = new URL(path.startsWith('http') ? path : `${env.IG_API}/${path}`);
  const body = new URLSearchParams({ ...params, access_token: token });
  let res;
  if (method === 'GET') {
    for (const [k, v] of body) url.searchParams.set(k, v);
    res = await fetch(url);
  } else {
    res = await fetch(url, { method, body });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error?.message || `Instagram ${res.status}`);
  return data;
}

// ---------- Verbinden (OAuth) ----------
export async function oauthStart(env, url) {
  const appId = await getSetting(env, 'ig_app_id');
  if (!appId) return new Response('Bitte zuerst App-ID und App-Geheimnis in den Einstellungen eintragen.', { status: 400 });
  const state = randomToken(12);
  await setSetting(env, 'ig_oauth_state', state);
  const auth = new URL('https://www.instagram.com/oauth/authorize');
  auth.search = new URLSearchParams({ client_id: appId, redirect_uri: `${url.origin}/auth/instagram/callback`, response_type: 'code', scope: SCOPES, state, enable_fb_login: '0', force_authentication: '1' });
  return Response.redirect(auth.toString(), 302);
}

export async function oauthCallback(env, url) {
  const s = await getSettings(env, ['ig_app_id', 'ig_app_secret', 'ig_oauth_state']);
  if (!url.searchParams.get('code') || url.searchParams.get('state') !== s.ig_oauth_state) return Response.redirect(`${url.origin}/#einstellungen?ig=fehler`, 302);
  const form = new URLSearchParams({ client_id: s.ig_app_id, client_secret: s.ig_app_secret, grant_type: 'authorization_code', redirect_uri: `${url.origin}/auth/instagram/callback`, code: url.searchParams.get('code').replace(/#_$/, '') });
  const short = await (await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body: form })).json();
  if (!short.access_token) return Response.redirect(`${url.origin}/#einstellungen?ig=fehler`, 302);
  const longUrl = new URL('https://graph.instagram.com/access_token');
  longUrl.search = new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: s.ig_app_secret, access_token: short.access_token });
  const long = await (await fetch(longUrl)).json();
  const token = long.access_token || short.access_token;
  await setSetting(env, 'ig_token', token);
  await setSetting(env, 'ig_token_at', Date.now());
  const me = await igFetch(env, 'me', { fields: 'user_id,username' });
  await setSetting(env, 'ig_user_id', me.user_id || me.id);
  await setSetting(env, 'ig_username', me.username);
  await notify(env, 'Instagram verbunden', `@${me.username} ist jetzt mit der App verbunden. Beiträge werden ab jetzt automatisch veröffentlicht.`);
  return Response.redirect(`${url.origin}/#einstellungen?ig=ok`, 302);
}

export async function refreshTokenIfNeeded(env) {
  const at = Number(await getSetting(env, 'ig_token_at', '0'));
  if (!at || Date.now() - at < 20 * 864e5) return;
  const data = await igFetch(env, 'https://graph.instagram.com/refresh_access_token', { grant_type: 'ig_refresh_token' });
  if (data.access_token) {
    await setSetting(env, 'ig_token', data.access_token);
    await setSetting(env, 'ig_token_at', Date.now());
  }
}

// ---------- Veröffentlichen ----------
async function containerStatus(env, id) {
  const d = await igFetch(env, id, { fields: 'status_code,status' });
  return d.status_code; // FINISHED | IN_PROGRESS | ERROR | EXPIRED | PUBLISHED
}

async function createContainer(env, origin, post) {
  const me = await getSetting(env, 'ig_user_id');
  const keys = JSON.parse(post.assets_json || '[]');
  const urlOf = k => signedUrl(env, origin, k);
  if (post.kind === 'story') {
    return (await igFetch(env, `${me}/media`, { media_type: 'STORIES', image_url: await urlOf(keys[0]) }, 'POST')).id;
  }
  if (post.kind === 'reel') {
    return (await igFetch(env, `${me}/media`, { media_type: 'REELS', video_url: await urlOf(post.video_key), caption: post.caption || '', share_to_feed: 'true' }, 'POST')).id;
  }
  if (keys.length === 1) {
    return (await igFetch(env, `${me}/media`, { image_url: await urlOf(keys[0]), caption: post.caption || '' }, 'POST')).id;
  }
  const children = [];
  for (const k of keys.slice(0, 10)) {
    children.push((await igFetch(env, `${me}/media`, { image_url: await urlOf(k), is_carousel_item: 'true' }, 'POST')).id);
  }
  return (await igFetch(env, `${me}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption: post.caption || '' }, 'POST')).id;
}

/** Fällige Beiträge veröffentlichen. Reels brauchen Verarbeitungszeit -> zweistufig über mehrere Cron-Läufe. */
export async function publishDue(env, origin) {
  const connected = await getSetting(env, 'ig_user_id');
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
      const final = post.attempts >= 3;
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
  const s = await getSettings(env, ['ig_username', 'ig_app_id', 'ig_token_at']);
  return json({ connected: !!s.ig_username, username: s.ig_username || null, hasApp: !!s.ig_app_id, tokenAge: s.ig_token_at ? Math.round((Date.now() - +s.ig_token_at) / 864e5) : null });
}

export { err };
