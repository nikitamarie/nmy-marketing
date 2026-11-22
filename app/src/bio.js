// Öffentliche Link-in-Bio-Seite: misst, wie viele Leute von Instagram zur Buchung gehen.
import { LOGO_DARK } from '../../shared/brand-assets.gen.mjs';


export function bioPage(url) {
  const ref = encodeURIComponent(url.searchParams.get('ref') || 'bio');
  return new Response(`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NMY Cosmetics · Termin buchen</title><meta name="robots" content="noindex">
<style>
:root{--bg:#F1ECE8;--ink:#141210;--soft:#4A423D;--brown:#5E4B42}
*{box-sizing:border-box;margin:0}body{background:var(--bg);color:var(--ink);font-family:Montserrat,Helvetica,Arial,sans-serif;min-height:100vh;display:flex;justify-content:center;padding:48px 20px}
main{width:100%;max-width:420px;text-align:center}img{width:150px;margin:0 auto 18px;display:block}
p.sub{font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:var(--soft);margin-bottom:36px}
a.btn{display:block;border:1.5px solid var(--brown);border-radius:999px;padding:17px;margin:12px 0;color:var(--ink);text-decoration:none;font-size:15px;letter-spacing:.12em;text-transform:uppercase}
a.btn.primary{background:var(--ink);color:var(--bg);border-color:var(--ink)}
details{margin-top:28px;text-align:left;border-top:1px solid rgba(94,75,66,.3);padding-top:18px}summary{cursor:pointer;letter-spacing:.2em;text-transform:uppercase;font-size:13px;color:var(--soft);text-align:center;list-style:none}
ul{list-style:none;padding:12px 0 0}li{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(94,75,66,.18);font-size:15px}s{color:var(--soft);font-weight:400}
footer{margin-top:36px;font-size:12px;color:var(--soft);line-height:1.7}footer a{color:var(--soft)}
</style></head><body><main>
<img src="${LOGO_DARK}" alt="NMY Cosmetics">
<p class="sub">Permanent Make-up · Seevetal</p>
<a class="btn primary" href="/b/go/treatwell?ref=${ref}">Termin online buchen</a>
<a class="btn" href="/b/go/whatsapp?ref=${ref}">Frage per WhatsApp</a>
<a class="btn" href="/b/go/website?ref=${ref}">Mehr über die Behandlungen</a>
<footer>Meckelfeld / Seevetal<br><span style="font-size:11px">Diese Seite zählt nur anonym, welcher Button angetippt wird – ohne Cookies, ohne IP-Adresse.</span><br><a href="https://www.nikitamarieyigitcosmetics.com/impressum/">Impressum</a> · <a href="https://www.nikitamarieyigitcosmetics.com/datenschutz/">Datenschutz</a></footer>
</main></body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function bioGo(env, url, request) {
  const target = url.pathname.split('/').pop();
  const ref = (url.searchParams.get('ref') || 'bio').slice(0, 40);
  const dest = {
    treatwell: env.TREATWELL_URL,
    whatsapp: `https://wa.me/${env.WHATSAPP_NUMBER}?text=${encodeURIComponent('Hallo Nikita, ich habe eine Frage zu einer Behandlung:')}`,
    website: 'https://www.nikitamarieyigitcosmetics.com/meine-leistungen/',
  }[target];
  if (!dest) return new Response('Nicht gefunden', { status: 404 });
  // Bots/Vorschau-Abrufe nicht zählen
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  if (!/bot|preview|facebookexternalhit/.test(ua)) {
    await env.DB.prepare('INSERT INTO clicks (target, ref) VALUES (?, ?)').bind(target, ref).run();
  }
  return Response.redirect(dest, 302);
}
