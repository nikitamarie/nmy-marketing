# NMY Cosmetics – Marketing-App

Automatisierte Marketing-Abteilung für @nmy_cosmetics (Permanent Make-up, Seevetal) – kostenlos auf Cloudflare.

## Was die App macht
- **Hochladen** (Handy): Vorher / Direkt danach / Abgeheilt / Video. Licht wird schon auf dem Handy vereinheitlicht (`app/public/photo.js`), GPS-Daten entfernt. Ohne Einwilligung der Kundin kein Upload.
- **Automatisch erstellen**: Karussell (Foto-Cover, Vorher/Nachher, Ablauf, Fakten, Preis), Story und Reel im Edition-Stil; Captions per Gemini (Fallback: Textbausteine).
- **Planen**: Feed Mo/Mi/Fr abends, Stories täglich 9:30/19:30. Freie Plätze werden täglich mit Wissens-Karussells und Evergreen-Stories gefüllt.
- **Veröffentlichen**: Instagram API (mit Instagram-Login), alle 15 Minuten per Cron. Benachrichtigung per E-Mail, sobald etwas online ist.
- **Buchungen**: Treatwell-Mails werden über ein Google-Apps-Script im eigenen Gmail erkannt; WhatsApp-Buchungen per Knopfdruck. Link-in-Bio-Seite `/b` zählt Buchungs-Klicks.
- **Analyse**: Buchungen vs. Startwert, Klicks, Beiträge mit Buchungen in 72 h, Top-Beiträge, beste Zeiten, KI-Analyse (sonntags) und Trend-Radar (montags).

## Aufbau
| Ordner | Inhalt |
|---|---|
| `app/src` | Cloudflare Worker (API, Planer, Rendern mit Browser Rendering, Instagram, Analyse) |
| `app/public` | Handy-App (PWA) |
| `app/migrations` | D1-Datenbankschema |
| `shared/` | Folien-Vorlagen + Brand-Assets (gemeinsam für App und lokalen Renderer) |
| `renderer/`, `photo/` | lokale Werkzeuge (PNG-Render, Lichtkorrektur in Python) |

## Lokal testen
```bash
cd app && npm install
printf 'SESSION_SECRET=dev\nAPP_PASSWORD=testpasswort1\n' > .dev.vars
npx wrangler d1 migrations apply nmy-marketing --local
npm run dev
```

## Installieren / aktualisieren
```bash
CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... scripts/deploy.sh
```

## Datenschutz
Kundinnenfotos liegen nur im privaten R2-Speicher, werden nie ins Repository eingecheckt und nie an KI-Dienste geschickt. Instagram erhält sie nur über zeitlich begrenzte, signierte Links. Ein Set kann jederzeit vollständig gelöscht werden.

## Rechtliche Absicherung (Priorität 1)
- **KI-Kennzeichnung:** Wurde KI für Text (Gemini) oder Bild (KI-gestützte Hautglättung) genutzt, wird der Beitrag mit `is_ai_generated` veröffentlicht (Instagram-Haken „Mit KI erstellt“ / Label „KI-Info“, bei Karussells am Karussell-Container). Keine zusätzlichen Hinweise in der Caption.
- **Retusche:** Die behandelte Zone wird technisch nie geglättet, bei Microneedling gar nicht; Vorher/Nachher identisch bearbeitet.
- **Musik:** Die App fügt nie Musik hinzu. Videos können nur hochgeladen werden, wenn bestätigt ist, dass keine fremde Musik im Hintergrund läuft.
- **Texte:** Nur belegte Fakten; Filter gegen Heilversprechen, Garantien, Schmerzangaben, erfundene Terminknappheit.
- **Einwilligung:** Kundinnenfotos nur mit bestätigter schriftlicher Einwilligung; Sets jederzeit vollständig löschbar.
- **Bio-Seite:** Impressum/Datenschutz verlinkt, Klickzählung ohne Cookies und ohne IP.

## Musik
`scripts/musik.py` komponiert eigene, lizenzfreie Hintergrundmusik (keine fremden Samples) → `assets/musik/*.m4a`, abgelegt im R2-Speicher unter `musik/`. Beim Video-Upload wird der Originalton immer entfernt und optional einer dieser Titel unterlegt (ein-/ausgeblendet).
