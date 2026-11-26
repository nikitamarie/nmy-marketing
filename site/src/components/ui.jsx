// Kleine Bausteine: Bild mit Platzhalter, Pfeil, Karussell-Punkte.
import { useEffect, useState } from 'react';
import { IMAGES } from '../content/images.js';
import { PREVIEW } from '../lib.js';

/** Bild aus der zentralen Bildliste. Ohne Datei: beschrifteter Platzhalter (nur Vorschau), live ausgeblendet. */
export function Img({ slot, image, className = '', imgClass = '', eager = false, ratio = '4 / 5', bw = false }) {
  const im = image || IMAGES[slot];
  if (!im?.src) {
    if (!PREVIEW) return null;
    return (
      <div className={`grid place-items-center bg-stone text-center ${className}`} style={{ aspectRatio: ratio }}>
        <span className="px-6 text-[0.8125rem] leading-snug"><b className="label mb-1 block font-bold">{slot}</b>{im?.alt || 'Bild folgt'}</span>
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden bg-stone ${className}`} style={{ aspectRatio: ratio }}>
      {/* Pflicht-Kennzeichnung für KI-erzeugte Bilder echter Personen (EU-KI-Verordnung Art. 50) – dezent, aber sichtbar */}
      {im.ai && <span className="absolute right-2 top-2 z-10 rounded-full bg-black/35 px-2 py-0.5 text-[0.625rem] uppercase tracking-[.06em] text-white/90">KI-Bild</span>}
      <img src={im.src} alt={im.alt || ''} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} decoding="async"
        className={`h-full w-full object-cover ${bw ? 'bw' : ''} ${imgClass}`} style={{ objectPosition: im.pos || '50% 50%' }} />
    </div>
  );
}

export const Arrow = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-4 w-4 flex-none ${className}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

/** Punkte unter einem waagerechten Karussell (Rhode) – folgen dem Wischen */
export function Dots({ target, count }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const el = document.getElementById(target); if (!el) return;
    const on = () => { const w = el.firstElementChild?.offsetWidth || 1; setI(Math.min(count - 1, Math.round(el.scrollLeft / (w + 12)))); };
    el.addEventListener('scroll', on, { passive: true }); return () => el.removeEventListener('scroll', on);
  }, [target, count]);
  return <div className="mt-4 flex justify-center gap-1.5" aria-hidden="true">{Array.from({ length: count }, (_, k) => <span key={k} className={`h-1.5 rounded-full transition-all duration-300 ${k === i ? 'w-5 bg-ink' : 'w-1.5 bg-line'}`} />)}</div>;
}
