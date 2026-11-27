# NMY Formulare (PDF)

- `inhalt.mjs`: alle Texte (Brauen, Lippen, Studio-Daten)
- `style.css`: Look (Archivo Black + Arimo, Steinfarben, neues Logo)
- `build.mjs`: erzeugt `pdf/*.pdf` (A4, druckfertig): `node docs/formulare/build.mjs`

In die App hochladen (erscheinen unter „Kundinnen → Formulare“, nur mit Login abrufbar):

    cd app && npx wrangler r2 object put nmy-marketing-media/formulare/<Datei>.pdf --file ../docs/formulare/pdf/<Datei>.pdf --content-type application/pdf --remote

Rechtlicher Rahmen: keine pauschalen Haftungsausschlüsse (wären nach § 309 Nr. 7 BGB unwirksam). Der Schutz entsteht durch
vollständige schriftliche Aufklärung, Freigabe der Vorzeichnung, Gesundheitsfragebogen mit Wahrheitsbestätigung,
Dokumentation von Pigment/Charge, wirksame Haftungsbegrenzung sowie getrennte Einwilligungen (Art. 9 DSGVO, Fotos, Kontakt).
Vor dem ersten Einsatz einmal von einer Anwältin / einem Anwalt prüfen lassen.
