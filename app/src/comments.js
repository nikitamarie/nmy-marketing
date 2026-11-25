// Kommentare unter den EIGENEN Beiträgen automatisch beantworten (offizielle Instagram-Schnittstelle).
// Fremde Accounts werden nie kommentiert (verstößt gegen Instagram-Regeln).
// Kritik/heikle Kommentare: keine automatische Antwort, sondern Benachrichtigung an Nikita.
import { json, err, getSetting, setSetting, notify } from './util.js';
import { igFetch } from './instagram.js';
import { classifyAndReply } from './gemini.js';

const CRITICAL = /(schlecht|enttäusch|unzufrieden|furchtbar|schrecklich|katastroph|abzocke|betrug|entzündet|entzündung|infekt|allerg|schmerz|narbe|verpfuscht|anwalt|geld zurück|nie wieder|horror|schief)/i;
const SPAM = /(https?:\/\/|www\.|follow ?back|dm (me|us)|promo|collab with us|verdien|crypto|bitcoin|💰)/i;
const QUESTION = /(\?|termin|preis|kosten|kostet|wie lange|wie viel|wann|frei|buchen|hält|dauer)/i;

function fallbackReply(text) {
  if (QUESTION.test(text)) return 'Danke dir für deine Nachricht! Alle Infos und freie Termine findest du über den Link in meiner Bio – und bei Fragen schreib mir gern per WhatsApp. 🤍';
  return 'Danke dir, das freut mich sehr! 🤍';
}

/** Cron (2× täglich, 12 und 19 Uhr): neue Kommentare holen und (je nach Einstellung) beantworten */
export async function processComments(env) {
  const me = await getSetting(env, 'ig_user_id');
  if (!me) return 0;
  const mode = (await getSetting(env, 'auto_reply', 'auto')) || 'auto'; // auto | aus
  const myName = ((await getSetting(env, 'ig_username')) || '').toLowerCase();
  let since = await getSetting(env, 'comments_since');
  const firstRun = !since;
  if (firstRun) { since = new Date().toISOString(); await setSetting(env, 'comments_since', since); }

  const media = await igFetch(env, `${me}/media`, { fields: 'id,caption,timestamp', limit: '12' });
  let replied = 0;
  for (const m of media.data || []) {
    let list;
    try { list = await igFetch(env, `${m.id}/comments`, { fields: 'id,text,username,timestamp', limit: '50' }); }
    catch (e) { console.log('Kommentare lesen:', e.message); continue; }
    for (const c of list.data || []) {
      const known = await env.DB.prepare('SELECT id FROM ig_comments WHERE id = ?').bind(c.id).first();
      if (known) continue;
      const own = (c.username || '').toLowerCase() === myName;
      const old = new Date(c.timestamp) < new Date(since);
      let status = 'neu';
      if (own) status = 'eigener';
      else if (old) status = 'alt'; // vor dem Einschalten – nicht nachträglich beantworten
      else if (SPAM.test(c.text || '')) status = 'spam';
      await env.DB.prepare('INSERT INTO ig_comments (id, media_id, username, text, ts, status) VALUES (?,?,?,?,?,?)')
        .bind(c.id, m.id, c.username || '', c.text || '', c.timestamp, status).run();
      if (status !== 'neu' || mode === 'aus' || replied >= 15) continue;

      // Antwort erstellen
      let out = null;
      try { out = await classifyAndReply(env, { comment: c.text || '', caption: (m.caption || '').split('\n')[0] }); } catch (e) { console.log('Antwort KI:', e.message); }
      const critical = CRITICAL.test(c.text || '') || out?.kategorie === 'kritik' || out?.kategorie === 'heikel';
      if (critical) {
        await env.DB.prepare("UPDATE ig_comments SET status = 'pruefen' WHERE id = ?").bind(c.id).run();
        await notify(env, '💬 Kommentar bitte selbst beantworten', `@${c.username}: „${(c.text || '').slice(0, 200)}“ – die App antwortet hier bewusst nicht automatisch.`, '');
        continue;
      }
      if (out?.kategorie === 'spam') { await env.DB.prepare("UPDATE ig_comments SET status = 'spam' WHERE id = ?").bind(c.id).run(); continue; }
      const reply = (out?.antwort || fallbackReply(c.text || '')).slice(0, 300);
      try {
        const r = await igFetch(env, `${c.id}/replies`, { message: reply }, 'POST');
        await env.DB.prepare("UPDATE ig_comments SET status = 'beantwortet', reply_text = ?, reply_id = ?, replied_at = ? WHERE id = ?")
          .bind(reply, r.id || null, new Date().toISOString(), c.id).run();
        replied++;
      } catch (e) {
        await env.DB.prepare("UPDATE ig_comments SET status = 'fehler', reply_text = ? WHERE id = ?").bind('Fehler: ' + e.message, c.id).run();
      }
    }
  }
  return replied;
}

export async function listComments(env) {
  const { results } = await env.DB.prepare("SELECT * FROM ig_comments WHERE status NOT IN ('eigener') ORDER BY ts DESC LIMIT 40").all();
  return json(results);
}

/** Eine automatische Antwort wieder löschen */
export async function deleteReply(env, id) {
  const c = await env.DB.prepare('SELECT reply_id FROM ig_comments WHERE id = ?').bind(id).first();
  if (!c?.reply_id) return err('Keine Antwort gefunden', 404);
  await igFetch(env, c.reply_id, {}, 'DELETE');
  await env.DB.prepare("UPDATE ig_comments SET status = 'geloescht', reply_id = NULL WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
