// Seite zusammensetzen + Bewegung: Lenis (weiches Scrollen) und GSAP/ScrollTrigger (Kamerafahrten, Einblenden).
// Bei „Bewegung reduzieren“ (Systemeinstellung) wird alles sofort im Endzustand gezeigt.
import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Hub, Pains, Results, Treatments, Voices, About, Faq, Final, Footer, StickyBar } from './components/sections.jsx';
import BookingSheet from './components/BookingSheet.jsx';
import { REVIEWS } from './content/site.js';
import { loadLiveData, PREVIEW } from './lib.js';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function App() {
  const root = useRef(null);
  const lenis = useRef(null);
  const [sheet, setSheet] = useState({ open: false, preset: null });
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

  // Sheet offen → Seite anhalten
  useEffect(() => { sheet.open ? lenis.current?.stop() : lenis.current?.start(); }, [sheet.open]);

  // Buchungsleiste zeigen, sobald der Hauptknopf nicht mehr sichtbar ist
  useEffect(() => {
    const el = document.getElementById('hero-cta'); if (!el) return;
    const io = new IntersectionObserver(([e]) => setBar(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el); return () => io.disconnect();
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
      gsap.fromTo('.zoom-frame', { clipPath: 'inset(6% 9% 6% 9% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: '.zoom-frame', start: 'top 85%', end: 'center 45%', scrub: 0.6 } });
      gsap.fromTo('.zoom-img', { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.zoom-frame', start: 'top 85%', end: 'bottom 30%', scrub: 0.6 } });
      // Leichte Tiefe in Behandlungs- und Porträtbildern
      gsap.utils.toArray('.parallax').forEach(f => gsap.fromTo(f.querySelector('.parallax-img'), { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } }));
      // Heilungs-Zeitstrahl zeichnet sich beim Scrollen
      gsap.fromTo('.heal-line', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.healing', start: 'top 75%', end: 'bottom 60%', scrub: true } });
    });
  }, { scope: root });

  const book = preset => setSheet({ open: true, preset: preset || null });

  return (
    <div ref={root} className="mx-auto max-w-[640px] overflow-x-clip">
      {PREVIEW && <div className="sticky top-0 z-40 bg-espresso py-2 text-center text-[0.8125rem] text-sand">Vorschau – noch nicht veröffentlicht</div>}
      <main>
        <Hub onBook={book} rating={live.rating} />
        <Pains />
        <Results onBook={book} />
        <Treatments onBook={book} />
        <Voices reviews={live.reviews} rating={live.rating} />
        <About />
        <Faq />
        <Final onBook={book} />
      </main>
      <Footer />
      <StickyBar visible={bar && !sheet.open} onBook={book} />
      <BookingSheet open={sheet.open} preset={sheet.preset} onClose={() => setSheet(s => ({ ...s, open: false }))} />
    </div>
  );
}
