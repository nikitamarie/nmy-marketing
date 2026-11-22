# NMY Cosmetics – Marketing-App

Automatisierte Marketing-Abteilung für @nmy_cosmetics (Permanent Make-up, Seevetal).

## Baustein 1: Brand-Renderer
Erzeugt Karussells (1080×1350) und Stories (1080×1920) im NMY-Stil als PNG.

```bash
node renderer/render.js content/beispiel-powder-brows-kuenstlich.json
```

Folientypen: `cover`, `text`, `list`, `facts`, `cta`, `story`. `**fett**` und Zeilenumbrüche im Text erlaubt.
