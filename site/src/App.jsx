// Start-Gerüst: weiches Scrollen (Lenis) + Scroll-Animationen (GSAP/ScrollTrigger) + optionale 3D-Szene.
import { lazy, Suspense, useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const Scene = lazy(() => import('./Scene.jsx')); // three.js nur laden, wenn gebraucht

export default function App() {
  const root = useRef(null);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = t => lenis.raf(t * 1000);
    gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(tick); lenis.destroy(); };
  }, []);
  useGSAP(() => {
    gsap.from('.reveal', { y: 40, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12 });
    gsap.to('.hero-media', { scale: 1.12, yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }, { scope: root });
  return (
    <main ref={root}>
      <section className="hero relative h-[100svh] overflow-hidden">
        <div className="hero-media absolute inset-0"><Suspense fallback={null}><Scene /></Suspense></div>
        <div className="relative z-10 flex h-full flex-col justify-end p-6 pb-16">
          <p className="reveal text-xs font-semibold uppercase tracking-[.14em] text-brown">Permanent Make-up · Seevetal</p>
          <h1 className="reveal mt-3 font-serif text-6xl leading-none">Morgens aufwachen. <em>Fertig sein.</em></h1>
          <a className="reveal mt-8 inline-flex w-fit items-center gap-3 rounded-full bg-ink px-7 py-4 font-semibold text-bg" href="#">Freie Termine ansehen <ArrowRight size={18} /></a>
        </div>
      </section>
      <section className="h-[120svh] p-6"><p className="font-serif text-4xl">Gerüst steht – hier entstehen die Abschnitte.</p></section>
    </main>
  );
}
