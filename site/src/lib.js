// Hilfsfunktionen: Links (mit anonymer Klickzählung der NMY-App), Vorschau-Modus, Live-Daten aus der App.
import { BOOKING } from './content/site.js';

// Vorschau = alles außer der Live-Adresse /b → dort keine Klicks zählen, Platzhalter zeigen
export const PREVIEW = !/^\/b\/?$/.test(location.pathname);

const waDirect = msg => `https://wa.me/${BOOKING.whatsapp}?text=${encodeURIComponent(msg)}`;
const ref = () => new URLSearchParams(location.search).get('ref') || 'bio';

/** Link zur Online-Buchung (Treatwell o. ä.) */
export const bookingLink = where => PREVIEW ? BOOKING.bookingUrl : `/b/go/treatwell?ref=${encodeURIComponent(ref() + '-' + where)}`;

/** WhatsApp-Link mit vorbereiteter Nachricht */
export const whatsappLink = (where, msg = 'Hallo Nikita, ich habe eine Frage zu einer Behandlung:') =>
  PREVIEW ? waDirect(msg) : `/b/go/whatsapp?ref=${encodeURIComponent(ref() + '-' + where)}&msg=${encodeURIComponent(msg)}`;

/** Live-Daten aus der NMY-App (Google-Bewertungen) – ohne Daten bleibt der Standardinhalt */
export async function loadLiveData() {
  try { const r = await fetch('/b/daten', { cache: 'no-store' }); return r.ok ? await r.json() : {}; } catch { return {}; }
}
