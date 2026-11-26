// Kleine Bausteine: Bild mit Platzhalter, Überschriften, Pfeil.
import { IMAGES } from '../content/images.js';
import { PREVIEW } from '../lib.js';

/** Bild aus der zentralen Bildliste. Ohne Datei: beschrifteter Platzhalter (nur Vorschau), live ausgeblendet. */
export function Img({ slot, image, className = '', imgClass = '', eager = false, ratio = '4 / 5' }) {
  const im = image || IMAGES[slot];
  if (!im?.src) {
    if (!PREVIEW) return null;
    return (
      <div className={`grid place-items-center bg-stone text-center ${className}`} style={{ aspectRatio: ratio }}>
        <span className="px-6 text-sm text-taupe-text"><b className="block font-semibold tracking-[.12em] uppercase text-xs text-mocca">{slot}</b>{im?.alt || 'Bild folgt'}</span>
      </div>
    );
  }
  return (
    <div className={`overflow-hidden bg-stone ${className}`} style={{ aspectRatio: ratio }}>
      <img src={im.src} alt={im.alt || ''} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} decoding="async"
        className={`h-full w-full object-cover ${imgClass}`} style={{ objectPosition: im.pos || '50% 50%' }} />
    </div>
  );
}

/** Zweizeilige Überschrift, zweite Zeile kursiv */
export const Title = ({ as: Tag = 'h2', lines, className = '' }) => (
  <Tag className={`${Tag === 'h1' ? 'h1' : 'h2'} ${className}`}>{lines[0]}{lines[1] && <><br /><em>{lines[1]}</em></>}</Tag>
);

export const Arrow = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-5 w-5 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

export const Eyebrow = ({ children, className = '' }) => <p className={`eyebrow reveal ${className}`}>{children}</p>;
