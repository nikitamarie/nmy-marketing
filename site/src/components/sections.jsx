// Seitenabschnitte – Rhode-Prinzip: viel Weiß, wenige Kacheln, eine Titelschrift (Archivo Black, klein geschrieben),
// große ruhige Statement-Zeilen als Pausen, Fotos ohne Grauschleier, wenig Text.
// Reihenfolge = Verkaufsweg: Start → Behandlungen & Preise → Beweis → Sorge & Antwort → Stimmen → Person → Fragen → Termin.
import { Img, Arrow, Dots } from './ui.jsx';
import { RESULTS, IMAGES } from '../content/images.js';
import { BRAND, BOOKING, ANNOUNCE, HERO, HUB_LINKS, PAINS, TREATMENTS, MORE_TREATMENTS, HEALING, ABOUT, FAQ } from '../content/site.js';
import { bookingLink, whatsappLink } from '../lib.js';
import { LOGO_DARK, LOGO_LIGHT } from '../../../shared/brand-assets.gen.mjs';

const hasImg = slot => !!IMAGES[slot]?.src;

/** Große, ruhige Zeile zwischen den Abschnitten (Rhode-Pause) */
function Statement({ children, sub }) {
  return (
    <section className="px-2 py-20 text-center">
      <p className="title reveal mx-auto max-w-[14ch] !text-[clamp(2.4rem,11vw,3.6rem)] !leading-[0.98]">{children}</p>
      {sub && <p className="reveal mx-auto mt-5 max-w-[30ch] text-[0.9375rem]">{sub}</p>}
    </section>
  );
}

const Head = ({ title, sub }) => (
  <div className="px-1 pb-5 pt-16">
    <h2 className="title reveal">{title}</h2>
    {sub && <p className="reveal mt-3 max-w-[34ch]">{sub}</p>}
  </div>
);

/* ---------- Start: Foto, Titel, eine klare Handlung, Link-Hub ---------- */
export function Hub({ onBook, rating }) {
  return (
    <header id="start">
      <p className="py-3 text-center text-[0.75rem] uppercase tracking-[.08em]">{ANNOUNCE}</p>
      <div className="hero-frame tile relative" style={{ height: 'min(78svh, 780px)' }}>
        <div className="hero-img absolute inset-0 will-change-transform"><Img slot="HERO_PORTRAIT" eager ratio="auto" className="h-full" /></div>
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/35 to-transparent" aria-hidden="true" />
        <img src={LOGO_DARK} alt="NMY Cosmetics" className="absolute left-1/2 top-5 h-10 w-auto -translate-x-1/2 opacity-80" />
        <div className="absolute inset-x-0 bottom-0 p-[var(--spacing-pad)] text-white">
          <h1 className="title reveal !text-white !text-[clamp(2.8rem,13vw,4.4rem)] !leading-[0.95]">Natürlich.<br />Präzise.<br />Deins.</h1>
          <button onClick={() => onBook()} className="reveal pill pill-white mt-6">{HERO.cta}</button>
        </div>
      </div>

      <div className="px-1 pt-8">
        <p className="reveal text-[1.0625rem] leading-snug text-ink-strong">{HERO.lead}</p>
        <p className="reveal mt-3 text-[0.875rem]">{HERO.trust.join(' · ')}</p>
        {rating && <p className="mt-2 text-[0.875rem]"><b className="text-ink-strong">{rating.value} ★</b> · {rating.count} Google-Bewertungen</p>}
      </div>

      <nav className="mt-7 px-1" aria-label="Schnellzugriff">
        {HUB_LINKS.map(l => l.primary ? (
          <button key={l.id} id="hero-cta" onClick={() => onBook()} className="reveal pill pill-solid mb-2 w-full !min-h-[3.25rem]">{l.label} <Arrow /></button>
        ) : (
          <a key={l.id} href={l.action === 'whatsapp' ? whatsappLink('hub') : l.href}
            className="reveal flex min-h-[3.25rem] items-center justify-between border-b border-line text-[0.9375rem] uppercase tracking-[.04em] no-underline">
            {l.label}<Arrow />
          </a>
        ))}
      </nav>
    </header>
  );
}

/* ---------- Behandlungen & Preise ---------- */
export function Treatments({ onBook }) {
  const withImg = TREATMENTS.filter(t => hasImg(t.image));
  const rest = TREATMENTS.filter(t => !hasImg(t.image));
  return (
    <section id="behandlungen" className="scroll-mt-3">
      <Head title="Behandlungen" sub="Permanent Make-up für Brauen und Lippen – weich, typgerecht, natürlich." />
      <div id="tr-track" className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto" tabIndex={0} aria-label="Behandlungen, seitlich wischen">
        {withImg.map(t => (
          <article key={t.id} className="tile flex w-[86%] flex-none snap-start flex-col" aria-labelledby={`t-${t.id}`}>
            <Img slot={t.image} ratio="4 / 5" />
            <div className="flex flex-1 flex-col p-[var(--spacing-pad)]">
              <div className="flex items-baseline justify-between gap-3">
                <h3 id={`t-${t.id}`} className="title-sm">{t.name}</h3>
                {BOOKING.showPrices && <span className="text-[1.0625rem] font-bold text-ink-strong">{t.price}</span>}
              </div>
              <p className="mt-3 text-[0.9375rem] leading-relaxed">{t.result}</p>
              <p className="mt-3 text-[0.8125rem]">{t.duration} · hält {t.lasts} · Nachtermin {t.touchUp}</p>
              <button onClick={() => onBook(t.id)} className="pill pill-solid mt-auto w-full !mt-5">Termin buchen</button>
            </div>
          </article>
        ))}
      </div>
      {withImg.length > 1 && <Dots target="tr-track" count={withImg.length} />}

      {rest.length > 0 && (
        <div className="mt-8 px-1">
          {rest.map(t => (
            <button key={t.id} onClick={() => onBook(t.id)} className="reveal flex min-h-[4rem] w-full items-center justify-between gap-4 border-t border-line py-4 text-left last:border-b">
              <span><span className="block text-[1rem] font-bold text-ink-strong">{t.name}</span><span className="block text-[0.8125rem]">{t.sub} · {t.duration}</span></span>
              <span className="flex flex-none items-center gap-3 whitespace-nowrap text-[0.9375rem] text-ink-strong">{BOOKING.showPrices && t.price}<Arrow /></span>
            </button>
          ))}
          <p className="mt-4 text-[0.8125rem] text-muted">{MORE_TREATMENTS}</p>
        </div>
      )}
    </section>
  );
}

/* ---------- Beweis: echte Ergebnisse + Heilung ---------- */
export function Results({ onBook }) {
  const [first, ...rest] = RESULTS;
  return (
    <section id="ergebnisse" className="scroll-mt-3">
      <Head title="Echte Ergebnisse" sub="Fotografiert direkt nach der Behandlung – ohne Filter, ohne Bearbeitung des Ergebnisses." />
      <figure className="zoom-frame tile" style={{ clipPath: 'inset(0 0 0 0 round 16px)' }}>
        <Img image={{ ...first, alt: `${first.label} – ${first.stage}` }} ratio="4 / 5" imgClass="zoom-img" />
      </figure>
      <p className="mt-2 px-1 text-[0.8125rem] uppercase tracking-[.04em]">{first.label} · {first.stage}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {rest.slice(0, 4).map(r => (
          <figure key={r.src} className="reveal">
            <Img image={{ ...r, alt: `${r.label} – ${r.stage}` }} className="rounded-[var(--radius-tile)]" />
            <figcaption className="mt-2 px-1 text-[0.75rem] uppercase tracking-[.04em]">{r.label}</figcaption>
          </figure>
        ))}
      </div>
      <a href={BRAND.instagram} className="mt-4 block px-1 text-[0.875rem] underline underline-offset-4">Mehr auf Instagram</a>

      <Head title="So heilt es" />
      <ol className="grid grid-cols-2 gap-3">
        {HEALING.map((h, i) => (
          <li key={h.when} className="tile reveal p-4">
            <p className="font-display text-[1.75rem] leading-none tracking-[-0.04em] text-ink">0{i + 1}</p>
            <p className="label mt-3 font-bold">{h.when}</p>
            <p className="mt-1 text-[0.9375rem] font-bold leading-snug text-ink-strong">{h.title}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4 px-1 text-[0.875rem]">{HEALING.map(h => h.text).slice(0, 2).join(' ')}</p>
      <button onClick={() => onBook()} className="pill pill-solid mt-6 w-full">Termin buchen</button>
    </section>
  );
}

/* ---------- Sorge & Antwort ---------- */
export function Pains() {
  return (
    <>
      <Statement sub={PAINS.answer}>„Sieht man, dass es gemacht ist?“</Statement>
      <section className="tile p-[var(--spacing-pad)] pt-7">
        <h2 className="title-sm reveal">Kennst du das?</h2>
        <ul className="mt-4">
          {PAINS.items.map(([b, t]) => <li key={b} className="reveal border-t border-line py-4 text-[0.9375rem]"><b className="text-ink-strong">{b}</b>{t}</li>)}
        </ul>
      </section>
    </>
  );
}

/* ---------- Kundenstimmen ---------- */
export function Voices({ reviews, rating }) {
  return (
    <section id="stimmen">
      <Head title="Das sagen Kundinnen" sub={rating ? `${rating.value} von 5 · ${rating.count} Bewertungen auf Google` : null} />
      <div id="rv-track" className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto" tabIndex={0} aria-label="Kundenstimmen, seitlich wischen">
        {reviews.map(r => (
          <figure key={r.text} className="flex w-[88%] flex-none snap-start flex-col justify-between border-t border-ink pt-6">
            <blockquote className="text-[1.5rem] leading-[1.25] text-ink-strong">„{r.text}“</blockquote>
            <figcaption className="label mt-6">{r.who} · {r.src}</figcaption>
          </figure>
        ))}
      </div>
      <Dots target="rv-track" count={reviews.length} />
      {rating && <p className="mt-2 px-1 text-[0.75rem] text-muted">Unverändert aus Google übernommen. Die Bewertungen werden auf Google abgegeben; ich prüfe nicht selbst, ob die Verfasserinnen tatsächlich Kundinnen sind.</p>}
    </section>
  );
}

/* ---------- Die Person ---------- */
export function About() {
  return (
    <section id="ueber-mich" className="pt-16">
      <figure className="tile relative">
        <div className="parallax overflow-hidden"><Img slot="ABOUT_PORTRAIT" imgClass="parallax-img scale-[1.1]" /></div>
      </figure>
      <div className="px-1 pt-6">
        <p className="label">Die Person hinter NMY</p>
        <h2 className="title reveal mt-2">{BRAND.person}</h2>
        <p className="reveal mt-2 text-[0.875rem]">{ABOUT.role}</p>
        <p className="reveal mt-4 text-[1.0625rem] leading-snug text-ink-strong">{ABOUT.text}</p>
      </div>
      <Statement sub={ABOUT.promises[0][1]}>Kein Stich ohne dein Ja.</Statement>
      <div className="px-1">
        {ABOUT.promises.slice(1).map(([b, t]) => (
          <details key={b} className="reveal group border-t border-line last:border-b">
            <summary className="flex min-h-[3.5rem] cursor-pointer list-none items-center justify-between gap-4 text-[1rem] font-bold text-ink-strong [&::-webkit-details-marker]:hidden">
              {b.replace(/\.$/, '')}<span aria-hidden="true" className="text-xl font-normal transition-transform duration-300 group-open:rotate-45">+</span>
            </summary>
            <p className="pb-4 text-[0.9375rem]">{t}</p>
          </details>
        ))}
      </div>
      {hasImg('STUDIO_AMBIENCE') && <figure className="mt-8"><Img slot="STUDIO_AMBIENCE" ratio="3 / 2" className="rounded-[var(--radius-tile)]" /><figcaption className="mt-2 px-1 text-[0.75rem] uppercase tracking-[.04em]">Mein Arbeitsplatz · {BRAND.region}</figcaption></figure>}
    </section>
  );
}

/* ---------- Häufige Fragen ---------- */
export function Faq() {
  return (
    <section id="fragen" className="scroll-mt-3">
      <Head title="Fragen" />
      <div className="px-1">
        {FAQ.map(([q, a]) => (
          <details key={q} className="reveal group border-t border-line last:border-b">
            <summary className="flex min-h-[3.5rem] cursor-pointer list-none items-center justify-between gap-4 py-3 text-[1rem] font-bold text-ink-strong [&::-webkit-details-marker]:hidden">
              {q}<span aria-hidden="true" className="text-xl font-normal transition-transform duration-300 group-open:rotate-45">+</span>
            </summary>
            <p className="pb-4 text-[0.9375rem]">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ---------- Abschluss: großer Schriftzug wie Rhode ---------- */
export function Final({ onBook }) {
  return (
    <section className="tile mt-16 p-[var(--spacing-pad)] pt-8">
      <p className="font-display text-[clamp(5.5rem,34vw,10rem)] leading-[.78] tracking-[-0.06em] text-ink" aria-hidden="true">NMY</p>
      <div className="mt-5 border-t border-line pt-5">
        <p className="text-[1.0625rem] text-ink-strong">Freie Termine siehst du direkt online. Fragen? Schreib mir – ich antworte persönlich.</p>
        {BOOKING.capacityNote && <p className="mt-2 text-[0.9375rem]">{BOOKING.capacityNote}</p>}
        <div className="mt-5 flex flex-col gap-2.5">
          <a href={bookingLink('final')} className="pill pill-solid w-full !min-h-[3.25rem]">Termin online buchen</a>
          <a href={whatsappLink('final', 'Hallo Nikita, ich hätte gern eine unverbindliche Beratung.')} className="pill pill-line w-full">Beratung per WhatsApp</a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="mb-28 mt-8 px-1 text-[0.8125rem] leading-relaxed">
      <img src={LOGO_DARK} alt="NMY Cosmetics" className="h-9 w-auto opacity-70" />
      <p className="mt-3">Permanent Make-up · {BRAND.region}</p>
      <p className="mt-2"><a className="underline underline-offset-4" href={BRAND.instagram}>Instagram</a> · <a className="underline underline-offset-4" href={BRAND.impressum}>Impressum</a> · <a className="underline underline-offset-4" href={BRAND.datenschutz}>Datenschutz</a></p>
      <p className="mt-3 text-[0.75rem] text-muted">Diese Seite setzt keine Cookies und zählt nur anonym, welcher Knopf angetippt wird.</p>
      {Object.values(IMAGES).some(i => i.ai) && <p className="mt-1 text-[0.75rem] text-muted">Mit „KI“ markierte Bilder wurden mit KI erstellt. Alle Ergebnisfotos von Kundinnen sind echt und unverändert.</p>}
    </footer>
  );
}

/* ---------- Feste Buchungsleiste ---------- */
export function StickyBar({ visible, onBook }) {
  return (
    <div style={{ visibility: visible ? 'visible' : 'hidden', transition: visible ? 'visibility 0s' : 'visibility 0s linear .5s' }}
      className={`fixed inset-x-0 bottom-0 z-30 flex gap-2 px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 transition-transform duration-500 ${visible ? 'translate-y-0' : 'translate-y-full'}`}>
      <div className="mx-auto flex w-full max-w-[620px] gap-2 rounded-full bg-white/90 p-1.5 shadow-[0_6px_24px_rgb(59_56_52/0.16)] backdrop-blur">
        <button onClick={() => onBook()} className="pill pill-solid flex-1 !min-h-[3rem]" tabIndex={visible ? 0 : -1}>Termin buchen</button>
        <a href={whatsappLink('leiste')} aria-label="Frage per WhatsApp" tabIndex={visible ? 0 : -1} className="grid h-12 w-12 flex-none place-items-center rounded-full border border-line text-ink-strong">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.7 14.9L2 22l5.3-1.4A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3z" /></svg>
        </a>
      </div>
    </div>
  );
}
