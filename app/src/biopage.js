// Öffentliche Buchungsseite (Link in der Instagram-Bio) – Editorial-Design im NMY-Stil, mobil zuerst.
// Ziel: Vertrauen in wenigen Sekunden + ein klarer Weg zur Buchung. Keine Preise, keine genaue Adresse.
// Fotos: nur Nikita & Studio (Kundinnenfotos nur mit Einwilligung für die Website).
import { LOGO_DARK, LOGO_LIGHT } from '../../shared/brand-assets.gen.mjs';
import { REVIEWS } from './brand.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const TREATMENTS = [
  { id: 'powder-brows', name: 'Powder Brows', alt: 'Ombre Brows', text: 'Weiche, pudrige Augenbrauen – von ganz natürlich bis etwas definierter. Nie wieder nachzeichnen.', meta: ['ca. 1,5–2,5 Std.', 'hält ca. 2–5 Jahre'] },
  { id: 'lip-blush', name: 'Lip Blush', alt: 'Aquarell Lips', text: 'Frische Farbe und eine klarere Kontur – ohne Lippenstift-Look. Gleicht blasse Bereiche sanft aus.', meta: ['ca. 2–2,5 Std.', 'hält ca. 1–3 Jahre'] },
  { id: 'lashlifting', name: 'Lashlifting', alt: 'Wimpernlifting', text: 'Natürlicher Schwung für deine eigenen Wimpern – offener Blick ohne Extensions.', meta: ['ca. 50–60 Min.', 'hält ca. 4–6 Wochen'] },
];

const FAQ = [
  ['Sehen Powder Brows künstlich aus?', 'Nicht, wenn Form und Farbe zu dir passen. Ziel ist ein weicher, typgerechter Look – keine blockartigen „Instagram-Brauen“. Deshalb zeichnen wir vorher gemeinsam vor.'],
  ['Wie läuft die Heilung?', 'Direkt danach wirkt die Farbe kräftiger. Eine leichte Kruste ist normal und darf nicht entfernt werden. Nach etwa 7–10 Tagen ist die Haut oberflächlich verheilt, das endgültige Ergebnis siehst du nach ca. 4 Wochen.'],
  ['Brauche ich eine Nachbehandlung?', 'In der Regel gehört eine Nachbehandlung nach etwa 6 Wochen dazu. Dabei wird das Ergebnis ausgeglichen und perfektioniert.'],
  ['Für wen ist Permanent Make-up nicht geeignet?', 'Zum Beispiel bei akuten Hautentzündungen, bestimmten Autoimmunerkrankungen sowie in Schwangerschaft und Stillzeit. Im Zweifel klären wir das vorab ganz in Ruhe.'],
  ['Kann ich altes Permanent Make-up auffrischen lassen?', 'Ja, nach einer ehrlichen Beratung frische ich auch bestehendes Permanent Make-up auf.'],
];

export async function bioPageV2(env, url) {
  const ref = encodeURIComponent((url.searchParams.get('ref') || 'bio').slice(0, 30));
  let imgs = {};
  try { imgs = JSON.parse((await env.DB.prepare("SELECT value FROM settings WHERE key = 'bio_images'").first())?.value || '{}'); } catch { imgs = {}; }
  if (!imgs.hero) {
    const r = await env.DB.prepare("SELECT id FROM media WHERE role = 'ich' ORDER BY created_at DESC LIMIT 1").first();
    if (r) imgs.hero = r.id;
  }
  if (!imgs.detail) {
    const r = await env.DB.prepare("SELECT id FROM media WHERE role = 'studio' ORDER BY created_at DESC LIMIT 1").first();
    if (r) imgs.detail = r.id;
  }
  const results = Array.isArray(imgs.results) ? imgs.results.slice(0, 8) : [];
  let g = {};
  try { g = JSON.parse((await env.DB.prepare("SELECT value FROM settings WHERE key = 'google_reviews'").first())?.value || '{}'); } catch { g = {}; }
  const greviews = (g.reviews || []).filter(r => r && r.text).slice(0, 12);
  const rating = Math.min(5, Math.max(0, parseFloat(String(g.rating || '').replace(',', '.')) || 0));
  const hasGoogle = greviews.length > 0 && rating > 0;
  const num = x => x.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const STAR = 'M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.9 6.2 20.1l1.4-6.4L2.7 9.3l6.5-.7z';
  const stars = (val, cls = '') => `<span class="st ${cls}" style="--f:${(val / 5) * 100}%" role="img" aria-label="${num(val)} von 5 Sternen">
    <span class="st-o">${('<svg viewBox="0 0 24 24"><path d="' + STAR + '"/></svg>').repeat(5)}</span>
    <span class="st-i">${('<svg viewBox="0 0 24 24"><path d="' + STAR + '"/></svg>').repeat(5)}</span></span>`;
  const img = id => `/b/bild/${encodeURIComponent(id)}`;
  const go = (target, r) => `/b/go/${target}?ref=${encodeURIComponent(r)}`;

  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>NMY Cosmetics · Permanent Make-up in Seevetal</title>
<meta name="description" content="Powder Brows, Lip Blush & Lashlifting im Homestudio in Meckelfeld / Seevetal – natürlich statt gemalt. Termin online buchen.">
<meta name="theme-color" content="#F1ECE8"><meta name="robots" content="noindex">
<link rel="preload" href="/b/schrift/playfair.woff2" as="font" type="font/woff2" crossorigin>
${imgs.hero ? `<link rel="preload" href="${img(imgs.hero)}" as="image" fetchpriority="high">` : ''}
<style>
@font-face{font-family:'Playfair Display';src:url(/b/schrift/playfair.woff2) format('woff2');font-weight:400 900;font-display:swap}
@font-face{font-family:'Montserrat';src:url(/b/schrift/montserrat.woff2) format('woff2');font-weight:100 900;font-display:swap}
:root{--bg:#F1ECE8;--paper:#F7F3EF;--deep:#E6DDD6;--ink:#141210;--soft:#5F554F;--brown:#5E4B42;--line:rgba(94,75,66,.22);--serif:'Playfair Display',Georgia,serif;--sans:'Montserrat',Helvetica,Arial,sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased;padding-bottom:96px}
img{display:block;max-width:100%}
a{color:inherit}
.wrap{max-width:560px;margin:0 auto}
.label{font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:var(--soft);display:flex;align-items:center;gap:14px}
.label::before{content:'';width:34px;height:1px;background:currentColor}
h1,h2,h3{font-family:var(--serif);font-weight:700;line-height:1.08;letter-spacing:-.01em}
h1 i,h2 i,blockquote i{font-weight:400}
h1{font-size:clamp(42px,11.5vw,58px)}
h2{font-size:clamp(30px,8vw,38px)}

/* Hero */
.hero{position:relative}
.hero .ph{position:relative;aspect-ratio:4/5;max-height:68svh;width:100%;overflow:hidden;background:var(--deep)}
.hero .ph img{width:100%;height:100%;object-fit:cover;object-position:50% 26%;transform:scale(1.05);animation:settle 1.8s cubic-bezier(.2,.7,.2,1) forwards}
@keyframes settle{to{transform:scale(1)}}
.hero .ph::after{content:'';position:absolute;left:0;right:0;bottom:0;height:22%;background:linear-gradient(180deg,rgba(241,236,232,0),var(--bg))}
.hero .logo{position:absolute;top:calc(18px + env(safe-area-inset-top));left:20px;height:46px;z-index:2}
.hero .tag{position:absolute;right:16px;bottom:16%;z-index:2;background:rgba(241,236,232,.92);padding:9px 14px;font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:var(--soft)}
.hero .txt{position:relative;z-index:2;padding:4px 22px 0;margin-top:-18px}
.hero p.sub{margin-top:14px;color:var(--soft);font-size:16px;max-width:32ch}
.cta{display:flex;flex-direction:column;gap:10px;margin-top:24px}
.btn{display:flex;align-items:center;justify-content:center;gap:14px;min-height:56px;border-radius:999px;text-decoration:none;font-size:13px;letter-spacing:.2em;text-transform:uppercase;transition:transform .15s ease,background .2s ease}
.btn:active{transform:scale(.98)}
.btn.dark{background:var(--ink);color:var(--bg)}
.btn.line{border:1.5px solid var(--brown);color:var(--ink)}
.btn .ar{position:relative;width:34px;height:1.5px;background:currentColor}
.btn .ar::after{content:'';position:absolute;right:-1px;top:-4px;border-left:8px solid currentColor;border-top:5px solid transparent;border-bottom:5px solid transparent}
.facts{display:flex;justify-content:space-between;margin:28px 22px 0;padding:16px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.facts div{text-align:center;flex:1}
.facts b{display:block;font-family:var(--serif);font-size:21px;line-height:1.1}
.facts span{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--soft)}
.facts div+div{border-left:1px solid var(--line)}

/* Sektionen */
section{padding:64px 22px 0}
.intro{margin-top:18px;color:var(--soft)}
.list{list-style:none;margin-top:26px;border-top:1px solid var(--ink)}
.list li{border-bottom:1px solid var(--line)}
.list a{display:grid;grid-template-columns:44px 1fr 26px;gap:6px;padding:22px 0;text-decoration:none;align-items:start}
.list .n{font-family:var(--serif);font-size:18px;color:var(--brown);padding-top:4px}
.list h3{font-size:27px}
.list h3 small{display:block;font-family:var(--sans);font-weight:400;font-size:11px;letter-spacing:.26em;text-transform:uppercase;color:var(--soft);margin-top:6px}
.list p{color:var(--soft);font-size:15px;margin-top:10px}
.list .meta{display:flex;gap:16px;flex-wrap:wrap;margin-top:12px;font-size:12px;letter-spacing:.06em;color:var(--brown)}
.list .go{align-self:center;width:26px;height:26px;border:1.5px solid var(--brown);border-radius:50%;position:relative}
.list .go::after{content:'';position:absolute;left:8px;top:7px;width:7px;height:7px;border-top:1.5px solid var(--brown);border-right:1.5px solid var(--brown);transform:rotate(45deg)}
.more{margin-top:16px;font-size:13px;color:var(--soft)}

.band{margin-top:64px;display:grid;grid-template-columns:1fr 1fr;gap:0;background:var(--paper)}
.band img{width:100%;height:100%;object-fit:cover;aspect-ratio:3/4}
.band blockquote{padding:26px 20px;display:flex;flex-direction:column;justify-content:center;font-family:var(--serif);font-size:24px;line-height:1.22}
.band blockquote span{display:block;margin-top:16px;font-family:var(--sans);font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:var(--soft)}

.steps{list-style:none;margin-top:28px;counter-reset:s}
.steps li{position:relative;padding:0 0 26px 58px;counter-increment:s}
.steps li::before{content:'0' counter(s);position:absolute;left:0;top:-2px;font-family:var(--serif);font-size:30px;color:var(--brown)}
.steps li::after{content:'';position:absolute;left:17px;top:44px;bottom:6px;width:1px;background:var(--line)}
.steps li:last-child::after{display:none}
.steps b{display:block;font-family:var(--serif);font-size:21px;margin-bottom:4px}
.steps p{color:var(--soft);font-size:15px}

.hyg{margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.hyg div{background:var(--paper);border:1px solid var(--line);padding:16px;font-size:14px;color:var(--soft)}
.hyg b{display:block;font-family:var(--serif);color:var(--ink);font-size:17px;margin-bottom:4px}

.reviews{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;margin:26px -22px 0;padding:0 22px 6px;scrollbar-width:none}
.reviews::-webkit-scrollbar{display:none}
.rv{flex:0 0 86%;scroll-snap-align:center;background:var(--paper);border:1px solid var(--line);padding:26px 22px}
.rv q{display:block;font-family:var(--serif);font-size:20px;line-height:1.35;quotes:'„' '“'}
.rv span{display:block;margin-top:16px;font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:var(--soft)}
.dots{display:flex;gap:6px;justify-content:center;margin-top:14px}
.dots i{width:6px;height:6px;border-radius:50%;background:var(--line);transition:background .2s}
.dots i.on{background:var(--brown)}

.about{display:grid;gap:18px}
.about p{color:var(--soft)}
.sig{font-family:'Allura',cursive;font-size:44px;color:var(--ink);line-height:1}

details{border-bottom:1px solid var(--line)}
details:first-of-type{border-top:1px solid var(--ink);margin-top:24px}
summary{list-style:none;cursor:pointer;padding:20px 34px 20px 0;font-family:var(--serif);font-size:19px;position:relative}
summary::-webkit-details-marker{display:none}
summary::after{content:'+';position:absolute;right:4px;top:16px;font-family:var(--sans);font-weight:300;font-size:26px;color:var(--brown);transition:transform .25s}
details[open] summary::after{transform:rotate(45deg)}
details p{padding:0 0 20px;color:var(--soft);font-size:15px}

.final{margin:72px 0 0;background:var(--ink);color:var(--bg);padding:56px 22px 48px;text-align:left}
.final .label{color:rgba(241,236,232,.7)}
.final h2{margin-top:18px;color:var(--bg)}
.final p{margin-top:14px;color:rgba(241,236,232,.75)}
.final .btn.dark{background:var(--bg);color:var(--ink)}
.final .btn.line{border-color:rgba(241,236,232,.5);color:var(--bg)}
.final img{height:44px;margin-top:36px;opacity:.9}

footer{padding:28px 22px 10px;font-size:12px;color:var(--soft);line-height:1.8}
footer a{color:var(--soft)}

/* Ergebnisse */
.results{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;margin:26px -22px 0;padding:0 22px 4px;scrollbar-width:none}
.results::-webkit-scrollbar{display:none}
.res{flex:0 0 78%;scroll-snap-align:center;position:relative;margin:0}
.res img{width:100%;aspect-ratio:4/5;object-fit:cover;background:var(--deep)}
.res figcaption{position:absolute;left:0;bottom:0;background:rgba(241,236,232,.95);padding:8px 14px;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:var(--soft)}
.res-meta{display:flex;justify-content:space-between;align-items:center;margin-top:14px;font-size:12px;color:var(--soft)}
.res-meta b{font-family:var(--serif);font-weight:400;font-size:16px;color:var(--ink)}
.note{margin-top:14px;font-size:13px;color:var(--soft);border-left:2px solid var(--brown);padding-left:12px}
.about-ph{width:100%;aspect-ratio:4/5;object-fit:cover;object-position:50% 30%;margin-bottom:6px}

/* Google-Bewertungen */
.st{position:relative;display:inline-block;line-height:0;vertical-align:middle}
.st svg{width:16px;height:16px;margin-right:3px}
.st-o svg{fill:none;stroke:var(--brown);stroke-width:1.2}
.st-i{position:absolute;inset:0;overflow:hidden;white-space:nowrap;width:var(--f)}
.st-i svg{fill:var(--ink);stroke:var(--ink);stroke-width:1.2}
.st.big svg{width:24px;height:24px;margin-right:5px}
.st.anim .st-i{width:0;transition:width 1.4s cubic-bezier(.3,.7,.2,1) .2s}
.on .st.anim .st-i,.st.anim.on .st-i{width:var(--f)}
.proof{display:flex;align-items:center;gap:10px;margin-top:16px;font-size:13px;color:var(--soft);text-decoration:none}
.proof b{font-family:var(--serif);font-size:16px;color:var(--ink)}
.gscore{display:flex;align-items:flex-end;gap:18px;margin-top:22px}
.gscore .n{font-family:var(--serif);font-weight:700;font-size:76px;line-height:.85;font-variant-numeric:lining-nums tabular-nums}
.gscore small{display:block;margin-top:8px;font-size:12px;letter-spacing:.06em;color:var(--soft)}
.gslider{position:relative;margin-top:28px;border-top:1px solid var(--ink);padding-top:26px;touch-action:pan-y}
.gslide{position:absolute;left:0;right:0;top:26px;opacity:0;transform:translateY(8px);transition:opacity .7s ease,transform .7s ease;pointer-events:none}
.gslide.on{position:relative;top:0;opacity:1;transform:none;pointer-events:auto}
.gslide q{display:block;font-family:var(--serif);font-size:22px;line-height:1.38;quotes:'„' '“';margin-top:14px}
.gslide .who{display:flex;justify-content:space-between;margin-top:18px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--soft)}
.gbars{display:flex;gap:6px;margin-top:22px}
.gbars i{flex:1;height:2px;background:var(--line);position:relative;overflow:hidden;cursor:pointer}
.gbars i::after{content:'';position:absolute;inset:0;background:var(--ink);transform:scaleX(0);transform-origin:left}
.gbars i.done::after{transform:scaleX(1)}
.gbars i.run::after{animation:gbar var(--dur,6s) linear forwards}
@keyframes gbar{to{transform:scaleX(1)}}
.gfoot{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:22px}
.gfoot a{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--brown)}
.gfoot .nav{display:flex;gap:8px}
.gfoot button{width:38px;height:38px;border-radius:50%;border:1.5px solid var(--brown);background:none;cursor:pointer;position:relative}
.gfoot button::after{content:'';position:absolute;left:14px;top:13px;width:8px;height:8px;border-top:1.5px solid var(--brown);border-right:1.5px solid var(--brown);transform:rotate(45deg)}
.gfoot button.prev::after{left:16px;transform:rotate(-135deg)}
.gnote{margin-top:16px;font-size:11px;line-height:1.6;color:var(--soft)}

/* Fester Buchungs-Knopf */
.bar{position:fixed;left:0;right:0;bottom:0;z-index:20;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:rgba(241,236,232,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-top:1px solid var(--line);display:flex;gap:10px;transform:translateY(110%);transition:transform .35s cubic-bezier(.2,.7,.2,1)}
.bar.show{transform:none}
.bar .btn{flex:1;min-height:52px}
.bar .wa{flex:0 0 52px;border:1.5px solid var(--brown);border-radius:50%;display:flex;align-items:center;justify-content:center;text-decoration:none}
.bar .wa svg{width:22px;height:22px;fill:var(--ink)}

/* Einblenden beim Scrollen */
.rv-in{opacity:0;transform:translateY(18px);transition:opacity .8s ease,transform .8s cubic-bezier(.2,.7,.2,1)}
.rv-in.on{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.rv-in{opacity:1;transform:none}}
@media (min-width:700px){.band blockquote{font-size:30px}}
</style>
<style>@font-face{font-family:'Allura';src:url(/b/schrift/allura.woff2) format('woff2');font-display:swap}</style>
</head><body><div class="wrap">

<header class="hero">
  <div class="ph">${imgs.hero ? `<img src="${img(imgs.hero)}" alt="Nikita in ihrem Homestudio in Meckelfeld" fetchpriority="high">` : ''}</div>
  <img class="logo" src="${LOGO_DARK}" alt="NMY Cosmetics">
  <div class="txt">
    <p class="label">Permanent Make-up · Seevetal</p>
    <h1 style="margin-top:14px">Natürlich statt <i>gemalt.</i></h1>
    <p class="sub">Powder Brows, Lip Blush & Lashlifting – in meinem ruhigen Homestudio in Meckelfeld.</p>
    <div class="cta">
      <a class="btn dark" href="${go('treatwell', ref + '-hero')}">Termin online buchen <span class="ar"></span></a>
      <a class="btn line" href="${go('whatsapp', ref + '-hero')}">Frage per WhatsApp</a>
    </div>
    ${hasGoogle ? `<a class="proof" href="#bewertungen">${stars(rating)}<span><b>${num(rating)}</b> · ${esc(g.count || greviews.length)} Google-Bewertungen</span></a>` : ''}
  </div>
</header>

<div class="facts rv-in">
  <div><b>5+ Jahre</b><span>Erfahrung</span></div>
  <div><b>Zertifiziert</b><span>PMU-Artistin</span></div>
  <div><b>Einweg</b><span>Material</span></div>
</div>

<section id="behandlungen">
  <p class="label rv-in">Behandlungen</p>
  <h2 class="rv-in" style="margin-top:14px">Was darf es <i>sein?</i></h2>
  <ul class="list">
    ${TREATMENTS.map((t, i) => `<li class="rv-in"><a href="${go('treatwell', ref + '-' + t.id)}">
      <span class="n">0${i + 1}</span>
      <span><h3>${t.name}<small>${t.alt}</small></h3><p>${t.text}</p><span class="meta">${t.meta.map(m => `<span>${m}</span>`).join('')}</span></span>
      <span class="go" aria-hidden="true"></span></a></li>`).join('')}
  </ul>
  <p class="more rv-in">Außerdem: Browlifting, Microneedling, Wimpern & Brauen färben – alles online buchbar.</p>
</section>

${results.length ? `<section id="ergebnisse">
  <p class="label rv-in">Ergebnisse</p>
  <h2 class="rv-in" style="margin-top:14px">Echte Kundinnen. <i>Echte Ergebnisse.</i></h2>
  <div class="results" id="res">${results.map((r, i) => `<figure class="res"><img src="${img(r.id)}" alt="${esc(r.label)} – Ergebnis bei NMY Cosmetics" loading="${i < 2 ? 'eager' : 'lazy'}"><figcaption>${esc(r.label)}</figcaption></figure>`).join('')}</div>
  <div class="res-meta"><span><b id="rescount">1</b> / ${results.length}</span><a href="https://www.instagram.com/nmy_cosmetics/" style="color:var(--brown)">Mehr auf Instagram →</a></div>
  <p class="note rv-in">Echte Ergebnisse direkt nach der Behandlung: Die Farbe wirkt anfangs kräftiger und wird beim Abheilen weicher und natürlicher.</p>
  <div class="cta rv-in"><a class="btn dark" href="${go('treatwell', ref + '-ergebnisse')}">So ein Ergebnis buchen <span class="ar"></span></a></div>
</section>` : ''}

${hasGoogle ? `<section id="bewertungen">
  <p class="label rv-in">Google-Bewertungen</p>
  <div class="gscore rv-in" id="gscore"><span class="n" data-to="${rating}">${num(rating)}</span>
    <span>${stars(rating, 'big anim')}<small>aus ${esc(g.count || greviews.length)} Bewertungen auf Google</small></span></div>
  <div class="gslider" id="gs">
    ${greviews.map((r, i) => `<figure class="gslide${i ? '' : ' on'}">${stars(Math.min(5, Math.max(1, +r.stars || 5)))}<q>${esc(r.text)}</q>
      <div class="who"><span>${esc(r.name || 'Google-Nutzerin')}</span><span>${esc(r.date || '')}</span></div></figure>`).join('')}
  </div>
  ${greviews.length > 1 ? `<div class="gbars" id="gb">${greviews.map(() => '<i></i>').join('')}</div>` : ''}
  <div class="gfoot">${g.url ? `<a href="${esc(g.url)}" target="_blank" rel="noopener">Alle Bewertungen auf Google →</a>` : '<span></span>'}
    ${greviews.length > 1 ? '<span class="nav"><button class="prev" aria-label="Vorherige Bewertung"></button><button class="next" aria-label="Nächste Bewertung"></button></span>' : ''}</div>
  <p class="gnote">Auszug aus unseren Google-Bewertungen, unverändert übernommen. Die Bewertungen werden auf Google abgegeben; wir prüfen nicht selbst, ob die Verfasserinnen tatsächlich Kundinnen sind.</p>
</section>` : ''}

<div class="band rv-in">
  ${imgs.detail ? `<img src="${img(imgs.detail)}" alt="Pigmente und Arbeitsplatz im Studio" loading="lazy">` : '<div></div>'}
  <blockquote>Wir starten erst, wenn du sagst: <i>„Ja, genau so.“</i><span>Präzise Vorzeichnung</span></blockquote>
</div>

<section>
  <p class="label rv-in">Dein Termin</p>
  <h2 class="rv-in" style="margin-top:14px">In Ruhe. <i>Ohne Druck.</i></h2>
  <ol class="steps">
    <li class="rv-in"><b>Beratung</b><p>Zielbild, Form, Farbe und Intensität – ehrlich, was bei deinem Hauttyp realistisch ist.</p></li>
    <li class="rv-in"><b>Vorzeichnung</b><p>Wir vermessen und zeichnen gemeinsam vor. Erst wenn du dich wohlfühlst, geht es los.</p></li>
    <li class="rv-in"><b>Behandlung & Nachpflege</b><p>In ruhiger Atmosphäre – danach bekommst du eine klare Pflegeanleitung mit nach Hause.</p></li>
  </ol>
  <div class="hyg rv-in">
    <div><b>Nur für dich</b>Einweg-Nadelmodule, frisch geöffnet</div>
    <div><b>Sauber</b>Handschuhe, Mundschutz, Desinfektion</div>
  </div>
</section>

${hasGoogle ? '' : `<section>
  <p class="label rv-in">Kundenstimmen</p>
  <h2 class="rv-in" style="margin-top:14px">Was Kundinnen <i>sagen</i></h2>
  <div class="reviews" id="rv">${REVIEWS.map(r => `<figure class="rv"><q>${esc(r)}</q><span>Kundin · NMY Cosmetics</span></figure>`).join('')}</div>
  <div class="dots" id="dots">${REVIEWS.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>
</section>`}

<section class="about">
  ${imgs.about ? `<img class="about-ph rv-in" src="${img(imgs.about)}" alt="Nikita, Permanent-Make-up-Artistin" loading="lazy">` : ''}
  <p class="label rv-in">Über mich</p>
  <h2 class="rv-in">Form und Farbe müssen zu <i>dir</i> passen – nicht zu einem Trend.</h2>
  <p class="rv-in">Ich bin Nikita, zertifizierte Permanent-Make-up-Artistin und seit über 5 Jahren in der Beauty-Branche. Mein Fokus: natürliche Ergebnisse, saubere Arbeit und eine Beratung, bei der du dich gut aufgehoben fühlst.</p>
  <p class="sig rv-in">Nikita</p>
</section>

<section>
  <p class="label rv-in">Häufige Fragen</p>
  ${FAQ.map(([q, a]) => `<details class="rv-in"><summary>${q}</summary><p>${a}</p></details>`).join('')}
</section>

<div class="final rv-in">
  <p class="label">Meckelfeld / Seevetal</p>
  <h2>Bereit für deinen <i>Termin?</i></h2>
  <p>Freie Termine siehst du direkt online. Gut erreichbar aus Hamburg-Harburg und dem Landkreis Harburg.</p>
  <div class="cta">
    <a class="btn dark" href="${go('treatwell', ref + '-final')}">Termin online buchen <span class="ar"></span></a>
    <a class="btn line" href="${go('whatsapp', ref + '-final')}">Frage per WhatsApp</a>
  </div>
  <img src="${LOGO_LIGHT}" alt="NMY Cosmetics">
</div>

<footer>
  NMY Cosmetics · Permanent Make-up · Meckelfeld / Seevetal<br>
  <a href="https://www.nikitamarieyigitcosmetics.com/impressum/">Impressum</a> · <a href="https://www.nikitamarieyigitcosmetics.com/datenschutz/">Datenschutz</a> · <a href="${go('website', ref + '-footer')}">Website</a><br>
  <span style="font-size:11px">Diese Seite zählt nur anonym, welcher Button angetippt wird – ohne Cookies, ohne IP-Adresse.</span>
</footer>
</div>

<nav class="bar" id="bar" aria-label="Termin buchen">
  <a class="btn dark" href="${go('treatwell', ref + '-leiste')}">Termin buchen <span class="ar"></span></a>
  <a class="wa" href="${go('whatsapp', ref + '-leiste')}" aria-label="Frage per WhatsApp"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.7 14.9L2 22l5.3-1.4A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3z"/></svg></a>
</nav>

<script>
(() => {
  const bar = document.getElementById('bar'), hero = document.querySelector('.hero .cta');
  new IntersectionObserver(([e]) => bar.classList.toggle('show', !e.isIntersecting), { threshold: 0 }).observe(hero);
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.rv-in').forEach(el => io.observe(el));
  const res = document.getElementById('res'), rc = document.getElementById('rescount');
  if (res) res.addEventListener('scroll', () => { rc.textContent = Math.min(res.children.length, Math.round(res.scrollLeft / (res.firstElementChild.offsetWidth + 12)) + 1); }, { passive: true });
  // Google: Note hochzählen + Sterne füllen, sobald sichtbar
  const gsc = document.getElementById('gscore');
  if (gsc) {
    const n = gsc.querySelector('.n'), to = parseFloat(n.dataset.to), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fmt = x => x.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    n.textContent = fmt(reduce ? to : 0);
    new IntersectionObserver(([e], o) => {
      if (!e.isIntersecting) return; o.disconnect(); gsc.querySelector('.st').classList.add('on');
      if (reduce) return; const t0 = performance.now();
      const step = t => { const k = Math.min(1, (t - t0) / 1400); n.textContent = fmt(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, { threshold: .4 }).observe(gsc);
  }
  // Google: Bewertungen wechseln (automatisch, wischen, Pfeile)
  const gs = document.getElementById('gs');
  if (gs && gs.children.length > 1) {
    const sl = [...gs.children], bars = [...document.querySelectorAll('#gb i')], DUR = 6500;
    let i = 0, timer = null, visible = false;
    const show = k => {
      i = (k + sl.length) % sl.length;
      sl.forEach((x, j) => x.classList.toggle('on', j === i));
      bars.forEach((b, j) => { b.classList.remove('run'); b.classList.toggle('done', j < i); });
      void (bars[i] && bars[i].offsetWidth); if (bars[i]) { bars[i].style.setProperty('--dur', DUR + 'ms'); bars[i].classList.add('run'); }
      clearTimeout(timer); if (visible) timer = setTimeout(() => show(i + 1), DUR);
    };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) show(i); else { clearTimeout(timer); bars.forEach(b => b.classList.remove('run')); } }, { threshold: .3 }).observe(gs);
    document.querySelector('.gfoot .next').onclick = () => show(i + 1);
    document.querySelector('.gfoot .prev').onclick = () => show(i - 1);
    bars.forEach((b, j) => (b.onclick = () => show(j)));
    let x0 = null;
    gs.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    gs.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1)); x0 = null; });
  }
  const rv = document.getElementById('rv'), dots = [...document.querySelectorAll('#dots i')];
  if (rv) rv.addEventListener('scroll', () => { const i = Math.round(rv.scrollLeft / (rv.firstElementChild.offsetWidth + 14)); dots.forEach((d, k) => d.classList.toggle('on', k === i)); }, { passive: true });
})();
</script>
</body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' } });
}

/** Öffentliche Bilder für die Buchungsseite: nur Fotos von Nikita / dem Studio */
export async function bioImage(env, id) {
  const m = await env.DB.prepare("SELECT r2_key, mime FROM media WHERE id = ? AND role IN ('ich','studio','bio','bio-ergebnis')").bind(id).first();
  if (!m) return new Response('Nicht gefunden', { status: 404 });
  const obj = await env.MEDIA.get(m.r2_key);
  if (!obj) return new Response('Nicht gefunden', { status: 404 });
  return new Response(obj.body, { headers: { 'content-type': m.mime || 'image/jpeg', 'cache-control': 'public, max-age=86400' } });
}
