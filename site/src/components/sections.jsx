// Alle Seitenabschnitte. Reihenfolge = Verkaufsgeschichte:
// Link-Hub → Schmerzpunkt → Beweis (Ergebnisse + Heilung) → Behandlungen → Stimmen → Person & Sicherheit → Fragen → Termin.
import { useState } from 'react';
import { Img, Title, Arrow, Eyebrow } from './ui.jsx';
import { IMAGES, RESULTS } from '../content/images.js';
import { BRAND, BOOKING, HERO, HUB_LINKS, PAINS, TREATMENTS, MORE_TREATMENTS, HEALING, ABOUT, FAQ } from '../content/site.js';
import { bookingLink, whatsappLink, PREVIEW } from '../lib.js';

import { LOGO_DARK } from '../../../shared/brand-assets.gen.mjs'; // NMY-Logo (gleiches wie in der App)

/* ---------- 1. Link-in-Bio-Hub (erster Bildschirm) ---------- */
export function Hub({ onBook, rating }) {
  return (
    <header id="start" className="relative">
      <div className="hero-frame relative overflow-hidden" style={{ height: 'min(62svh, 640px)' }}>
        <div className="hero-img absolute inset-0 will-change-transform">
          <Img slot="HERO_PORTRAIT" eager ratio="auto" className="h-full" />
        </div>
        <img src={LOGO_DARK} alt="NMY Cosmetics" className="absolute left-[var(--spacing-gutter)] top-[calc(16px+env(safe-area-inset-top))] h-11 w-auto" />
      </div>
      <div className="px-[var(--spacing-gutter)] pt-8">
        <Eyebrow>{HERO.eyebrow}</Eyebrow>
        <Title as="h1" lines={HERO.title} className="reveal mt-4" />
        <p className="lead reveal mt-5 max-w-[34ch]">{HERO.lead}</p>
        <ul className="reveal mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[0.9375rem] text-taupe-text" aria-label="Darauf kannst du dich verlassen">
          {HERO.trust.map(t => <li key={t} className="flex items-center gap-2"><span aria-hidden="true" className="h-1 w-1 rounded-full bg-mocca" />{t}</li>)}
        </ul>
        {rating && <p className="reveal mt-4 text-[0.9375rem] text-taupe-text"><b className="text-espresso">{rating.value}</b> von 5 · {rating.count} Google-Bewertungen</p>}

        <nav className="mt-9" aria-label="Schnellzugriff">
          {HUB_LINKS.map(l => l.primary ? (
            <button key={l.id} onClick={() => onBook()} className="btn btn-primary reveal w-full justify-between" id="hero-cta">
              <span className="text-left leading-tight">{l.label}<span className="block text-[0.8125rem] font-normal opacity-70">{l.hint}</span></span><Arrow />
            </button>
          ) : (
            <a key={l.id} href={l.action === 'whatsapp' ? whatsappLink('hub') : l.href}
              className="reveal flex min-h-[4.25rem] items-center justify-between gap-4 border-b border-line py-4 no-underline first-of-type:mt-3">
              <span className="leading-snug"><span className="font-semibold">{l.label}</span><span className="block text-[0.875rem] text-taupe-text">{l.hint}</span></span>
              <Arrow className="text-mocca" />
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

/* ---------- 2. Schmerzpunkt ---------- */
export function Pains() {
  return (
    <section className="section" aria-labelledby="pain-t">
      <Eyebrow>{PAINS.eyebrow}</Eyebrow>
      <h2 id="pain-t" className="h2 reveal mt-4">{PAINS.title[0]}<br /><em>{PAINS.title[1]}</em></h2>
      <ul className="mt-9">
        {PAINS.items.map(([b, t]) => <li key={b} className="reveal border-t border-line py-6 text-[1.1875rem] leading-relaxed text-taupe-text"><b className="font-semibold text-espresso">{b}</b>{t}</li>)}
      </ul>
      <div className="reveal mt-10 rounded-[var(--radius-soft)] bg-alabaster p-7">
        <p className="font-serif text-[2rem] leading-[1.15]">{PAINS.fear[0]}<em>{PAINS.fear[1]}</em>{PAINS.fear[2]}</p>
        <p className="mt-5 text-taupe-text">{PAINS.answer}</p>
      </div>
    </section>
  );
}

/* ---------- 3. Ergebnisse + Heilungsverlauf ---------- */
export function Results({ onBook }) {
  const [first, ...rest] = RESULTS;
  return (
    <section id="ergebnisse" className="section scroll-mt-6" aria-labelledby="res-t">
      <Eyebrow>Echte Ergebnisse</Eyebrow>
      <h2 id="res-t" className="h2 reveal mt-4">Sieh <em>selbst.</em></h2>
      <p className="lead reveal mt-5">Echte Kundinnen, fotografiert direkt nach der Behandlung – ohne Filter.</p>

      {/* Kamerafahrt: das erste Bild öffnet sich beim Scrollen bis zur vollen Breite */}
      <figure className="zoom-frame relative -mx-[var(--spacing-gutter)] mt-10" style={{ clipPath: 'inset(0 0 0 0)' }}>
        <Img image={{ ...first, alt: `${first.label} – ${first.stage}` }} ratio="1 / 1" imgClass="zoom-img" />
        <figcaption className="absolute bottom-4 left-[var(--spacing-gutter)] rounded-full bg-alabaster/95 px-3.5 py-1.5 text-[0.8125rem] font-medium">{first.label} · {first.stage}</figcaption>
      </figure>

      <div className="-mx-[var(--spacing-gutter)] mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[var(--spacing-gutter)] pb-2 [scrollbar-width:none]" tabIndex={0} aria-label="Weitere Ergebnisse, seitlich wischen">
        {rest.map(r => (
          <figure key={r.src} className="relative w-[72%] flex-none snap-center">
            <Img image={{ ...r, alt: `${r.label} – ${r.stage}` }} className="rounded-[var(--radius-soft)]" />
            <figcaption className="absolute bottom-3 left-3 rounded-full bg-alabaster/95 px-3 py-1 text-[0.8125rem] font-medium">{r.label} · {r.stage}</figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-3 text-[0.875rem] text-taupe-text">Seitlich wischen für mehr · <a className="link-underline" href={BRAND.instagram}>alle auf Instagram</a></p>

      {(IMAGES.HEALED_BROWS.src || IMAGES.HEALED_LIPS.src || PREVIEW) && (
        <div className="reveal mt-12 grid grid-cols-2 gap-3">
          <figure><Img slot="HEALED_BROWS" className="rounded-[var(--radius-soft)]" /><figcaption className="mt-2 text-[0.875rem] text-taupe-text">Powder Brows · abgeheilt</figcaption></figure>
          <figure><Img slot="HEALED_LIPS" className="rounded-[var(--radius-soft)]" /><figcaption className="mt-2 text-[0.875rem] text-taupe-text">Lip Blush · abgeheilt</figcaption></figure>
        </div>
      )}

      <h3 className="reveal mt-20 text-[2.25rem]">So <em>heilt</em> es.</h3>
      <p className="reveal mt-3 text-taupe-text">Damit du weißt, was dich erwartet – ehrlich und ohne Überraschungen.</p>
      <ol className="healing relative mt-8 pl-9">
        <span aria-hidden="true" className="absolute bottom-3 left-[7px] top-3 w-px bg-line" />
        <span aria-hidden="true" className="heal-line absolute bottom-3 left-[7px] top-3 w-px origin-top bg-mocca" />
        {HEALING.map(h => (
          <li key={h.when} className="reveal relative pb-9 last:pb-0">
            <span aria-hidden="true" className="absolute -left-9 top-1.5 h-[15px] w-[15px] rounded-full border border-mocca bg-sand" />
            <p className="eyebrow">{h.when}</p>
            <p className="mt-1 font-serif text-[1.625rem] leading-tight">{h.title}</p>
            <p className="mt-2 text-taupe-text">{h.text}</p>
          </li>
        ))}
      </ol>
      <button onClick={() => onBook()} className="btn btn-primary reveal mt-12 w-full">So ein Ergebnis anfragen <Arrow /></button>
    </section>
  );
}

/* ---------- 4. Behandlungen ---------- */
export function Treatments({ onBook }) {
  return (
    <section id="behandlungen" className="section scroll-mt-6" aria-labelledby="tr-t">
      <Eyebrow>Behandlungen</Eyebrow>
      <h2 id="tr-t" className="h2 reveal mt-4">Was passt zu <em>dir?</em></h2>
      <div className="mt-10 space-y-16">
        {TREATMENTS.map((t, i) => (
          <article key={t.id} className="reveal" aria-labelledby={`t-${t.id}`}>
            <div className="parallax overflow-hidden rounded-[var(--radius-soft)]"><Img slot={t.image} imgClass="parallax-img scale-[1.12]" /></div>
            <p className="eyebrow mt-6">0{i + 1} · {t.alt}</p>
            <h3 id={`t-${t.id}`} className="mt-2 text-[2.5rem]">{t.name}</h3>
            <dl className="mt-5 space-y-4">
              <div><dt className="text-[0.8125rem] font-semibold uppercase tracking-[.14em] text-mocca">Für wen</dt><dd className="mt-1 text-taupe-text">{t.forWhom}</dd></div>
              <div><dt className="text-[0.8125rem] font-semibold uppercase tracking-[.14em] text-mocca">Ergebnis</dt><dd className="mt-1 text-taupe-text">{t.result}</dd></div>
            </dl>
            <dl className="mt-6 grid grid-cols-3 gap-3 border-y border-line py-4 text-[0.875rem]">
              <div><dt className="text-taupe-text">Dauer</dt><dd className="mt-0.5 font-semibold">{t.duration}</dd></div>
              <div><dt className="text-taupe-text">Hält</dt><dd className="mt-0.5 font-semibold">{t.lasts}</dd></div>
              <div><dt className="text-taupe-text">{BOOKING.showPrices && t.price ? 'Preis' : 'Nachtermin'}</dt><dd className="mt-0.5 font-semibold">{BOOKING.showPrices && t.price ? t.price : t.touchUp}</dd></div>
            </dl>
            <button onClick={() => onBook(t.id)} className="btn btn-ghost mt-6 w-full">{t.name} anfragen <Arrow /></button>
          </article>
        ))}
      </div>
      <p className="reveal mt-10 text-[0.9375rem] text-taupe-text">{MORE_TREATMENTS} {!BOOKING.showPrices && 'Die Preise siehst du bei der Online-Buchung.'}</p>
    </section>
  );
}

/* ---------- 5. Kundenstimmen ---------- */
export function Voices({ reviews, rating }) {
  return (
    <section id="stimmen" className="section" aria-labelledby="v-t">
      <Eyebrow>Was Kundinnen sagen</Eyebrow>
      <h2 id="v-t" className="h2 reveal mt-4">In ihren <em>Worten.</em></h2>
      {rating && <p className="reveal mt-6 flex items-baseline gap-3"><span className="font-serif text-[4.5rem] leading-none">{rating.value}</span><span className="text-taupe-text">von 5 · {rating.count} Bewertungen auf Google</span></p>}
      <div className="mt-8">
        {reviews.map(r => (
          <figure key={r.text} className="reveal border-t border-line py-8">
            <blockquote className="font-serif text-[1.875rem] leading-[1.22]">„{r.text}“</blockquote>
            <figcaption className="mt-4 text-[0.9375rem] text-taupe-text"><b className="font-semibold text-espresso">{r.who}</b> · {r.src}</figcaption>
          </figure>
        ))}
      </div>
      {rating && <p className="text-[0.8125rem] leading-relaxed text-taupe-text">Unverändert aus Google übernommen. Die Bewertungen werden auf Google abgegeben; ich prüfe nicht selbst, ob die Verfasserinnen tatsächlich Kundinnen sind.</p>}
    </section>
  );
}

/* ---------- 6. Über mich & Sicherheit ---------- */
export function About() {
  return (
    <section id="ueber-mich" className="section" aria-labelledby="a-t">
      <div className="-mx-[var(--spacing-gutter)] overflow-hidden"><Img slot="ABOUT_PORTRAIT" imgClass="parallax-img scale-[1.12]" className="parallax" /></div>
      <Eyebrow className="mt-10">{ABOUT.eyebrow}</Eyebrow>
      <h2 id="a-t" className="h2 reveal mt-4">{BRAND.person.split(' ').slice(0, -1).join(' ')} <em>{BRAND.person.split(' ').pop()}</em></h2>
      <p className="reveal mt-3 text-[0.9375rem] text-taupe-text">{ABOUT.role}</p>
      <p className="lead reveal mt-6">{ABOUT.text}</p>

      <h3 className="reveal mt-14 text-[2rem]">Darauf kannst du dich <em>verlassen.</em></h3>
      <ol className="mt-6">
        {ABOUT.promises.map(([b, t], i) => (
          <li key={b} className="reveal grid grid-cols-[2.75rem_1fr] border-t border-line py-6">
            <span className="pt-1.5 text-[0.8125rem] font-semibold text-mocca">0{i + 1}</span>
            <div><p className="font-serif text-[1.625rem] leading-tight">{b}</p><p className="mt-2 text-taupe-text">{t}</p></div>
          </li>
        ))}
      </ol>
      <div className="reveal mt-8"><Img slot="STUDIO_AMBIENCE" ratio="3 / 2" className="rounded-[var(--radius-soft)]" /></div>
      <p className="reveal mt-8 font-script text-[3rem] leading-none">{BRAND.firstName}</p>
    </section>
  );
}

/* ---------- 7. Häufige Fragen ---------- */
export function Faq() {
  return (
    <section id="fragen" className="section scroll-mt-6" aria-labelledby="f-t">
      <Eyebrow>Häufige Fragen</Eyebrow>
      <h2 id="f-t" className="h2 reveal mt-4">Gut zu <em>wissen.</em></h2>
      <div className="mt-8 border-b border-line">
        {FAQ.map(([q, a]) => (
          <details key={q} className="reveal group border-t border-line">
            <summary className="flex min-h-[4rem] cursor-pointer list-none items-center justify-between gap-4 py-5 text-[1.0625rem] font-semibold [&::-webkit-details-marker]:hidden">
              {q}<span aria-hidden="true" className="text-2xl font-light text-mocca transition-transform duration-300 group-open:rotate-45">+</span>
            </summary>
            <p className="pb-6 text-taupe-text">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ---------- 8. Abschluss ---------- */
export function Final({ onBook }) {
  return (
    <section className="mt-[var(--spacing-section)] bg-espresso px-[var(--spacing-gutter)] pb-16 pt-20 text-sand" aria-labelledby="fin-t">
      <p className="eyebrow reveal !text-[#CDBBAE]">{BRAND.regionLong}</p>
      <h2 id="fin-t" className="h2 reveal mt-5">Dein erster Schritt: <em>ein Gespräch.</em></h2>
      <p className="reveal mt-5 text-sand/80">Erzähl mir in drei kurzen Schritten, was du dir wünschst – ich melde mich persönlich bei dir. Oder buch direkt online.</p>
      {BOOKING.capacityNote && <p className="reveal mt-4 text-sand/80">{BOOKING.capacityNote}</p>}
      <div className="reveal mt-9 flex flex-col gap-4">
        <button onClick={() => onBook()} className="btn btn-light w-full">Termin oder Beratung anfragen <Arrow /></button>
        <a href={bookingLink('final')} className="text-center text-sand/85 link-underline">Direkt online buchen</a>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="px-[var(--spacing-gutter)] pb-32 pt-8 text-[0.875rem] leading-loose text-taupe-text">
      {BRAND.name} · Permanent Make-up · {BRAND.region}<br />
      <a className="link-underline" href={BRAND.impressum}>Impressum</a> · <a className="link-underline" href={BRAND.datenschutz}>Datenschutz</a><br />
      <span className="text-[0.8125rem]">Diese Seite setzt keine Cookies und zählt nur anonym, welcher Knopf angetippt wird.</span>
    </footer>
  );
}

/* ---------- Feste Buchungsleiste (mobil) ---------- */
export function StickyBar({ visible, onBook }) {
  return (
    <div style={{ visibility: visible ? 'visible' : 'hidden', transition: visible ? 'visibility 0s' : 'visibility 0s linear .5s' }} className={`fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-line bg-sand/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur transition-transform duration-500 ${visible ? 'translate-y-0' : 'translate-y-full'}`}>
      <button onClick={() => onBook()} className="btn btn-primary flex-1 !min-h-[3.25rem]" tabIndex={visible ? 0 : -1}>Termin anfragen <Arrow /></button>
      <a href={whatsappLink('leiste')} aria-label="Frage per WhatsApp" tabIndex={visible ? 0 : -1} className="grid h-[3.25rem] w-[3.25rem] flex-none place-items-center rounded-full border border-line">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.7 14.9L2 22l5.3-1.4A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3z" /></svg>
      </a>
    </div>
  );
}
