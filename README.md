# NMY Cosmetics – Marketing-App

Automatisierte Marketing-Abteilung für @nmy_cosmetics (Permanent Make-up, Seevetal).

## Bausteine

### 1. Brand-Renderer (`renderer/`)
Erzeugt Karussells (1080×1350) und Stories (1080×1920) im NMY-Stil als PNG – mit Original-Logo und lokal eingebetteten Schriften (Playfair Display, Montserrat).

```bash
node renderer/render.js content/beispiel-edition-powder-brows.json
```

- Themes: `classic` (bisheriger Instagram-Look), `edition` (reduzierter Editorial-Look mit feinem Rahmen)
- Folientypen: `cover`, `text`, `list`, `facts`, `cta` (optional mit Preis), `story`, `beforeafter`, `photo`
- Text: `**fett**`, `_kursiv_` (Akzentwort), Zeilenumbruch mit `\n`
- Ansprache: immer **du**, kaum Emojis

### 2. Lichtkorrektur (`photo/lichtkorrektur.py`)
Bringt jedes Foto von der Liege auf denselben Look: Weißabgleich, einheitliche Helligkeit, sanfter Kontrast, warmer Brand-Ton, Zuschnitt 4:5 / 9:16, Metadaten (GPS) entfernt.
Bewusst **keine** Retusche des Ergebnisses (UWG: keine irreführende Werbung).

```bash
python3 photo/lichtkorrektur.py foto.jpg foto-feed.jpg --format post
```

## Datenschutz
Kundinnenfotos und Renderings werden nie ins Repository eingecheckt (`.gitignore`) und nie an KI-Dienste übermittelt.
