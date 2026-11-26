/*
 * BILDER – zentrale Liste aller Bildplätze der Seite.
 *
 * So setzt du eigene Bilder ein (aus Figma, Shooting oder der NMY-App):
 *   a) Datei nach  site/public/images/  legen und  src: '/images/dateiname.jpg'  eintragen, ODER
 *   b) ein Bild, das schon in der NMY-App liegt, über  src: '/b/bild/<ID>'  einbinden.
 * Steht  src: null, zeigt die Vorschau einen beschrifteten Platzhalter; auf der Live-Seite
 * wird der Platz dann ausgeblendet.
 *
 * Licht & Farbe: Porträts, Studio und Brauen sind einheitlich angeglichen (h_…). Lippen-Ergebnisse bewusst
 * unverändert im Original – die echte, kräftige Farbe ist das Ergebnis und wird nicht verändert.
 *
 * Bildsprache (Rhode-Setting für PMU): Tageslicht, ruhige Räume, Leinen/Keramik/Naturstein,
 * sanfte Hauttextur, natürliche Ergebnisse – kein Filter, kein „Plastik“-Look.
 * Kundinnen-Fotos nur mit schriftlicher Einwilligung für die Website.
 * KI-Bilder: bei Porträts, die mit KI erstellt wurden,  ai: true  setzen → kleines „KI-Bild“-Label (Pflicht).
 * Ergebnis- und Kundinnenfotos niemals mit KI erzeugen.
 * Format-Tipp: 4:5 hochkant, mind. 1200 px breit, als .jpg (oder .webp).
 */
export const IMAGES = {
  // HERO_PORTRAIT: Porträt von Nikita in hellem Tageslicht-Setting, ruhiger, nahbarer Blick in die Kamera.
  HERO_PORTRAIT: { src: '/b/bild/ki_start2', alt: 'Nikita, Permanent-Make-up-Artistin', pos: '58% 25%', ai: true }, // KI-Bild (Weave, Nano Banana 2.1, aus echten Fotos) – Original: '/b/bild/h_b_hero'

  // ABOUT_PORTRAIT: Zweites Porträt, gern ganzkörper oder bei der Arbeit (Vorzeichnung, Pigmente mischen).
  ABOUT_PORTRAIT: { src: '/b/bild/h_b_about', alt: 'Nikita im Studio', pos: '50% 30%' },

  // STUDIO_AMBIENCE: Sauberes, ruhiges Behandlungszimmer – Liege, Tageslicht, Einweg-Material sichtbar (Hygiene-Vertrauen).
  STUDIO_AMBIENCE: { src: '/b/bild/h_m_dcb545dd1aab4065', alt: 'Arbeitsplatz im Homestudio', pos: '50% 50%' },

  // TREATMENT_BROWS: Nahaufnahme Powder Brows bei Tageslicht (ideal: abgeheilt, ca. 4–6 Wochen nach der Behandlung).
  TREATMENT_BROWS: { src: '/b/bild/h_b_brow1', alt: 'Powder Brows – Ergebnis', pos: '50% 40%' },

  // TREATMENT_LIPS: Nahaufnahme Lip Blush bei Tageslicht, natürliche Farbe, entspannte Lippen.
  TREATMENT_LIPS: { src: '/b/bild/b_lip5', alt: 'Lip Blush – Ergebnis', pos: '50% 50%' },

  // TREATMENT_EYES: Lashlifting – Nahaufnahme offener Blick, Naturwimpern mit Schwung.
  TREATMENT_EYES: { src: null, alt: 'Lashlifting – Ergebnis', pos: '50% 50%' },

  // TREATMENT_BROWLIFT: Browlifting – geordnete, fluffige Naturbrauen (Nahaufnahme, Tageslicht).
  TREATMENT_BROWLIFT: { src: null, alt: 'Browlifting – Ergebnis', pos: '50% 50%' },

  // TREATMENT_SKIN: Microneedling – ruhige Hautnahaufnahme oder Behandlungssituation (ohne Rötungen im Fokus).
  TREATMENT_SKIN: { src: null, alt: 'Microneedling – Behandlung', pos: '50% 50%' },

  // HEALED_BROWS / HEALED_LIPS: Gleiche Kundin, abgeheilt (nach ca. 4–6 Wochen) – stärkster Vertrauensbeweis.
  HEALED_BROWS: { src: null, alt: 'Powder Brows – abgeheilt', pos: '50% 40%' },
  HEALED_LIPS: { src: null, alt: 'Lip Blush – abgeheilt', pos: '50% 50%' },
};

/*
 * ERGEBNIS-GALERIE: echte Ergebnisse (Kundinnen mit Einwilligung).
 * label = Behandlung, stage = ehrliche Angabe, wann fotografiert ('Direkt danach' | 'Abgeheilt').
 */
export const RESULTS = [
  { src: '/b/bild/b_lip1', label: 'Lip Blush', stage: 'Direkt danach' },
  { src: '/b/bild/h_b_brow1', label: 'Powder Brows', stage: 'Direkt danach' },
  { src: '/b/bild/b_lip5', label: 'Lip Blush', stage: 'Direkt danach' },
  { src: '/b/bild/b_lip3', label: 'Lip Blush', stage: 'Direkt danach' },
  { src: '/b/bild/b_lip4', label: 'Lip Blush', stage: 'Direkt danach' },
  { src: '/b/bild/b_lip2', label: 'Lip Blush', stage: 'Direkt danach' },
];
