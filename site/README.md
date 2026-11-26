# NMY Cosmetics – Website & Link-in-Bio

Mobile-first Buchungsseite für Instagram (Rhode-inspiriert): **Vertrauen zuerst, dann die Behandlung, dann der Termin.**
Vorschau: `https://nmy-marketing.nmy-cosmetics.workers.dev/b/neu` (noch nicht live, Klicks werden dort nicht gezählt).

## Aufbau
| Abschnitt | Ziel |
|---|---|
| Link-Hub (erster Bildschirm) | Wer, was, wo + 5 priorisierte Knöpfe (Anfrage, Behandlungen, Ergebnisse, Fragen, WhatsApp) |
| Kennst du das? | Schmerzpunkt + größte Sorge („künstlich“) und Antwort darauf |
| Sieh selbst + So heilt es | Beweis (echte Ergebnisse) + ehrliche Erwartungen (Heilungsverlauf) |
| Behandlungen | Für wen, Ergebnis, Dauer, Haltbarkeit, Nachtermin, Knopf „… anfragen“ |
| In ihren Worten | Kundenstimmen (Google-Bewertungen aus der NMY-App ersetzen sie automatisch) |
| Die Person hinter NMY | Name, Arbeitsweise, 4 Versprechen (Sicherheit) |
| Gut zu wissen | Einwände: künstlich, Schmerz, Haltbarkeit, Vorbereitung, Heilung, Eignung |
| Abschluss | Online buchen oder Beratung per WhatsApp |
| Feste Leiste unten | Termin anfragen + WhatsApp, sobald der Hauptknopf aus dem Bild ist |

**Buchen:** Alle Termin-Knöpfe führen direkt zur Online-Buchung (Treatwell), „Beratung“ öffnet WhatsApp mit vorbereiteter Nachricht.
Datenschutz: Die Seite speichert keine Kundendaten und setzt keine Cookies. Es wird nur anonym gezählt, welcher Knopf angetippt wurde.

## Dateien
- `src/styles/tokens.css` – **alle Design-Werte** (Farben, Schriften, Größen, Abstände, Radien, Schatten). Änderungen aus Figma hier eintragen.
- `src/content/site.js` – **alle Texte** und Einstellungen (Buchungslink, WhatsApp, Preise an/aus, ehrlicher Kapazitäts-Hinweis). Stellen mit `BITTE PRÜFEN` vor dem Livegang bestätigen.
- `src/content/images.js` – **alle Bildplätze** mit Beschreibung, was hinein soll.
- `src/components/` – Abschnitte (`sections.jsx`), Bausteine (`ui.jsx`).
- `src/App.jsx` – Zusammensetzen + Bewegung (Lenis, GSAP ScrollTrigger; „Bewegung reduzieren“ wird respektiert).

## Eigene Bilder einsetzen
1. Bild als `.jpg`/`.webp`, hochkant 4:5, mind. 1200 px breit, nach `public/images/` legen.
2. In `src/content/images.js` beim passenden Platz `src: '/images/dein-bild.jpg'` eintragen (oder ein Bild aus der NMY-App: `src: '/b/bild/<ID>'`).
3. `src: null` = in der Vorschau beschrifteter Platzhalter, live wird der Platz ausgeblendet.
Kundinnen-Fotos nur mit schriftlicher Einwilligung für die Website.

## Buchungstool anbinden
In `src/content/site.js` → `BOOKING.bookingUrl` den Link tauschen (Treatwell, Calendly, Acuity …). WhatsApp-Nummer: `BOOKING.whatsapp`.

## Bauen & veröffentlichen
```
cd site && npm run build && cp dist/index.html ../app/src/gen/site.html
cd ../app && npx wrangler deploy
```
Die App liefert die Seite unter `/b/neu` aus. Livegang (Austausch von `/b`) erst nach Freigabe.
