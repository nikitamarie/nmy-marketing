// Seite zusammensetzen + Bewegung: Lenis (weiches Scrollen) und GSAP/ScrollTrigger (Kamerafahrten, Einblenden).
// Bei „Bewegung reduzieren“ (Systemeinstellung) wird alles sofort im Endzustand gezeigt.
import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Hub, Treatments, Results, Pains, Voices, About, Faq, Final, Footer, StickyBar } from './components/sections.jsx';
import { REVIEWS } from './content/site.js';
import { loadLiveData, PREVIEW, bookingLink, whatsappLink } from './lib.js';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function App() {
  const root = useRef(null);
  const lenis = useRef(null);
  const [bar, setBar] = useState(false);
  const [live, setLive] = useState({ reviews: REVIEWS, rating: null });

  // Google-Bewertungen aus der NMY-App (falls eingetragen)
  useEffect(() => {
    loadLiveData().then(d => {
      const g = d.google || {};
      const list = (g.reviews || []).filter(r => r?.text).slice(0, 6);
      const value = parseFloat(String(g.rating || '').replace(',', '.'));
      if (list.length && value) setLive({ reviews: list.map(r => ({ text: r.text, who: r.name || 'Google-Bewertung', src: 'Google' })), rating: { value: value.toLocaleString('de-DE', { minimumFractionDigits: 1 }), count: g.count || list.length } });
    });
  }, []);

  // Weiches Scrollen, an GSAP gekoppelt
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const l = new Lenis({ lerp: 0.085, anchors: true });
    lenis.current = l;
    l.on('scroll', ScrollTrigger.update);
    const tick = t => l.raf(t * 1000);
    gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(tick); l.destroy(); };
  }, []);

  // Buchungsleiste zeigen, sobald man etwas gescrollt hat
  useEffect(() => {
    const on = () => setBar(scrollY > 240);
    on(); addEventListener('scroll', on, { passive: true });
    return () => removeEventListener('scroll', on);
  }, []);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Kamera fährt beim Laden langsam ans Porträt heran …
      gsap.fromTo('.hero-img', { scale: 1.16 }, { scale: 1, duration: 2.4, ease: 'power2.out' });
      // … und beim Scrollen gleitet das Bild ruhig nach oben weg
      gsap.to('.hero-img', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero-frame', start: 'top top', end: 'bottom top', scrub: true } });
      // Texte blenden weich ein
      gsap.set('.reveal', { autoAlpha: 0, y: 26 });
      ScrollTrigger.batch('.reveal', { start: 'top 90%', once: true, onEnter: els => gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, overwrite: true }) });
      // Ergebnis-Bild öffnet sich beim Scrollen von gerahmt zu voller Breite
      gsap.fromTo('.zoom-frame', { clipPath: 'inset(5% 7% 5% 7% round 16px)' }, { clipPath: 'inset(0% 0% 0% 0% round 16px)', ease: 'none', scrollTrigger: { trigger: '.zoom-frame', start: 'top 85%', end: 'center 45%', scrub: 0.6 } });
      gsap.fromTo('.zoom-img', { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.zoom-frame', start: 'top 85%', end: 'bottom 30%', scrub: 0.6 } });
      // Leichte Tiefe in Behandlungs- und Porträtbildern
      gsap.utils.toArray('.parallax').forEach(f => gsap.fromTo(f.querySelector('.parallax-img'), { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } }));
      // Heilungs-Zeitstrahl zeichnet sich beim Scrollen
      gsap.fromTo('.heal-line', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.healing', start: 'top 75%', end: 'bottom 60%', scrub: true } });
    });
  }, { scope: root });

  // Kein Formular: Buchung direkt bei Treatwell, Beratung direkt per WhatsApp
  const book = id => { location.href = id === 'beratung' ? whatsappLink('beratung', 'Hallo Nikita, ich hätte gern eine unverbindliche Beratung.') : bookingLink(id || 'cta'); };

  return (
    <div ref={root} className="mx-auto max-w-[640px] overflow-x-clip px-[var(--spacing-edge)] pt-[var(--spacing-edge)]">
      {PREVIEW && <div className="sticky top-0 z-40 -mx-[var(--spacing-edge)] -mt-[var(--spacing-edge)] mb-[var(--spacing-edge)] bg-ink-strong py-2 text-center text-[0.75rem] uppercase tracking-[.06em] text-white">Vorschau – noch nicht veröffentlicht</div>}
      <main>
        <Hub onBook={book} rating={live.rating} />
        <Treatments onBook={book} />
        <Results onBook={book} />
        <Pains />
        <Voices reviews={live.reviews} rating={live.rating} />
        <About />
        <Faq />
        <Final onBook={book} />
      </main>
      <Footer />
      <StickyBar visible={bar} onBook={book} />
    </div>
  );
}
