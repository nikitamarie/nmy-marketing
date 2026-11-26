// Buchungsseite – Entwurf 3 (Vorschau unter /b/vorschau, noch nicht live).
// Aufbau nach Kaufentscheidung bei persönlichen Dienstleistungen:
// 1. Schmerzpunkt erkennen → 2. Beweis (echte Ergebnisse) → 3. Stimmen von Kundinnen → 4. die Person dahinter
// → 5. erst dann die Behandlungen → 6. Fragen klären → 7. Termin.
// Schriften wie bei erfolgreichen Premium-Marken: neutrale Grotesk für Text (Aesop: Suisse Int'l, Rhode: GT America)
// + feine Serife für wenige Überschriften (Rhode: IvyPresto). Freie Entsprechungen: Hanken Grotesk + Instrument Serif (OFL).
// Fakten nur von der Website / aus dem Gespräch. Keine Preise, keine genaue Adresse.
import { LOGO_DARK } from '../../shared/brand-assets.gen.mjs';
import { REVIEWS } from './brand.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const PAINS = [
  ['Zehn Minuten vor dem Spiegel', '– und die zweite Braue wird trotzdem nie wie die erste.'],
  ['Sport, Sauna, Urlaub', '– und nach einer Stunde ist die Farbe verwischt.'],
  ['Blasse Lippen', ', die ohne Lippenstift müde wirken.'],
];

const PROMISES = [
  ['Erst die Vorzeichnung, dann die Nadel.', 'Wir legen Form und Farbe gemeinsam fest. Ich starte erst, wenn du sagst: „Ja, genau so.“'],
  ['Ehrliche Beratung.', 'Ich sage dir, was bei deiner Haut realistisch ist – auch wenn die Antwort mal „lieber nicht“ lautet.'],
  ['Nur für dich geöffnet.', 'Einweg-Nadelmodule, Handschuhe und Desinfektion – bei jeder Behandlung.'],
  ['Ich begleite dich bis zum Schluss.', 'Nach ca. 6 Wochen sehen wir uns zum Nachtermin und schauen gemeinsam auf das abgeheilte Ergebnis.'],
];

const TREATMENTS = [
  { id: 'powder-brows', name: 'Powder Brows', text: 'Weiche, pudrige Brauen – von ganz natürlich bis etwas definierter.', meta: 'ca. 1,5–2,5 Std. · hält ca. 2–5 Jahre' },
  { id: 'lip-blush', name: 'Lip Blush', text: 'Frische Farbe und eine klarere Kontur – ohne Lippenstift-Look.', meta: 'ca. 2–2,5 Std. · hält ca. 1–3 Jahre' },
  { id: 'lashlifting', name: 'Lashlifting', text: 'Natürlicher Schwung für deine eigenen Wimpern.', meta: 'ca. 50–60 Min. · hält ca. 4–6 Wochen' },
];

const FAQ = [
  ['Sieht das am Ende künstlich aus?', 'Nicht, wenn Form und Farbe zu dir passen. Ziel ist ein weicher, typgerechter Look – keine blockartigen „Instagram-Brauen“. Deshalb zeichnen wir vorher gemeinsam vor.'],
  ['Wie läuft die Heilung?', 'Direkt danach wirkt die Farbe kräftiger. Eine leichte Kruste ist normal und darf nicht entfernt werden. Nach etwa 7–10 Tagen ist die Haut oberflächlich verheilt, das endgültige Ergebnis siehst du nach ca. 4 Wochen.'],
  ['Brauche ich eine Nachbehandlung?', 'In der Regel gehört eine Nachbehandlung nach etwa 6 Wochen dazu. Dabei wird das Ergebnis ausgeglichen und verfeinert.'],
  ['Für wen ist Permanent Make-up nicht geeignet?', 'Zum Beispiel bei akuten Hautentzündungen, bestimmten Autoimmunerkrankungen sowie in Schwangerschaft und Stillzeit. Im Zweifel klären wir das vorab in Ruhe.'],
  ['Kann ich altes Permanent Make-up auffrischen lassen?', 'Ja, nach einer ehrlichen Beratung frische ich auch bestehendes Permanent Make-up auf.'],
];

export async function bioPageV3(env, url, { preview = false } = {}) {
  const ref = (url.searchParams.get('ref') || 'bio').slice(0, 30);
  let imgs = {};
  try { imgs = JSON.parse((await env.DB.prepare("SELECT value FROM settings WHERE key = 'bio_images'").first())?.value || '{}'); } catch { imgs = {}; }
  const results = Array.isArray(imgs.results) ? imgs.results.slice(0, 8) : [];
  let g = {};
  try { g = JSON.parse((await env.DB.prepare("SELECT value FROM settings WHERE key = 'google_reviews'").first())?.value || '{}'); } catch { g = {}; }
  const greviews = (g.reviews || []).filter(r => r && r.text).slice(0, 6);
  const rating = Math.min(5, Math.max(0, parseFloat(String(g.rating || '').replace(',', '.')) || 0));
  const hasGoogle = greviews.length > 0 && rating > 0;
  const num = x => x.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const quotes = hasGoogle
    ? greviews.map(r => ({ text: r.text, who: r.name || 'Google-Bewertung', src: 'Google' }))
    : REVIEWS.map(text => ({ text, who: 'Kundin', src: 'NMY Cosmetics' }));
  const heroQuote = hasGoogle ? null : 'Ich wurde super beraten und habe mich sehr wohl gefühlt.'; // wörtlicher Auszug aus REVIEWS[0]
  const img = id => `/b/bild/${encodeURIComponent(id)}`;
  // In der Vorschau keine Klicks zählen (sonst verfälscht es die Auswertung)
  const DIRECT = { treatwell: env.TREATWELL_URL, whatsapp: `https://wa.me/${env.WHATSAPP_NUMBER}?text=${encodeURIComponent('Hallo Nikita, ich habe eine Frage zu einer Behandlung:')}` };
  const go = (target, r) => preview ? DIRECT[target] : `/b/go/${target}?ref=${encodeURIComponent(ref + '-' + r)}`;
  const STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.9 6.2 20.1l1.4-6.4L2.7 9.3l6.5-.7z"/></svg>';

  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>NMY Cosmetics · Permanent Make-up in Seevetal</title>
<meta name="description" content="Powder Brows, Lip Blush & Lashlifting im Homestudio in Meckelfeld / Seevetal. Termin online buchen.">
<meta name="theme-color" content="#F1ECE8"><meta name="robots" content="noindex">
<link rel="preload" href="/b/schrift/hanken.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/b/schrift/instrument.woff2" as="font" type="font/woff2" crossorigin>
${imgs.hero ? `<link rel="preload" href="${img(imgs.hero)}" as="image" fetchpriority="high">` : ''}
<style>
@font-face{font-family:'Hanken Grotesk';src:url(/b/schrift/hanken.woff2) format('woff2');font-weight:100 900;font-display:swap}
@font-face{font-family:'Instrument Serif';src:url(/b/schrift/instrument.woff2) format('woff2');font-weight:400;font-display:swap}
@font-face{font-family:'Instrument Serif';src:url(/b/schrift/instrument-italic.woff2) format('woff2');font-weight:400;font-style:italic;font-display:swap}
@font-face{font-family:'Allura';src:url(/b/schrift/allura.woff2) format('woff2');font-display:swap}
:root{--bg:#F1ECE8;--paper:#F8F5F2;--deep:#E4DAD2;--ink:#1A1715;--soft:#5E544E;--brown:#6B5548;--line:rgba(94,75,66,.2);
  --serif:'Instrument Serif',Georgia,serif;--sans:'Hanken Grotesk',-apple-system,Helvetica,Arial,sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:17px;line-height:1.55;-webkit-font-smoothing:antialiased;padding-bottom:92px}
img{display:block;max-width:100%}
a{color:inherit}
.wrap{max-width:600px;margin:0 auto}
.eyebrow{font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--brown)}
h1,h2,h3{font-family:var(--serif);font-weight:400;letter-spacing:-.012em;line-height:1.02}
h1 em,h2 em,h3 em,q em{font-style:italic}
h1{font-size:clamp(48px,13vw,68px)}
h2{font-size:clamp(38px,10vw,50px)}
p.lead{font-size:18px;color:var(--soft);margin-top:16px;max-width:34ch}
section{padding:80px 22px 0}
.rule{height:1px;background:var(--line);margin:0 22px}

.preview{position:sticky;top:0;z-index:30;background:var(--ink);color:var(--bg);font-size:12px;text-align:center;padding:8px 12px;letter-spacing:.04em}

/* Hero */
.hero .ph{position:relative;aspect-ratio:4/5;max-height:54svh;width:100%;overflow:hidden;background:var(--deep)}
.hero .ph .bg{width:100%;height:100%;object-fit:cover;object-position:50% 22%}
.hero .logo{position:absolute;top:calc(16px + env(safe-area-inset-top));left:18px;height:40px;width:auto}
.hero .txt{padding:24px 22px 0}
.hero h1{margin-top:14px}
.btn{display:flex;align-items:center;justify-content:center;gap:12px;min-height:58px;border-radius:999px;text-decoration:none;font-size:17px;font-weight:600;letter-spacing:-.005em;transition:transform .15s ease}
.btn:active{transform:scale(.98)}
.btn.dark{background:var(--ink);color:var(--bg)}
.btn.light{background:var(--bg);color:var(--ink)}
.btn .ar{font-weight:400;font-size:20px;line-height:1}
.cta{margin-top:28px;display:flex;flex-direction:column;gap:14px}
.ask{display:block;text-align:center;font-size:15px;color:var(--soft);text-decoration:underline;text-underline-offset:4px;text-decoration-color:var(--line)}
.proof{display:flex;gap:14px;align-items:flex-start;margin-top:30px;padding-top:22px;border-top:1px solid var(--line)}
.proof .av{flex:none;width:46px;height:46px;border-radius:50%;overflow:hidden;background:var(--deep)}
.proof .av img{width:100%;height:100%;object-fit:cover}
.proof q{display:block;font-family:var(--serif);font-size:21px;line-height:1.25;quotes:'„' '“'}
.proof span{display:block;margin-top:6px;font-size:13px;color:var(--soft)}
.stars{display:inline-flex;gap:2px;vertical-align:-2px}.stars svg{width:15px;height:15px;fill:var(--ink)}

/* Schmerzpunkt */
.pains{list-style:none;margin-top:30px}
.pains li{padding:20px 0;border-top:1px solid var(--line);font-size:19px;line-height:1.4;color:var(--soft)}
.pains li b{color:var(--ink);font-weight:600}
.fear{margin-top:34px;padding:30px 24px;background:var(--paper);border-left:2px solid var(--brown)}
.fear p.q{font-family:var(--serif);font-size:30px;line-height:1.12}
.fear p.a{margin-top:16px;color:var(--soft)}

/* Ergebnisse */
.gallery{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:30px -22px 0}
.gallery figure{position:relative;margin:0;background:var(--deep)}
.gallery figure:first-child{grid-column:1/-1}
.gallery img{width:100%;height:100%;aspect-ratio:4/5;object-fit:cover}
.gallery figure:first-child img{aspect-ratio:1/1}
.gallery figcaption{position:absolute;left:10px;bottom:10px;background:rgba(241,236,232,.94);padding:5px 10px;font-size:12px;font-weight:500;color:var(--ink);border-radius:999px}
.small-note{margin-top:16px;font-size:14px;color:var(--soft)}
.textlink{display:inline-block;margin-top:18px;font-weight:600;text-decoration:none;border-bottom:1.5px solid var(--ink);padding-bottom:2px}

/* Kundinnen */
.score{display:flex;align-items:baseline;gap:14px;margin-top:24px}
.score b{font-family:var(--serif);font-weight:400;font-size:72px;line-height:.9}
.score span{font-size:14px;color:var(--soft)}
.quotes{margin-top:24px}
.quote{padding:30px 0;border-top:1px solid var(--line)}
.quote q{display:block;font-family:var(--serif);font-size:28px;line-height:1.18;quotes:'„' '“'}
.quote .who{margin-top:14px;font-size:14px;color:var(--soft)}
.quote .who b{color:var(--ink);font-weight:600}

/* Über mich */
.me{margin-top:0;padding-top:80px}
.me .photo{margin:0 -22px;aspect-ratio:4/5;overflow:hidden;background:var(--deep)}
.me .photo img{width:100%;height:100%;object-fit:cover;object-position:50% 30%}
.me .name{margin-top:30px}
.me .role{margin-top:10px;font-size:15px;color:var(--soft)}
.me p.body{margin-top:18px;color:var(--soft)}
.promises{list-style:none;margin-top:34px;counter-reset:p}
.promises li{counter-increment:p;display:grid;grid-template-columns:42px 1fr;padding:22px 0;border-top:1px solid var(--line)}
.promises li::before{content:counter(p,decimal-leading-zero);font-size:13px;font-weight:600;color:var(--brown);padding-top:5px}
.promises b{display:block;font-family:var(--serif);font-weight:400;font-size:25px;line-height:1.15}
.promises p{margin-top:6px;font-size:16px;color:var(--soft)}
.sig{margin-top:26px;font-family:'Allura',cursive;font-size:46px;line-height:1}

/* Behandlungen */
.treat{list-style:none;margin-top:30px}
.treat a{display:flex;gap:16px;align-items:center;padding:24px 0;border-top:1px solid var(--line);text-decoration:none}
.treat li:last-child a{border-bottom:1px solid var(--line)}
.treat .t{flex:1}
.treat h3{font-size:32px}
.treat p{margin-top:6px;font-size:16px;color:var(--soft)}
.treat small{display:block;margin-top:8px;font-size:13px;color:var(--brown)}
.treat .go{flex:none;width:44px;height:44px;border-radius:50%;background:var(--ink);color:var(--bg);display:flex;align-items:center;justify-content:center;font-size:20px}
.more{margin-top:16px;font-size:14px;color:var(--soft)}

/* FAQ */
details{border-top:1px solid var(--line)}
details:last-of-type{border-bottom:1px solid var(--line)}
.faq{margin-top:26px}
summary{list-style:none;cursor:pointer;padding:22px 40px 22px 0;font-size:18px;font-weight:600;position:relative}
summary::-webkit-details-marker{display:none}
summary::after{content:'+';position:absolute;right:2px;top:17px;font-weight:300;font-size:28px;color:var(--brown);transition:transform .25s}
details[open] summary::after{transform:rotate(45deg)}
details p{padding:0 0 22px;color:var(--soft);font-size:16px}

/* Abschluss */
.final{margin-top:80px;background:var(--ink);color:var(--bg);padding:64px 22px 56px}
.final .eyebrow{color:#C9B8AC}
.final h2{margin-top:16px}
.final p{margin-top:16px;color:rgba(241,236,232,.75)}
.final .ask{color:rgba(241,236,232,.8);text-decoration-color:rgba(241,236,232,.35)}
footer{padding:28px 22px 10px;font-size:13px;color:var(--soft);line-height:1.8}

.bar{position:fixed;left:0;right:0;bottom:0;z-index:20;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:rgba(241,236,232,.94);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-top:1px solid var(--line);display:flex;gap:10px;transform:translateY(110%);transition:transform .35s cubic-bezier(.2,.7,.2,1)}
.bar.show{transform:none}
.bar .btn{flex:1;min-height:52px;font-size:16px}
.bar .wa{flex:0 0 52px;height:52px;border:1.5px solid var(--line);border-radius:50%;display:flex;align-items:center;justify-content:center}
.bar .wa svg{width:22px;height:22px;fill:var(--ink)}

.in{opacity:0;transform:translateY(16px);transition:opacity .8s ease,transform .8s cubic-bezier(.2,.7,.2,1)}
.in.on{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.in{opacity:1;transform:none;transition:none}}
</style></head><body>
${preview ? '<div class="preview">Vorschau – noch nicht veröffentlicht</div>' : ''}
<div class="wrap">

<header class="hero">
  <div class="ph">${imgs.hero ? `<img class="bg" src="${img(imgs.hero)}" alt="Nikita in ihrem Homestudio" fetchpriority="high">` : ''}<img class="logo" src="${LOGO_DARK}" alt="NMY Cosmetics"></div>
  <div class="txt">
    <p class="eyebrow">Permanent Make-up · Seevetal</p>
    <h1>Morgens aufwachen. <em>Fertig sein.</em></h1>
    <p class="lead">Powder Brows und Lip Blush, die weich und natürlich wirken – von Nikita, in ihrem Homestudio in Meckelfeld.</p>
    <div class="cta">
      <a class="btn dark" id="herocta" href="${go('treatwell', 'hero')}">Freie Termine ansehen <span class="ar">→</span></a>
      <a class="ask" href="${go('whatsapp', 'hero')}">Erst eine Frage stellen – per WhatsApp</a>
    </div>
    <div class="proof">
      ${imgs.about ? `<span class="av"><img src="${img(imgs.about)}" alt=""></span>` : ''}
      ${hasGoogle
        ? `<div><span class="stars">${STAR.repeat(5)}</span><q style="margin-top:6px">${esc(greviews[0].text.length > 110 ? greviews[0].text.slice(0, greviews[0].text.lastIndexOf(' ', 105)) + ' …' : greviews[0].text)}</q><span><b>${num(rating)}</b> aus ${esc(g.count || greviews.length)} Google-Bewertungen</span></div>`
        : `<div><q>${esc(heroQuote)}</q><span>Kundin über ihre Augenbrauen</span></div>`}
    </div>
  </div>
</header>

<section>
  <p class="eyebrow in">Kennst du das?</p>
  <h2 class="in" style="margin-top:14px">Jeden Morgen dasselbe <em>Spiel.</em></h2>
  <ul class="pains">${PAINS.map(([b, t]) => `<li class="in"><b>${b}</b>${t.startsWith(',') ? '' : ' '}${t}</li>`).join('')}</ul>
  <div class="fear in">
    <p class="q">Und die größte Sorge: dass es am Ende <em>künstlich</em> aussieht.</p>
    <p class="a">Genau darauf ist meine Arbeit ausgerichtet. Mit einer Vorzeichnung, die wir gemeinsam festlegen, und einer Farbe, die zu deinem Hautton passt – damit es aussieht wie du, nur ausgeschlafen.</p>
  </div>
</section>

${results.length ? `<section id="ergebnisse">
  <p class="eyebrow in">Echte Ergebnisse</p>
  <h2 class="in" style="margin-top:14px">Sieh <em>selbst.</em></h2>
  <p class="lead in">Echte Kundinnen, fotografiert direkt nach der Behandlung – ohne Filter.</p>
  <div class="gallery">${results.slice(0, results.length % 2 ? Math.min(7, results.length) : Math.min(7, results.length - 1)).map((r, i) => `<figure class="in"><img src="${img(r.id)}" alt="${esc(r.label)} – Ergebnis" loading="${i < 3 ? 'eager' : 'lazy'}"><figcaption>${esc(r.label)}</figcaption></figure>`).join('')}</div>
  <p class="small-note in">Direkt danach wirkt die Farbe kräftiger – abgeheilt wird sie weicher und natürlicher.</p>
  <a class="textlink in" href="https://www.instagram.com/nmy_cosmetics/">Mehr Ergebnisse auf Instagram →</a>
</section>` : ''}

<section id="stimmen">
  <p class="eyebrow in">Was Kundinnen sagen</p>
  <h2 class="in" style="margin-top:14px">In ihren <em>Worten.</em></h2>
  ${hasGoogle ? `<div class="score in"><b>${num(rating)}</b><span><span class="stars">${STAR.repeat(5)}</span><br>${esc(g.count || greviews.length)} Bewertungen auf Google</span></div>` : ''}
  <div class="quotes">${quotes.map(q => `<figure class="quote in"><q>${esc(q.text)}</q><p class="who"><b>${esc(q.who)}</b> · ${esc(q.src)}</p></figure>`).join('')}</div>
  ${hasGoogle ? `<p class="small-note">Unverändert aus Google übernommen. Die Bewertungen werden auf Google abgegeben; wir prüfen nicht selbst, ob die Verfasserinnen tatsächlich Kundinnen sind.${g.url ? ` <a href="${esc(g.url)}">Alle ansehen</a>` : ''}</p>` : ''}
</section>

<section class="me">
  ${imgs.about ? `<div class="photo in"><img src="${img(imgs.about)}" alt="Nikita, Permanent-Make-up-Artistin" loading="lazy"></div>` : ''}
  <p class="eyebrow in" style="margin-top:30px">Die Person hinter NMY</p>
  <h2 class="name in" style="margin-top:14px">Nikita Marie <em>Yigit</em></h2>
  <p class="role in">Permanent-Make-up-Artistin · seit über 5 Jahren in der Beauty-Branche</p>
  <p class="body in">Ich arbeite allein, in meinem eigenen Homestudio. Vom ersten Gespräch bis zum Nachtermin hast du es also immer mit mir zu tun.</p>
  <h3 class="in" style="margin-top:40px;font-size:30px">Darauf kannst du dich <em>verlassen</em></h3>
  <ol class="promises">${PROMISES.map(([b, t]) => `<li class="in"><div><b>${b}</b><p>${t}</p></div></li>`).join('')}</ol>
  <p class="sig in">Nikita</p>
</section>

<section id="behandlungen">
  <p class="eyebrow in">Behandlungen</p>
  <h2 class="in" style="margin-top:14px">Was darf es <em>sein?</em></h2>
  <ul class="treat">${TREATMENTS.map(t => `<li class="in"><a href="${go('treatwell', t.id)}"><span class="t"><h3>${t.name}</h3><p>${t.text}</p><small>${t.meta}</small></span><span class="go" aria-hidden="true">→</span></a></li>`).join('')}</ul>
  <p class="more in">Außerdem: Browlifting, Microneedling, Wimpern & Brauen färben – alles online buchbar.</p>
</section>

<section>
  <p class="eyebrow in">Häufige Fragen</p>
  <h2 class="in" style="margin-top:14px">Gut zu <em>wissen.</em></h2>
  <div class="faq">${FAQ.map(([q, a]) => `<details class="in"><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>
</section>

<div class="final in">
  <p class="eyebrow">Meckelfeld / Seevetal · nah an Hamburg-Harburg</p>
  <h2>Dein erster Schritt: <em>ein freier Termin.</em></h2>
  <p>Freie Termine siehst du direkt online. Oder schreib mir vorher – ich antworte dir persönlich.</p>
  <div class="cta">
    <a class="btn light" href="${go('treatwell', 'final')}">Freie Termine ansehen <span class="ar">→</span></a>
    <a class="ask" href="${go('whatsapp', 'final')}">Frage per WhatsApp</a>
  </div>
</div>

<footer>
  NMY Cosmetics · Permanent Make-up · Meckelfeld / Seevetal<br>
  <a href="https://www.nikitamarieyigitcosmetics.com/impressum/">Impressum</a> · <a href="https://www.nikitamarieyigitcosmetics.com/datenschutz/">Datenschutz</a>
</footer>
</div>

<nav class="bar" id="bar" aria-label="Termin buchen">
  <a class="btn dark" href="${go('treatwell', 'leiste')}">Freie Termine ansehen <span class="ar">→</span></a>
  <a class="wa" href="${go('whatsapp', 'leiste')}" aria-label="Frage per WhatsApp"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.7 14.9L2 22l5.3-1.4A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3z"/></svg></a>
</nav>
<script>
(() => {
  const bar = document.getElementById('bar');
  new IntersectionObserver(([e]) => bar.classList.toggle('show', !e.isIntersecting)).observe(document.getElementById('herocta'));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.in').forEach(el => io.observe(el));
})();
</script>
</body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'x-content-type-options': 'nosniff' } });
}
