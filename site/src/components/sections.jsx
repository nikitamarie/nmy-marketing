// Seitenabschnitte im Rhode-Stil: weiße Seite, Kacheln (#F1F0ED, 16 px Radius), kleingeschriebene fette Titel,
// Helvetica-Text, Pillen-Knöpfe in Versalien, waagerechte Karussells mit Punkten.
// Reihenfolge = Verkaufsweg: Hub → Behandlungen & Preise → Beweis → Sorge & Antwort → Stimmen → Person → Fragen → Termin.
import { Img, Arrow, Dots } from './ui.jsx';
import { RESULTS, IMAGES } from '../content/images.js';
import { BRAND, BOOKING, ANNOUNCE, HERO, HUB_LINKS, PAINS, TREATMENTS, MORE_TREATMENTS, HEALING, ABOUT, FAQ } from '../content/site.js';
import { bookingLink, whatsappLink } from '../lib.js';
import { LOGO_LIGHT } from '../../../shared/brand-assets.gen.mjs';

const Section = ({ id, children, className = '' }) => <section id={id} className={`mt-3 scroll-mt-3 ${className}`}>{children}</section>;

/* ---------- Laufband + Hero + Link-Hub ---------- */
export function Hub({ onBook, rating }) {
  return (
    <header id="start">
      <p className="tile mb-3 py-2.5 text-center text-[0.75rem] uppercase tracking-[.06em]">{ANNOUNCE}</p>

      {/* Hero-Kachel: Schwarz-Weiß-Porträt, Text unten links in Weiß (Rhode) */}
      <div className="hero-frame tile relative" style={{ height: 'min(76svh, 760px)' }}>
        <div className="hero-img absolute inset-0 will-change-transform"><Img slot="HERO_PORTRAIT" eager ratio="auto" className="h-full" /></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/10" aria-hidden="true" />
        <img src={LOGO_LIGHT} alt="NMY Cosmetics" className="absolute left-1/2 top-5 h-11 w-auto -translate-x-1/2" />
        <div className="absolute inset-x-0 bottom-0 p-[var(--spacing-pad)] text-white">
          <h1 className="reveal leading-[1.04] tracking-[-0.015em]" style={{ fontSize: 'var(--text-hero)' }}>{HERO.title}</h1>
          <button onClick={() => onBook()} className="reveal pill pill-white mt-5">{HERO.cta}</button>
        </div>
      </div>

      {/* Wer · was · wo + Vertrauenssignale */}
      <div className="tile mt-3 p-[var(--spacing-pad)]">
        <p className="reveal text-[1.0625rem] leading-snug text-ink-strong">{HERO.lead}</p>
        <ul className="reveal mt-4 flex flex-wrap gap-2">
          {HERO.trust.map(t => <li key={t} className="rounded-full border border-line px-3 py-1.5 text-[0.8125rem]">{t}</li>)}
        </ul>
        {rating && <p className="mt-3 text-[0.875rem]"><b className="text-ink-strong">{rating.value} ★</b> · {rating.count} Google-Bewertungen</p>}

        {/* Priorisierte Knöpfe (Link in Bio) */}
        <nav className="mt-6" aria-label="Schnellzugriff">
          {HUB_LINKS.map(l => l.primary ? (
            <button key={l.id} id="hero-cta" onClick={() => onBook()} className="reveal pill pill-solid w-full !min-h-[3.25rem]">{l.label} <Arrow /></button>
          ) : (
            <a key={l.id} href={l.action === 'whatsapp' ? whatsappLink('hub') : l.href}
              className="reveal flex min-h-[3.25rem] items-center justify-between border-b border-line text-[0.9375rem] uppercase tracking-[.04em] no-underline first-of-type:mt-2 last:border-0">
              {l.label}<Arrow />
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

/* ---------- Behandlungen & Preise (Produktkarten wie „the kit“) ---------- */
export function Treatments({ onBook }) {
  return (
    <Section id="behandlungen">
      <div className="tile px-[var(--spacing-pad)] pb-6 pt-7">
        <span className="label inline-block rounded-full bg-ink px-2.5 py-1 text-white">{TREATMENTS.length} angebote · mit preisen</span>
        <h2 className="title reveal mt-3">behandlungen</h2>
        <p className="reveal mt-3 max-w-[36ch]">Für wen, wie es aussieht, wie lange es hält – und was es kostet. Wischen für mehr.</p>
      </div>
      <div id="tr-track" className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto" tabIndex={0} aria-label="Behandlungen, seitlich wischen">
        {TREATMENTS.map(t => (
          <article key={t.id} className="tile flex w-[86%] flex-none snap-start flex-col" aria-labelledby={`t-${t.id}`}>
            <div className="relative"><Img slot={t.image} ratio="1 / 1" /></div>
            <div className="flex flex-1 flex-col p-[var(--spacing-pad)]">
              <div className="flex items-baseline justify-between gap-3">
                <h3 id={`t-${t.id}`} className="text-[1.0625rem] font-bold uppercase tracking-[.03em] text-ink-strong">{t.name}</h3>
                {BOOKING.showPrices && <span className="text-[1.0625rem] font-bold text-ink-strong">{t.price}</span>}
              </div>
              <p className="text-[0.875rem]">{t.sub}</p>
              <dl className="mt-4 space-y-3 text-[0.9375rem]">
                <div><dt className="label font-bold">Für wen</dt><dd className="mt-0.5">{t.forWhom}</dd></div>
                <div><dt className="label font-bold">Ergebnis</dt><dd className="mt-0.5">{t.result}</dd></div>
              </dl>
              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-[0.8125rem]">
                <div><dt>Dauer</dt><dd className="font-bold text-ink-strong">{t.duration}</dd></div>
                <div><dt>Hält</dt><dd className="font-bold text-ink-strong">{t.lasts}</dd></div>
                <div><dt>Nachtermin</dt><dd className="font-bold text-ink-strong">{t.touchUp}</dd></div>
              </dl>
              <button onClick={() => onBook(t.id)} className="pill pill-line mt-auto w-full !mt-5 !text-[0.8125rem]">
                {t.name} buchen{BOOKING.showPrices ? ` – ${t.price}` : ''}
              </button>
            </div>
          </article>
        ))}
      </div>
      <Dots target="tr-track" count={TREATMENTS.length} />
      <p className="mt-3 px-1 text-center text-[0.8125rem] text-muted">{MORE_TREATMENTS}</p>

      {/* Niedrige Hürde für Unentschlossene */}
      <div className="tile reveal mt-3 flex items-center justify-between gap-4 p-[var(--spacing-pad)]">
        <div><p className="title-sm">noch unsicher?</p><p className="mt-1 text-[0.9375rem]">Schreib mir per WhatsApp – wir finden zusammen heraus, was zu dir passt.</p></div>
        <button onClick={() => onBook('beratung')} className="pill pill-line flex-none">Beratung</button>
      </div>
    </Section>
  );
}

/* ---------- Beweis: Ergebnisse + Heilungsverlauf ---------- */
export function Results({ onBook }) {
  const [first, ...rest] = RESULTS;
  return (
    <Section id="ergebnisse">
      {/* Große Bildkachel mit Text auf dem Bild (Rhode „one of everything really good“) */}
      <figure className="zoom-frame tile relative" style={{ clipPath: 'inset(0 0 0 0 round 16px)' }}>
        <Img image={{ ...first, alt: `${first.label} – ${first.stage}` }} ratio="4 / 5" imgClass="zoom-img" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" aria-hidden="true" />
        <figcaption className="absolute inset-x-0 bottom-0 p-[var(--spacing-pad)] text-white">
          <h2 className="title !text-white">echte ergebnisse</h2>
          <p className="mt-2 max-w-[32ch] text-[0.9375rem]">Echte Kundinnen, fotografiert direkt nach der Behandlung – ohne Filter, ohne Bearbeitung des Ergebnisses.</p>
          <span className="label mt-3 inline-block">{first.label} · {first.stage}</span>
        </figcaption>
      </figure>
      <div id="res-track" className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto" tabIndex={0} aria-label="Weitere Ergebnisse, seitlich wischen">
        {rest.map(r => (
          <figure key={r.src} className="tile relative w-[62%] flex-none snap-start">
            <Img image={{ ...r, alt: `${r.label} – ${r.stage}` }} />
            <figcaption className="p-3 text-[0.8125rem] uppercase tracking-[.04em]">{r.label} · {r.stage}</figcaption>
          </figure>
        ))}
      </div>
      <Dots target="res-track" count={rest.length} />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <figure className="tile"><Img slot="HEALED_BROWS" /><figcaption className="p-3 text-[0.8125rem] uppercase tracking-[.04em]">Brows · abgeheilt</figcaption></figure>
        <figure className="tile"><Img slot="HEALED_LIPS" /><figcaption className="p-3 text-[0.8125rem] uppercase tracking-[.04em]">Lips · abgeheilt</figcaption></figure>
      </div>

      {/* Heilungsverlauf – realistische Erwartungen */}
      <div className="tile mt-3 p-[var(--spacing-pad)] pt-7">
        <h2 className="title reveal">so heilt es</h2>
        <p className="reveal mt-3">Damit du weißt, was dich erwartet – ehrlich und ohne Überraschungen.</p>
        <ol className="healing relative mt-7 pl-8">
          <span aria-hidden="true" className="absolute bottom-2 left-[5px] top-2 w-px bg-line" />
          <span aria-hidden="true" className="heal-line absolute bottom-2 left-[5px] top-2 w-px origin-top bg-ink" />
          {HEALING.map(h => (
            <li key={h.when} className="reveal relative pb-7 last:pb-0">
              <span aria-hidden="true" className="absolute -left-8 top-1 h-[11px] w-[11px] rounded-full border border-ink bg-tile" />
              <p className="label font-bold">{h.when}</p>
              <p className="mt-1 text-[1.0625rem] font-bold text-ink-strong">{h.title}</p>
              <p className="mt-1 text-[0.9375rem]">{h.text}</p>
            </li>
          ))}
        </ol>
        <button onClick={() => onBook()} className="pill pill-solid mt-8 w-full">Termin online buchen</button>
      </div>
    </Section>
  );
}

/* ---------- Sorge & Antwort (Einwand vor der Stimme) ---------- */
export function Pains() {
  return (
    <Section>
      <div className="tile p-[var(--spacing-pad)] pt-7">
        <h2 className="title reveal">kennst du das?</h2>
        <ul className="mt-5">
          {PAINS.items.map(([b, t]) => <li key={b} className="reveal border-t border-line py-4"><b className="text-ink-strong">{b}</b>{t}</li>)}
        </ul>
        <div className="reveal mt-4 rounded-[var(--radius-tile)] bg-page p-5">
          <p className="text-[1.375rem] leading-snug text-ink-strong">{PAINS.fear[0]}{PAINS.fear[1]}{PAINS.fear[2]}</p>
          <p className="mt-3 text-[0.9375rem]">{PAINS.answer}</p>
        </div>
      </div>
    </Section>
  );
}

/* ---------- Kundenstimmen ---------- */
export function Voices({ reviews, rating }) {
  return (
    <Section id="stimmen">
      <div className="tile px-[var(--spacing-pad)] pb-6 pt-7">
        <h2 className="title reveal">das sagen kundinnen</h2>
        {rating && <p className="mt-3"><b className="text-ink-strong">{rating.value} von 5</b> · {rating.count} Bewertungen auf Google</p>}
      </div>
      <div id="rv-track" className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto" tabIndex={0} aria-label="Kundenstimmen, seitlich wischen">
        {reviews.map(r => (
          <figure key={r.text} className="tile flex w-[86%] flex-none snap-start flex-col justify-between p-[var(--spacing-pad)] pt-7">
            <blockquote className="text-[1.375rem] leading-snug text-ink-strong">„{r.text}“</blockquote>
            <figcaption className="label mt-6">{r.who} · {r.src}</figcaption>
          </figure>
        ))}
      </div>
      <Dots target="rv-track" count={reviews.length} />
      {rating && <p className="mt-2 px-1 text-[0.75rem] text-muted">Unverändert aus Google übernommen. Die Bewertungen werden auf Google abgegeben; ich prüfe nicht selbst, ob die Verfasserinnen tatsächlich Kundinnen sind.</p>}
    </Section>
  );
}

/* ---------- Über mich & Sicherheit ---------- */
export function About() {
  return (
    <Section id="ueber-mich">
      <figure className="tile relative">
        <div className="parallax overflow-hidden"><Img slot="ABOUT_PORTRAIT" imgClass="parallax-img scale-[1.12]" /></div>
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-[var(--spacing-pad)] pt-24 text-white">
          <p className="label">Die Person hinter NMY</p>
          <h2 className="title mt-2 !text-white">{BRAND.person.toLowerCase()}</h2>
        </figcaption>
      </figure>
      <div className="tile mt-3 p-[var(--spacing-pad)] pt-6">
        <p className="reveal text-[0.875rem] uppercase tracking-[.04em]">{ABOUT.role}</p>
        <p className="reveal mt-3 text-[1.0625rem] leading-snug text-ink-strong">{ABOUT.text}</p>
        {/* Versprechen als Listenzeilen (Rhode „mission / futures / sustainability“) */}
        <div className="mt-6">
          {ABOUT.promises.map(([b, t]) => (
            <details key={b} className="reveal group border-t border-line">
              <summary className="flex min-h-[3.5rem] cursor-pointer list-none items-center justify-between gap-4 text-[1.0625rem] font-bold lowercase text-ink-strong [&::-webkit-details-marker]:hidden">
                {b.replace(/\.$/, '')}<span aria-hidden="true" className="text-xl font-normal transition-transform duration-300 group-open:rotate-45">+</span>
              </summary>
              <p className="pb-4 text-[0.9375rem]">{t}</p>
            </details>
          ))}
        </div>
      </div>
      <figure className="tile mt-3"><Img slot="STUDIO_AMBIENCE" ratio="3 / 2" /><figcaption className="p-3 text-[0.8125rem] uppercase tracking-[.04em]">Mein Arbeitsplatz · {BRAND.region}</figcaption></figure>
    </Section>
  );
}

/* ---------- Häufige Fragen ---------- */
export function Faq() {
  return (
    <Section id="fragen">
      <div className="tile p-[var(--spacing-pad)] pt-7">
        <h2 className="title reveal">fragen</h2>
        <div className="mt-5">
          {FAQ.map(([q, a]) => (
            <details key={q} className="reveal group border-t border-line">
              <summary className="flex min-h-[3.5rem] cursor-pointer list-none items-center justify-between gap-4 py-3 text-[1rem] font-bold text-ink-strong [&::-webkit-details-marker]:hidden">
                {q}<span aria-hidden="true" className="text-xl font-normal transition-transform duration-300 group-open:rotate-45">+</span>
              </summary>
              <p className="pb-4 text-[0.9375rem]">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------- Abschluss + Footer (großer Schriftzug wie Rhode) ---------- */
export function Final({ onBook }) {
  return (
    <Section>
      <div className="tile p-[var(--spacing-pad)] pt-7">
        <p className="font-display text-[clamp(5rem,30vw,9rem)] leading-[.8] tracking-[-0.06em] text-ink" aria-hidden="true">nmy</p>
        <div className="mt-4 border-t border-line pt-5">
          <p className="text-[1.0625rem] text-ink-strong">Freie Termine siehst du direkt online. Noch Fragen? Schreib mir per WhatsApp – ich antworte persönlich.</p>
          {BOOKING.capacityNote && <p className="mt-2 text-[0.9375rem]">{BOOKING.capacityNote}</p>}
          <div className="mt-5 flex flex-col gap-2.5">
            <a href={bookingLink('final')} className="pill pill-solid w-full !min-h-[3.25rem]">Termin online buchen</a>
            <a href={whatsappLink('final', 'Hallo Nikita, ich hätte gern eine unverbindliche Beratung.')} className="pill pill-line w-full">Beratung per WhatsApp</a>
          </div>
        </div>
      </div>
    </Section>
  );
}

export function Footer() {
  return (
    <footer className="tile mb-28 mt-3 p-[var(--spacing-pad)] text-[0.875rem] leading-relaxed">
      <p className="label font-bold">{BRAND.name}</p>
      <p className="mt-2">Permanent Make-up · {BRAND.region}</p>
      <p className="mt-3"><a className="underline underline-offset-4" href={BRAND.instagram}>Instagram</a> · <a className="underline underline-offset-4" href={BRAND.impressum}>Impressum</a> · <a className="underline underline-offset-4" href={BRAND.datenschutz}>Datenschutz</a></p>
      <p className="mt-3 text-[0.75rem] text-muted">Diese Seite setzt keine Cookies und zählt nur anonym, welcher Knopf angetippt wird.</p>
      {Object.values(IMAGES).some(i => i.ai) && <p className="mt-2 text-[0.75rem] text-muted">Mit „KI“ markierte Bilder wurden mit KI erstellt. Alle Ergebnisfotos von Kundinnen sind echt und unverändert.</p>}
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
