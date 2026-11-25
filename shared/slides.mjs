// Gemeinsame Folien-Vorlagen (Node-Renderer + Cloudflare Worker).
// Job: { id, format: "post"|"story", theme: "edition"|"classic", label, slides: [...] }
// Folientypen: cover, text, list, facts, cta, story, beforeafter, photo, photostory
// Text: **fett**, _kursiv_, \n
import { FONT_CSS, BRAND_CSS, LOGO_DARK, LOGO_LIGHT } from './brand-assets.gen.mjs';

export const SIZES = { post: [1080, 1350], story: [1080, 1920] };

const esc = (s = '') => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const rich = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|[\s(„])_(.+?)_(?=[\s.,!?:;)“]|$)/g, '$1<i>$2</i>')
  .replace(/\n/g, '<br>');

const LOGO = { dark: LOGO_DARK, light: LOGO_LIGHT };
const logo = (variant = 'dark', cls = '') => `<img class="logo-img ${cls}" src="${LOGO[variant]}" alt="NMY Cosmetics">`;
const pill = (t = 'Swipe') => `<div class="pill">${esc(t)}<span class="arrow"></span></div>`;
const labelHtml = t => `<div class="label">${esc(t)}</div>`;

function slideHtml(s, i, total, job, img) {
  const label = s.label || job.label || '';
  const page = `<span class="page">${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span>`;
  const foot = (left = logo()) => `<div class="bottom">${left}${i === 0 || total === 1 ? '' : page}</div>`;
  switch (s.type) {
    case 'cover':
      return `${labelHtml(label)}
        <div class="spacer"></div>
        <h1 class="headline ${s.size || 'xl'}">${rich(s.headline)}</h1>
        ${s.sub ? `<p class="body" style="margin-top:40px">${rich(s.sub)}</p>` : ''}
        <div class="spacer"></div>
        <div style="display:flex;justify-content:flex-end;margin-bottom:56px">${pill(s.pill)}</div>
        ${foot()}`;
    case 'text':
      return `${labelHtml(label)}
        <div class="spacer"></div>
        <h2 class="headline ${s.size || 'l'}">${rich(s.headline)}</h2>
        <div class="rule"></div>
        <p class="body">${rich(s.body)}</p>
        <div class="spacer"></div>
        ${foot()}`;
    case 'list':
      return `${labelHtml(label)}
        <h2 class="headline m" style="margin-top:80px">${rich(s.headline)}</h2>
        <div class="rule"></div>
        <ul class="list">${s.items.map((it, n) => `<li><span class="num">${n + 1}</span><span class="t"><b>${esc(it.title)}</b>${rich(it.text)}</span></li>`).join('')}</ul>
        ${foot()}`;
    case 'facts':
      return `${labelHtml(label)}
        <h2 class="headline m" style="margin-top:80px;margin-bottom:64px">${rich(s.headline)}</h2>
        <div class="facts">${s.items.map(f => `<div><span>${esc(f.k)}</span><em>${esc(f.v)}</em></div>`).join('')}</div>
        ${s.note ? `<p class="body" style="margin-top:44px;font-size:32px">${rich(s.note)}</p>` : ''}
        ${foot()}`;
    case 'cta':
      return `${labelHtml(label)}
        <div class="spacer"></div>
        <h2 class="headline l">${rich(s.headline)}</h2>
        <div class="rule"></div>
        <p class="body">${rich(s.body)}</p>
        <div style="margin-top:64px">${pill(s.pill || 'Termin buchen')}</div>
        <div class="spacer"></div>
        ${foot()}`;
    case 'story':
      return `<div style="height:120px"></div>
        ${labelHtml(label)}
        <div class="spacer"></div>
        <h1 class="headline xl">${rich(s.headline)}</h1>
        <div class="rule"></div>
        <p class="body">${rich(s.body)}</p>
        <div class="spacer"></div>
        <div style="display:flex;justify-content:center">${pill(s.pill || 'Link in der Bio')}</div>
        <div class="bottom" style="justify-content:center;margin:90px 0 140px">${logo('dark', 'center')}</div>`;
    case 'beforeafter': {
      const tag = t => `<span class="ba-tag">${esc(t)}</span>`;
      return `${labelHtml(label)}
        <div class="ba ${s.layout || 'side'}">
          <figure><img src="${img(s.before)}" style="object-position:${s.beforePos || 'center'}">${tag(s.beforeLabel || 'Vorher')}</figure>
          <figure><img src="${img(s.after)}" style="object-position:${s.afterPos || 'center'}">${tag(s.afterLabel || 'Nachher')}</figure>
        </div>
        ${s.caption ? `<p class="body ba-cap">${rich(s.caption)}</p>` : ''}
        ${foot()}`;
    }
    case 'photo':
    case 'photostory':
      return `<div class="photo-bg"><img src="${img(s.image)}" style="object-position:${s.pos || 'center'}"></div>
        <div class="photo-shade"></div>
        <div class="photo-content"${s.type === 'photostory' ? ' style="padding-top:220px;padding-bottom:260px"' : ''}>
          ${labelHtml(label)}
          <div class="spacer"></div>
          <h1 class="headline ${s.size || 'l'} on-photo">${rich(s.headline)}</h1>
          ${s.sub ? `<p class="body on-photo" style="margin-top:28px">${rich(s.sub)}</p>` : ''}
          <div class="bottom" style="margin-top:60px">${logo('light')}${s.pill ? pill(s.pill) : ''}</div>
        </div>`;
    case 'reelcover':
      return `<div class="photo-bg"><img src="${img(s.image)}" style="object-position:${s.pos || 'center'}"></div>
        <div class="rc-shade"></div>
        <div class="rc-safe">
          ${labelHtml(label)}
          <h1 class="headline l on-photo rc-head">${rich(s.headline)}</h1>
          ${s.sub ? `<div style="margin-top:34px">${pill(s.sub)}</div>` : ''}
          <div class="rc-logo">${logo('light')}</div>
        </div>`;
    case 'repost':
      return `<div style="height:150px"></div>
        <div class="label" style="justify-content:center">${esc(label)}</div>
        <div class="rp-card${s.reel ? ' reel' : ''}"><img src="${img(s.image)}">${s.reel ? '<span class="rp-play"></span>' : ''}</div>
        <h2 class="headline m rp-head">${rich(s.headline)}</h2>
        <div style="display:flex;justify-content:center;margin-top:44px">${pill(s.pill || 'Jetzt im Profil ansehen')}</div>
        <div class="spacer"></div>
        <div class="bottom" style="justify-content:center;margin:0 0 150px">${logo('dark', 'center')}</div>`;
    case 'raw':
      // Eigenes, fertig gestaltetes Bild: vollständig sichtbar (kein Beschnitt), Ränder mit weichgezeichnetem Bild gefüllt
      return `<div class="raw-bg"><img src="${img(s.image)}"></div><img class="raw-img" src="${img(s.image)}">`;
    default:
      throw new Error('Unbekannter Folientyp: ' + s.type);
  }
}

/** Liefert für jede Folie ein vollständiges HTML-Dokument. img(ref) -> URL/Data-URI */
export function buildSlideDocs(job, img) {
  const fmt = job.format || 'post';
  const [w, h] = SIZES[fmt];
  return job.slides.map((s, i) => `<!doctype html><html lang="de"><head><meta charset="utf-8">
    <style>:root{--w:${w}px;--h:${h}px}${FONT_CSS}${BRAND_CSS}</style></head>
    <body class="theme-${job.theme || 'edition'} fmt-${fmt}"><div class="frame t-${s.type}">${slideHtml(s, i, job.slides.length, job, img)}</div></body></html>`);
}
