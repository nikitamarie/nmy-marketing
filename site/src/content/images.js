/*
 * BILDER – zentrale Liste aller Bildplätze der Seite.
 *
 * So setzt du eigene Bilder ein (aus Figma, Shooting oder der NMY-App):
 *   a) Datei nach  site/public/images/  legen und  src: '/images/dateiname.jpg'  eintragen, ODER
 *   b) ein Bild, das schon in der NMY-App liegt, über  src: '/b/bild/<ID>'  einbinden.
 * Steht  src: null, zeigt die Vorschau einen beschrifteten Platzhalter; auf der Live-Seite
 * wird der Platz dann ausgeblendet.
 *
 * Bildsprache (Rhode-Setting für PMU): Tageslicht, ruhige Räume, Leinen/Keramik/Naturstein,
 * sanfte Hauttextur, natürliche Ergebnisse – kein Filter, kein „Plastik“-Look.
 * Kundinnen-Fotos nur mit schriftlicher Einwilligung für die Website.
 * Format-Tipp: 4:5 hochkant, mind. 1200 px breit, als .jpg (oder .webp).
 */
export const IMAGES = {
  // HERO_PORTRAIT: Porträt von Nikita in hellem Tageslicht-Setting, ruhiger, nahbarer Blick in die Kamera.
  HERO_PORTRAIT: { src: '/b/bild/b_hero', alt: 'Nikita, Permanent-Make-up-Artistin, in ihrem Homestudio', pos: '50% 22%' },

  // ABOUT_PORTRAIT: Zweites Porträt, gern ganzkörper oder bei der Arbeit (Vorzeichnung, Pigmente mischen).
  ABOUT_PORTRAIT: { src: '/b/bild/b_about', alt: 'Nikita im Studio', pos: '50% 30%' },

  // STUDIO_AMBIENCE: Sauberes, ruhiges Behandlungszimmer – Liege, Tageslicht, Einweg-Material sichtbar (Hygiene-Vertrauen).
  STUDIO_AMBIENCE: { src: '/b/bild/m_dcb545dd1aab4065', alt: 'Arbeitsplatz im Homestudio', pos: '50% 50%' },

  // TREATMENT_BROWS: Nahaufnahme Powder Brows bei Tageslicht (ideal: abgeheilt, ca. 4–6 Wochen nach der Behandlung).
  TREATMENT_BROWS: { src: '/b/bild/b_brow1', alt: 'Powder Brows – Ergebnis', pos: '50% 40%' },

  // TREATMENT_LIPS: Nahaufnahme Lip Blush bei Tageslicht, natürliche Farbe, entspannte Lippen.
  TREATMENT_LIPS: { src: '/b/bild/b_lip5', alt: 'Lip Blush – Ergebnis', pos: '50% 50%' },

  // TREATMENT_EYES: Lashlifting – Nahaufnahme offener Blick, Naturwimpern mit Schwung.
  TREATMENT_EYES: { src: null, alt: 'Lashlifting – Ergebnis', pos: '50% 50%' },

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
  { src: '/b/bild/b_brow1', label: 'Powder Brows', stage: 'Direkt danach' },
  { src: '/b/bild/b_lip5', label: 'Lip Blush', stage: 'Direkt danach' },
  { src: '/b/bild/b_lip3', label: 'Lip Blush', stage: 'Direkt danach' },
  { src: '/b/bild/b_lip4', label: 'Lip Blush', stage: 'Direkt danach' },
  { src: '/b/bild/b_lip2', label: 'Lip Blush', stage: 'Direkt danach' },
];
