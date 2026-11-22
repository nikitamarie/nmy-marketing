// Marken-Wissen NMY Cosmetics – Fakten ausschließlich von nikitamarieyigitcosmetics.com / Treatwell.
// Ansprache: immer "du". Kaum Emojis. Keine Heilversprechen, keine Garantien.

export const TREATMENTS = {
  'powder-brows': {
    label: 'Powder Brows',
    group: 'pmu',
    price: { old: '350 €', new: '299 €' },
    facts: [
      { k: 'Haltbarkeit', v: '2–5 Jahre' },
      { k: 'Nachbehandlung', v: 'nach ca. 6 Wochen' },
      { k: 'Dauer', v: '1,5–2,5 Std.' },
    ],
    factNote: 'Hauttyp, Pflege und Sonne beeinflussen die Haltbarkeit – in der Beratung erkläre ich dir, was bei dir realistisch ist.',
    hooks: [
      'Natürlich statt _gemalt._',
      'Nie wieder Brauen nachzeichnen.',
      'Weich, pudrig, _passend zu dir._',
      'Sehen Powder Brows künstlich aus?',
      'Morgens fertig – _ohne Stift._',
    ],
    sub: 'Weiche, pudrige Augenbrauen – passend zu deinem Gesicht.',
    healed: 'Frisch gestochen wirkt die Farbe kräftiger – nach ca. 4 Wochen zeigt sich das **abgeheilte Ergebnis**.',
    tags: ['#powderbrows', '#ombrebrows', '#permanentmakeup', '#pmu', '#augenbrauen'],
  },
  'lip-blush': {
    label: 'Lip Blush',
    group: 'pmu',
    price: { old: '350 €', new: '299 €' },
    facts: [
      { k: 'Haltbarkeit', v: '1–3 Jahre' },
      { k: 'Nachbehandlung', v: 'nach ca. 6 Wochen' },
      { k: 'Dauer', v: 'ca. 2–2,5 Std.' },
    ],
    factNote: 'Pflege, Sonne und Stoffwechsel beeinflussen, wie lange die Farbe hält.',
    hooks: [
      'Frische Lippen – _ohne Lippenstift._',
      'Aquarell statt _Lippenstift-Look._',
      'Mehr Farbe. Klarere Kontur.',
      'Lippen, die _frisch_ wirken.',
    ],
    sub: 'Natürliche Lippenfarbe und eine harmonischere Kontur.',
    healed: 'Direkt nach der Behandlung ist die Farbe intensiver – abgeheilt wirkt sie **weich und natürlich**.',
    tags: ['#lipblush', '#aquarelllips', '#permanentmakeup', '#pmu', '#lippen'],
  },
  lashlifting: {
    label: 'Lashlifting',
    group: 'lash',
    price: { new: 'ab 44 €' },
    facts: [
      { k: 'Haltbarkeit', v: '4–6 Wochen' },
      { k: 'Dauer', v: '50–60 Min.' },
      { k: 'Optional', v: 'Färben' },
    ],
    factNote: 'Wie lange der Schwung hält, hängt von deinem Wimpernzyklus und der Pflege ab.',
    hooks: ['Offener Blick – _ohne Extensions._', 'Schwung für deine _Naturwimpern._', 'Wach aussehen, ganz natürlich.'],
    sub: 'Natürlicher Schwung für deine eigenen Wimpern.',
    healed: '',
    tags: ['#lashlifting', '#wimpernlifting', '#lashes', '#naturalbeauty'],
  },
  browlifting: {
    label: 'Browlifting',
    group: 'lash',
    price: { new: 'ab 37,50 €' },
    facts: [{ k: 'Dauer', v: '50–60 Min.' }],
    factNote: '',
    hooks: ['Gepflegte Brauen – _ganz ohne Nadel._', 'Form und Fülle für deine Brauen.'],
    sub: 'Geordnete, gepflegte Brauen.',
    healed: '',
    tags: ['#browlifting', '#augenbrauen', '#browlift'],
  },
  microneedling: {
    label: 'Microneedling',
    group: 'skin',
    price: { old: '100 €', new: '90 €' },
    facts: [
      { k: 'Dauer', v: 'ca. 60 Min.' },
      { k: 'Empfohlen', v: '3–4 Sitzungen' },
      { k: 'Abstand', v: 'je 4 Wochen' },
    ],
    factNote: 'Wichtig: realistische Erwartungen, saubere Hygiene und passende Nachpflege.',
    hooks: ['Für einen _frischeren_ Teint.', 'Haut, die gleichmäßiger wirkt.'],
    sub: 'Kosmetische Behandlung für ein frischeres Hautbild.',
    healed: '',
    tags: ['#microneedling', '#skincare', '#gesichtsbehandlung'],
  },
};

export const LOCAL_TAGS = ['#seevetal', '#harburg', '#hamburgbeauty', '#pmuhamburg', '#landkreisharburg'];

// Wiederkehrende Elemente aus Website und Kundenstimmen
export const PROCESS = [
  { title: 'Beratung', text: 'Zielbild, Form, Farbe und Intensität – ehrlich und ohne Druck.' },
  { title: 'Vorzeichnung', text: 'Wir starten erst, wenn du sagst: „Ja, genau so.“' },
  { title: 'Behandlung & Nachpflege', text: 'In ruhiger Atmosphäre – plus klare Pflegeanleitung.' },
];

export const WHY = [
  { title: 'Natürlich statt „gemalt“', text: 'Form und Farbe passend zu deinem Gesicht.' },
  { title: 'Präzise Vorzeichnung', text: 'Wir starten erst, wenn du dich wirklich wohlfühlst.' },
  { title: 'Hohe Hygiene', text: 'Einweg-Nadelmodule, frisch geöffnet – nur für dich.' },
];

export const REVIEWS = [
  'Ich bin mehr als zufrieden mit meinen Augenbrauen. Ich wurde super beraten und habe mich sehr wohl gefühlt.',
  'Nach 4 Jahren habe ich endlich jemanden gefunden, der mein Permanent Make-up an den Augenbrauen neu sticht.',
  'Sehr gute Arbeit, faires Preis-/Leistungsverhältnis. Ich bin absolut zufrieden.',
];

// Stories ohne Kundinnen-Material (laufen automatisch, wenn kein neues Material da ist)
export const EVERGREEN_STORIES = [
  { label: 'Powder Brows', headline: 'Natürlich statt _gemalt._', body: 'Weiche, pudrige Augenbrauen –\nohne morgens nachzuzeichnen.' },
  { label: 'Mythos oder Fakt', headline: 'Powder Brows sehen künstlich aus?', body: '**Mythos.** Mit präziser Vorzeichnung und passender Farbe wirken sie weich und typgerecht.' },
  { label: 'Gut zu wissen', headline: 'Warum sind die Brauen anfangs _dunkler?_', body: 'Frisch gestochen wirkt die Farbe kräftiger.\nNach ca. 4 Wochen zeigt sich das abgeheilte Ergebnis.' },
  { label: 'Hygiene', headline: 'Nur für _dich_ geöffnet.', body: 'Einweg-Nadelmodule, Einweg-Pigmentcups,\nHandschuhe und Mundschutz – bei jeder Behandlung.' },
  { label: 'Lip Blush', headline: 'Frische Farbe. _Jeden Tag._', body: 'Lip Blush gleicht blasse Bereiche aus –\nohne Lippenstift-Look.' },
  { label: 'Kundenstimme', headline: '„Wenn, dann nur _Nikita!_“', body: 'Danke für euer Vertrauen.\nIch nehme mir Zeit für jede Beratung.' },
  { label: 'Korrektur', headline: 'Altes PMU _verblasst?_', body: 'Ich frische auch bestehendes Permanent Make-up auf – nach ehrlicher Beratung.' },
  { label: 'Ablauf', headline: 'Wir starten erst, wenn du sagst: _„Ja, genau so.“_', body: 'Beratung, Vorzeichnung, Behandlung – in Ruhe und ohne Druck.' },
  { label: 'Lashlifting', headline: 'Offener Blick – _ohne Extensions._', body: 'Natürlicher Schwung für deine Naturwimpern.\nHält ca. 4–6 Wochen.' },
  { label: 'Seevetal', headline: 'Ruhig. Sauber. _Persönlich._', body: 'Mein Studio in Seevetal – gut erreichbar aus Harburg und dem Umland.' },
];

// Feed-Karussells ohne Kundinnen-Material (Wissen / Vertrauen / Angebot)
export const EVERGREEN_CAROUSELS = [
  {
    topic: 'wissen', treatment: 'powder-brows', label: 'Powder Brows',
    slides: [
      { type: 'cover', headline: 'Sehen Powder Brows künstlich aus?' },
      { type: 'text', headline: 'Nicht, wenn Form und Farbe zu dir passen.', body: 'Ziel ist ein weicher, typgerechter Look –\n**keine blockartigen „Instagram-Brauen“.**' },
      { type: 'list', headline: 'Darauf kommt es an', items: [
        { title: 'Präzise Vorzeichnung', text: 'Wir starten erst, wenn du sagst: „Ja, genau so.“' },
        { title: 'Die passende Pigmentfarbe', text: 'Abgestimmt auf deinen Hautton und deine Haarfarbe.' },
        { title: 'Weiche Schattierung', text: 'In mehreren Durchgängen aufgebaut – statt einer harten Linie.' },
      ] },
      { type: 'facts', from: 'treatment' },
      { type: 'cta', from: 'treatment' },
    ],
  },
  {
    topic: 'wissen', treatment: 'powder-brows', label: 'Powder Brows vs. Microblading',
    slides: [
      { type: 'cover', headline: 'Powder Brows oder _Microblading?_' },
      { type: 'list', headline: 'Der Unterschied', items: [
        { title: 'Technik', text: 'Microblading arbeitet mit manuellen Schnitten, Powder Brows werden maschinell schattiert.' },
        { title: 'Look', text: 'Powder Brows wirken weich und pudrig – wie leicht geschminkt.' },
        { title: 'Haut', text: 'Gut geeignet auch bei fettiger, empfindlicher oder reifer Haut.' },
      ] },
      { type: 'text', headline: 'Welche Technik passt zu dir?', body: 'Das klären wir in der Beratung – **ehrlich und ohne Druck.**' },
      { type: 'cta', from: 'treatment' },
    ],
  },
  {
    topic: 'vertrauen', treatment: 'powder-brows', label: 'NMY Cosmetics',
    slides: [
      { type: 'cover', headline: 'Warum _NMY Cosmetics?_' },
      { type: 'list', headline: 'Was mir wichtig ist', items: 'WHY' },
      { type: 'text', headline: 'Ruhige Atmosphäre.', body: 'Kein Stress, kein Durchlaufgefühl –\nich nehme mir **Zeit für dich.**' },
      { type: 'cta', from: 'treatment' },
    ],
  },
  {
    topic: 'heilung', treatment: 'powder-brows', label: 'Nachsorge',
    slides: [
      { type: 'cover', headline: 'So heilen deine Brauen _schön._' },
      { type: 'list', headline: 'Die ersten Tage', items: [
        { title: 'Kruste nicht entfernen', text: 'Eine leichte Kruste ist normal – sie löst sich von selbst.' },
        { title: 'Keine Sonne, Sauna, Solarium', text: 'Auch starkes Schwitzen in der Heilungsphase vermeiden.' },
        { title: 'Keine aggressiven Produkte', text: 'Retinol, Säuren und Peelings rund um die Brauen pausieren.' },
      ] },
      { type: 'text', headline: 'Nach 7–10 Tagen', body: 'ist die oberflächliche Heilung abgeschlossen.\nDas **endgültige Ergebnis** zeigt sich nach ca. 4 Wochen.' },
      { type: 'cta', from: 'treatment' },
    ],
  },
  {
    topic: 'angebot', treatment: 'lip-blush', label: 'Lip Blush',
    slides: [
      { type: 'cover', headline: 'Frische Lippen – _ohne Lippenstift._' },
      { type: 'list', headline: 'Für wen ist Lip Blush?', items: [
        { title: 'Blasse Lippen', text: 'Wenn deine Lippen sehr blass wirken.' },
        { title: 'Ungleichmäßige Farbe', text: 'Blasse Bereiche werden sanft ausgeglichen.' },
        { title: 'Verwischte Kontur', text: 'Die Kontur wirkt klarer – ohne harte Kante.' },
      ] },
      { type: 'facts', from: 'treatment' },
      { type: 'cta', from: 'treatment' },
    ],
  },
];

export const CTA_TEXT = 'Termin online buchen – Link in der Bio. Fragen vorab? Schreib mir gern per WhatsApp.';

export function hashtags(treatment) {
  const t = TREATMENTS[treatment]?.tags || ['#permanentmakeup', '#pmu'];
  return [...t.slice(0, 4), ...LOCAL_TAGS.slice(0, 4)].join(' ');
}

// Fallback-Captions ohne KI (werden durch Gemini ersetzt, sobald ein Schlüssel hinterlegt ist)
export function fallbackCaption({ topic, treatment, hook }) {
  const t = TREATMENTS[treatment] || TREATMENTS['powder-brows'];
  const clean = (hook || t.hooks[0]).replace(/_/g, '');
  const bodies = {
    ergebnis: `${t.sub} Jede Form wird vorab gemeinsam vorgezeichnet – wir starten erst, wenn du dich wirklich wohlfühlst.`,
    wissen: `Swipe für die wichtigsten Punkte. Speichere dir den Beitrag für später.`,
    vertrauen: `Natürliche Ergebnisse, saubere Arbeit und hohe Hygienestandards – ohne Einheitslook.`,
    heilung: `So unterstützt du deine Heilung in den ersten Tagen. Speichern für später.`,
    angebot: `${t.label} in meinem Studio in Seevetal – aktuell für ${t.price.new}${t.price.old ? ` statt ${t.price.old}` : ''}.`,
  };
  return `${clean}\n\n${bodies[topic] || bodies.ergebnis}\n\n${CTA_TEXT}\n\n${hashtags(treatment)}`;
}

export const CAPTION_RULES = `Du schreibst Instagram-Texte für NMY Cosmetics (Nikita, zertifizierte Permanent-Make-up-Artistin, Homestudio in Seevetal bei Hamburg-Harburg).
Regeln:
- Immer "du"-Ansprache, warm, ruhig, hochwertig, ehrlich. Höchstens 1 Emoji, lieber keins.
- Positionierung: natürlich statt gemalt, präzise Vorzeichnung, hohe Hygiene, ruhige Atmosphäre, Beratung ohne Druck.
- Keine Heilversprechen, keine Garantien, keine medizinischen Begriffe, keine Übertreibungen ("perfekt", "für immer").
- Ergebnisse nie beschönigen; frisch gestochenes PMU ist dunkler als abgeheilt.
- Nur diese Fakten verwenden: {FACTS}
- Struktur: 1 Hook-Zeile, Leerzeile, 2–3 kurze Sätze Mehrwert, Leerzeile, Call-to-Action "Termin online buchen – Link in der Bio" (optional WhatsApp für Fragen), Leerzeile, Hashtags.
- Länge: 300–600 Zeichen ohne Hashtags.`;

// Veröffentlichungs-Rhythmus (Ortszeit Europe/Berlin). Wochentag: 0=So … 6=Sa
export const FEED_SLOTS = [
  { dow: 1, time: '19:00' },
  { dow: 3, time: '19:00' },
  { dow: 5, time: '18:30' },
];
export const STORY_TIMES = ['09:30', '19:30'];
