/*
 * TEXTE & EINSTELLUNGEN – alles, was auf der Seite steht, an einem Ort.
 * Ansprache: immer „du“. Keine Heilversprechen, keine erfundenen Zahlen, keine genaue Adresse.
 * Stellen mit  // BITTE PRÜFEN  enthalten Aussagen über deinen Ablauf – kurz bestätigen oder anpassen,
 * bevor die Seite live geht.
 */

export const BRAND = {
  name: 'NMY Cosmetics',
  person: 'Nikita Marie Yigit',
  firstName: 'Nikita',
  region: 'Meckelfeld / Seevetal',
  regionLong: 'Homestudio in Meckelfeld (Seevetal) – nah an Hamburg-Harburg',
  instagram: 'https://www.instagram.com/nmy_cosmetics/',
  impressum: 'https://www.nikitamarieyigitcosmetics.com/impressum/',
  datenschutz: 'https://www.nikitamarieyigitcosmetics.com/datenschutz/',
};

/*
 * BUCHUNG – hier das Buchungstool anbinden.
 *  bookingUrl:   Link zu Treatwell (oder Calendly / Acuity / eigenes Tool – einfach den Link tauschen).
 *  whatsapp:     Nummer im internationalen Format ohne + und ohne Leerzeichen.
 *  showPrices:   false = keine Preise auf der Seite (Preise sieht man bei der Online-Buchung).
 *  capacityNote: ehrlicher Hinweis zu begrenzten Terminen – NUR eintragen, wenn er stimmt
 *                (z. B. 'Ich arbeite allein und nehme mir für jede Behandlung Zeit – deshalb gibt es pro Woche nur wenige PMU-Termine.').
 *                null = kein Hinweis. Keine erfundene Knappheit (wäre irreführende Werbung).
 */
export const BOOKING = {
  bookingUrl: 'https://buchung.treatwell.de/ort/475384/menue/',
  whatsapp: '4917664044729',
  showPrices: false,
  capacityNote: null,
};

export const HERO = {
  eyebrow: 'Permanent Make-up · Seevetal',
  title: ['Morgens aufwachen.', 'Fertig sein.'], // zweite Zeile kursiv
  lead: 'Natürliches Permanent Make-up für Brauen und Lippen – von Nikita, in ihrem ruhigen Homestudio in Meckelfeld.',
  trust: ['Vorzeichnung vor jedem Stich', 'Einweg-Material', 'Seit über 5 Jahren in der Beauty-Branche'],
};

// Link-in-Bio-Knöpfe (Reihenfolge = Priorität). action: 'booking' öffnet die Anfrage, sonst Sprungziel.
export const HUB_LINKS = [
  { id: 'termin', label: 'Termin oder Beratung anfragen', hint: 'in 3 kurzen Schritten', action: 'booking', primary: true },
  { id: 'behandlungen', label: 'Behandlungen im Überblick', hint: 'Für wen, Dauer, Haltbarkeit', href: '#behandlungen' },
  { id: 'ergebnisse', label: 'Ergebnisse & Heilungsverlauf', hint: 'echte Kundinnen, ehrlich erklärt', href: '#ergebnisse' },
  { id: 'fragen', label: 'Häufige Fragen', hint: 'Schmerz, Haltbarkeit, Vorbereitung', href: '#fragen' },
  { id: 'whatsapp', label: 'Kurze Frage per WhatsApp', hint: 'ich antworte persönlich', action: 'whatsapp' },
];

export const PAINS = {
  eyebrow: 'Kennst du das?',
  title: ['Jeden Morgen', 'dasselbe Spiel.'],
  items: [
    ['Zehn Minuten vor dem Spiegel', ' – und die zweite Braue wird trotzdem nie wie die erste.'],
    ['Sport, Sauna, Urlaub', ' – und nach einer Stunde ist die Farbe verwischt.'],
    ['Blasse Lippen', ', die ohne Lippenstift müde wirken.'],
  ],
  fear: ['Und die größte Sorge: dass es am Ende ', 'künstlich', ' aussieht.'],
  answer: 'Genau darauf ist meine Arbeit ausgerichtet: eine Vorzeichnung, die wir gemeinsam festlegen, und eine Farbe, die zu deinem Hautton passt – damit es aussieht wie du, nur ausgeschlafen.',
};

export const TREATMENTS = [
  {
    id: 'powder-brows', name: 'Powder Brows', alt: 'Ombre Brows', image: 'TREATMENT_BROWS',
    forWhom: 'Für dich, wenn du deine Brauen täglich nachzeichnest, sie lückig oder sehr hell sind oder du dir einfach mehr Form wünschst.',
    result: 'Weiche, pudrige Brauen – von ganz natürlich bis etwas definierter. Kein harter Balken, sondern ein sanfter Verlauf.',
    duration: 'ca. 1,5–2,5 Std.', lasts: 'ca. 2–5 Jahre', touchUp: 'nach ca. 6 Wochen', price: null,
  },
  {
    id: 'lip-blush', name: 'Lip Blush', alt: 'Aquarell Lips', image: 'TREATMENT_LIPS',
    forWhom: 'Für dich, wenn deine Lippen blass wirken, die Kontur verschwimmt oder du morgens Zeit sparen möchtest.',
    result: 'Frische, natürliche Farbe und eine klarere Kontur – ohne Lippenstift-Look. Blasse Bereiche werden sanft ausgeglichen.',
    duration: 'ca. 2–2,5 Std.', lasts: 'ca. 1–3 Jahre', touchUp: 'nach ca. 6 Wochen', price: null,
  },
  {
    id: 'lashlifting', name: 'Lashlifting', alt: 'Wimpernlifting', image: 'TREATMENT_EYES',
    forWhom: 'Für dich, wenn deine Wimpern eher gerade wachsen und du dir mehr Schwung wünschst – ohne Extensions.',
    result: 'Ein offener, wacher Blick mit deinen eigenen Wimpern. Auf Wunsch zusätzlich gefärbt.',
    duration: 'ca. 50–60 Min.', lasts: 'ca. 4–6 Wochen', touchUp: 'nicht nötig', price: null,
  },
];
export const MORE_TREATMENTS = 'Außerdem: Browlifting, Microneedling, Wimpern & Brauen färben – alles online buchbar.';

// Heilungsverlauf – realistische Erwartungen (Werte von deiner Website)
export const HEALING = [
  { when: 'Tag 1', title: 'Kräftiger als später', text: 'Direkt nach der Behandlung wirkt die Farbe intensiver. Das ist normal und gewollt.' },
  { when: 'Tag 3–10', title: 'Leichte Kruste', text: 'Eine feine Kruste bildet sich und löst sich von selbst. Bitte nicht abziehen. Nach etwa 7–10 Tagen ist die Haut oberflächlich verheilt.' },
  { when: 'ca. Woche 4', title: 'Das echte Ergebnis', text: 'Die Farbe hat sich gesetzt und wirkt weicher und natürlicher.' },
  { when: 'ca. Woche 6', title: 'Nachtermin', text: 'Wir schauen gemeinsam auf das abgeheilte Ergebnis und gleichen bei Bedarf Farbe oder Form aus.' },
];

// Kundenstimmen – unverändert. Google-Bewertungen aus der NMY-App ersetzen diese automatisch.
export const REVIEWS = [
  { text: 'Ich bin mehr als zufrieden mit meinen Augenbrauen. Ich wurde super beraten und habe mich sehr wohl gefühlt.', who: 'Kundin', src: 'NMY Cosmetics' },
  { text: 'Nach 4 Jahren habe ich endlich jemanden gefunden, der mein Permanent Make-up an den Augenbrauen neu sticht.', who: 'Kundin', src: 'NMY Cosmetics' },
  { text: 'Sehr gute Arbeit, faires Preis-/Leistungsverhältnis. Ich bin absolut zufrieden.', who: 'Kundin', src: 'NMY Cosmetics' },
];

export const ABOUT = {
  eyebrow: 'Die Person hinter NMY',
  role: 'Permanent-Make-up-Artistin · seit über 5 Jahren in der Beauty-Branche',
  text: 'Ich arbeite allein, in meinem eigenen Homestudio. Vom ersten Gespräch bis zum Nachtermin hast du es also immer mit mir zu tun.',
  // Sicherheit & Vertrauen („Risk Reversal“)
  promises: [
    ['Kein Stich ohne dein Ja.', 'Wir legen Form und Farbe gemeinsam fest. Ich starte erst, wenn du sagst: „Ja, genau so.“'],
    ['Ehrliche Beratung.', 'Ich sage dir, was bei deiner Haut realistisch ist – auch wenn die Antwort mal „lieber nicht“ lautet.'],
    ['Nur für dich geöffnet.', 'Einweg-Nadelmodule, Handschuhe und Desinfektion – bei jeder Behandlung.'],
    ['Begleitung bis zum Schluss.', 'Nach ca. 6 Wochen sehen wir uns zum Nachtermin und schauen gemeinsam auf das abgeheilte Ergebnis.'],
  ],
};

export const FAQ = [
  ['Sieht das am Ende künstlich aus?', 'Nicht, wenn Form und Farbe zu dir passen. Ziel ist ein weicher, typgerechter Look – keine blockartigen Balkenbrauen. Deshalb zeichnen wir vorher gemeinsam vor, und du entscheidest.'],
  // BITTE PRÜFEN: Betäubung / Ablauf bei Schmerzempfinden
  ['Tut das weh?', 'Das Empfinden ist sehr individuell – die meisten beschreiben es als gut auszuhalten. Wir sprechen vorher in Ruhe darüber, und du kannst jederzeit eine Pause bekommen.'],
  ['Wie lange hält das Ergebnis?', 'Powder Brows meist ca. 2–5 Jahre, Lip Blush ca. 1–3 Jahre. Hauttyp, Pflege, Sonne und Stoffwechsel spielen mit – in der Beratung sage ich dir, was bei dir realistisch ist.'],
  // BITTE PRÜFEN: deine Vorbereitungs-Hinweise
  ['Wie bereite ich mich vor?', 'Komm am besten ungeschminkt im Behandlungsbereich. Alles Weitere, was du vorher beachten solltest, schicke ich dir nach der Terminbestätigung persönlich.'],
  ['Wie läuft die Heilung?', 'Direkt danach wirkt die Farbe kräftiger. Eine leichte Kruste ist normal und darf nicht entfernt werden. Nach etwa 7–10 Tagen ist die Haut oberflächlich verheilt, das endgültige Ergebnis siehst du nach ca. 4 Wochen.'],
  ['Für wen ist Permanent Make-up nicht geeignet?', 'Zum Beispiel bei akuten Hautentzündungen, bestimmten Autoimmunerkrankungen sowie in Schwangerschaft und Stillzeit. Im Zweifel klären wir das vorab in Ruhe.'],
  ['Kann ich altes Permanent Make-up auffrischen lassen?', 'Ja, nach einer ehrlichen Beratung frische ich auch bestehendes Permanent Make-up auf. Wähle bei der Anfrage einfach „Bestehendes PMU auffrischen“.'],
];

// Anfrage-Formular (Buchungsfunnel)
export const FUNNEL = {
  treatments: [
    { id: 'beratung', name: 'Unverbindliche Beratung', hint: 'Ich bin noch unsicher, was zu mir passt' },
    { id: 'powder-brows', name: 'Powder Brows', hint: 'Augenbrauen' },
    { id: 'lip-blush', name: 'Lip Blush', hint: 'Lippen' },
    { id: 'auffrischen', name: 'Bestehendes PMU auffrischen', hint: 'Brauen oder Lippen' },
    { id: 'lashlifting', name: 'Lashlifting', hint: 'Wimpern' },
    { id: 'andere', name: 'Etwas anderes', hint: 'Browlifting, Microneedling, Färben' },
  ],
  periods: ['So bald wie möglich', 'In den nächsten 2 Wochen', 'Diesen Monat', 'Ich bin flexibel'],
  times: ['Vormittags', 'Nachmittags', 'Abends', 'Egal'],
  // BITTE PRÜFEN: Antwortzeit
  nextSteps: [
    'Sende die vorbereitete Nachricht in WhatsApp ab.',
    'Ich melde mich persönlich bei dir – mit passenden Terminvorschlägen.',
    'Vor dem Termin bekommst du von mir alle Hinweise zur Vorbereitung.',
  ],
};
