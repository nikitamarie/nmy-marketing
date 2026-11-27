// Erzeugt die NMY-Formulare als PDF (A4, druckfertig): node docs/formulare/build.mjs
// Ausgabe: docs/formulare/pdf/*.pdf  → danach in die App hochladen (siehe README.md)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { STUDIO as S, BROWS, LIPS } from './inhalt.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'pdf');
mkdirSync(out, { recursive: true });
const logo = 'data:image/png;base64,' + readFileSync(join(here, '../../assets/logo/nmy-logo-dunkel.png')).toString('base64');

const box = '<span class="box"></span>';
const field = (label, cls = '') => `<div class="f ${cls}"><span>${label}</span><i></i></div>`;
const check = text => `<div class="check">${box}<div>${text}</div></div>`;
const list = items => `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
const h2 = (n, t) => `<h2><span class="n">${n}</span>${t}</h2>`;
const kontakt = `${S.name} · ${S.inhaberin} · ${S.adresse} · ${S.telefon} · ${S.web}`;

function head(kicker, title, sub) {
  return `<div class="top"><img src="${logo}" alt="NMY Cosmetics">
    <div class="meta">${S.inhaberin}<br>${S.adresse}<br>${S.telefon.replace(' (Telefon & WhatsApp)', '')} · ${S.instagram}<br>${S.web}</div></div>
    <div class="kicker">${kicker}</div><h1>${title}</h1><div class="sub">${sub}</div>`;
}

function page(body) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><link rel="stylesheet" href="file://${join(here, 'style.css')}"></head><body>${body}</body></html>`;
}

// ---------------- Einverständniserklärung ----------------
function consent(t) {
  const rows = t.fragen.map(([q, s]) => `<tr><td>${q}${s ? `<span class="q-sub">${s}</span>` : ''}</td><td class="c">${box}</td><td class="c">${box}</td><td class="d"></td></tr>`).join('');
  return page(`
  ${head('Aufklärung · Einwilligung · Vereinbarung', t.title, t.sub)}
  <div class="intro"><b>Schön, dass du da bist.</b> Bitte lies dir alles in Ruhe durch – am liebsten schon vor deinem Termin – und füll die Felder vollständig und ehrlich aus. Wenn etwas unklar ist, frag mich jederzeit. Du unterschreibst erst, wenn alle deine Fragen beantwortet sind.</div>

  <section>${h2(1, 'Deine Daten')}
    <div class="fields">${field('Vorname')}${field('Nachname')}${field('Geburtsdatum')}${field('Telefon')}${field('E-Mail', 'full')}${field('Adresse', 'full')}</div>
    <div class="small">Wie bist du auf mich aufmerksam geworden?</div>
    <div class="opts"><span>${box}Instagram</span><span>${box}Treatwell</span><span>${box}Google</span><span>${box}Empfehlung</span><span>${box}Sonstiges: <span class="inline-line"></span></span></div>
  </section>

  <section>${h2(2, `Die Behandlung: ${t.short}`)}
    <p>${t.beschreibung}</p>
    <h3>Ablauf & Ergebnis</h3>${list(t.ablauf)}
    <p>Permanent Make-up ist eine kosmetische Behandlung ohne medizinische Notwendigkeit. Ich verwende ausschließlich Pigmente, die den Anforderungen der EU-REACH-Verordnung für Tätowiermittel entsprechen, sowie sterile Einweg-Nadelmodule. Pigmente können Metalloxide enthalten: Bitte erwähne dein Permanent Make-up vor einer MRT-Untersuchung.</p>
  </section>

  <section class="cols keep">
    <div>${h2(3, 'Vor der Behandlung')}${list(t.vorher)}</div>
    <div>${h2(4, 'Nach der Behandlung')}${list(t.nachher)}</div>
  </section>

  <section>${h2(5, 'Gesundheitsfragen')}
    <p>Deine Angaben sind für deine Sicherheit nötig und werden vertraulich behandelt. Bitte beantworte jede Frage. Im Zweifel klär die Frage bitte vorher mit deiner Ärztin oder deinem Arzt.</p>
    <table><thead><tr><th>Frage</th><th class="c">Nein</th><th class="c">Ja</th><th>Wenn ja: Details</th></tr></thead><tbody>${rows}
      <tr><td>Sonstiges, das ich wissen sollte</td><td class="c"></td><td class="c"></td><td class="d"></td></tr></tbody></table>
    <div class="note"><b>Wann ich nicht behandle:</b> ${t.ausschluss}.<br>Bei Erkrankungen wie Diabetes, Autoimmun- oder Herzerkrankungen, Blutverdünnung, Epilepsie, Immunschwäche oder Keloidneigung behandle ich nur mit einer schriftlichen ärztlichen Unbedenklichkeitsbescheinigung. Ich darf die Behandlung ablehnen oder abbrechen, wenn ein solcher Grund vorliegt oder sich während der Behandlung zeigt. Für nicht erbrachte Leistungen entstehen dir dann keine Kosten.</div>
    ${check('Ich habe alle Fragen vollständig und wahrheitsgemäß beantwortet. Mir ist bekannt, dass falsche oder fehlende Angaben meine Gesundheit und das Ergebnis gefährden können. Ändert sich bis zur Behandlung oder Nachbehandlung etwas an meinem Gesundheitszustand, sage ich dir vorher Bescheid.')}
  </section>

  <section>${h2(6, `Besonderer Hinweis: ${t.besonders.titel}`)}
    <p>${t.besonders.text}</p>
    ${t.besonders.herpes ? `<div class="opts"><span>Lippenherpes in der Vorgeschichte:</span><span>${box}nein</span><span>${box}ja – ich habe mich vorab ärztlich oder in der Apotheke beraten lassen</span></div>` : ''}
    ${check(t.besonders.confirm)}
  </section>

  <section>${h2(7, 'Mögliche Risiken & Nebenwirkungen')}
    <p>Auch bei sorgfältiger und fachgerechter Arbeit können folgende Reaktionen auftreten. Ich habe sie dir mündlich erklärt; hier stehen sie noch einmal schriftlich:</p>
    <div class="cols">${list(t.risiken.slice(0, Math.ceil(t.risiken.length / 2)))}${list(t.risiken.slice(Math.ceil(t.risiken.length / 2)))}</div>
    ${check('Ich wurde verständlich über Ablauf, Alternativen (z. B. tägliches Schminken, Färben), Risiken, Nachsorge und Ausschlussgründe aufgeklärt. Ich hatte genug Zeit, alles zu überdenken, und alle meine Fragen wurden beantwortet.')}
  </section>

  <section>${h2(8, 'Unsere Vereinbarung')}
    <div class="para"><b>§ 1 Leistung & Vorzeichnung</b>Ich führe die Behandlung fachgerecht und nach den geltenden Hygieneregeln aus. Grundlage ist die Vorzeichnung (Form, Kontur, Farbton), die du vor Beginn geprüft und freigegeben hast. Sie ist der vereinbarte Maßstab für das Ergebnis. Weil jede Haut anders heilt, kann ich ein bestimmtes Heilungsergebnis, eine bestimmte Haltbarkeit oder vollständige Symmetrie nicht garantieren. Abweichungen, die auf der individuellen Heilung beruhen und in Ziffer 2, 6 und 7 beschrieben sind, sind kein Mangel.</div>
    <div class="para"><b>§ 2 Nachbehandlung</b>Die Nachbehandlung findet idealerweise nach ca. 4–8 Wochen statt. Im Preis enthalten: <span>${box}ja</span> <span>${box}nein – Preis laut aktueller Preisliste</span>. Wird die Nachbehandlung nicht wahrgenommen, kann das Ergebnis unvollständig bleiben.</div>
    <div class="para"><b>§ 3 Deine Mitwirkung</b>Für ein gutes Ergebnis brauche ich deine ehrlichen Angaben und deine Pflege. Bitte halte dich an die Hinweise vor und nach der Behandlung und an die schriftliche Pflegeanleitung. Folgen, die auf falschen oder unvollständigen Angaben oder auf nicht eingehaltener Nachsorge beruhen, kann ich nicht verantworten.</div>
    <div class="para"><b>§ 4 Meine Pflichten</b>Ich arbeite mit sterilen Einweg-Nadelmodulen, die ich vor deinen Augen öffne, mit REACH-konformen Pigmenten, die einzeln und unter Beachtung des Haltbarkeitsdatums vorbereitet werden, und dokumentiere Pigment und Charge. Ich bin für diese Behandlung ausgebildet und kann das durch Zertifikate nachweisen.</div>
    <div class="para"><b>§ 5 Haftung</b>Ich hafte unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung des Lebens, des Körpers oder der Gesundheit. Bei leicht fahrlässiger Verletzung sonstiger wesentlicher Vertragspflichten hafte ich nur für den vorhersehbaren, vertragstypischen Schaden. Im Übrigen ist die Haftung bei leichter Fahrlässigkeit ausgeschlossen. Die in Ziffer 7 beschriebenen Risiken können auch bei fachgerechter Behandlung auftreten; sie sind für sich genommen kein Behandlungsfehler. Deine gesetzlichen Rechte bei Mängeln bleiben unberührt; bei einem berechtigten Mangel bekomme ich zuerst die Gelegenheit zur Nachbesserung.</div>
    <div class="para"><b>§ 6 Preis & Zahlung</b>Vereinbarter Preis: <span class="inline-line" style="min-width:26mm"></span> €. Der Betrag ist direkt nach der Behandlung fällig.</div>
    <div class="para"><b>§ 7 Online gebuchte Termine</b>Hast du den Termin online gebucht (z. B. über Treatwell), hast du grundsätzlich ein gesetzliches Widerrufsrecht.
      ${check('Ich wünsche ausdrücklich, dass die Behandlung schon vor Ablauf der Widerrufsfrist durchgeführt wird. Mir ist bekannt, dass mein Widerrufsrecht erlischt, sobald die Behandlung vollständig erbracht ist.')}</div>
    <div class="para"><b>§ 8 Schlussbestimmung</b>Sollte eine Bestimmung dieser Vereinbarung unwirksam sein, bleiben die übrigen Bestimmungen wirksam. Es gilt deutsches Recht.</div>
  </section>

  <section>${h2(9, 'Gesundheitsdaten & Datenschutz')}
    <p>Deine Angaben, besonders die Gesundheitsfragen, verarbeite ich nur, um die Behandlung sicher durchzuführen und zu dokumentieren. Alles Weitere – Speicherdauer, Empfänger und deine Rechte – steht in der separaten <b>Datenschutz-Information</b>, die du von mir bekommst.</p>
    ${check('Ich willige ausdrücklich ein, dass meine Gesundheitsangaben aus Ziffer 5 und 6 zur Vorbereitung, Durchführung und Dokumentation der Behandlung verarbeitet werden (Art. 9 Abs. 2 lit. a DSGVO). Ich kann diese Einwilligung jederzeit für die Zukunft widerrufen. Ohne diese Angaben ist die Behandlung aus Sicherheitsgründen nicht möglich.')}
  </section>

  <section>${h2(10, 'Fotos & Videos (freiwillig)')}
    <p>Ich mache gern Vorher-/Nachher-Fotos. Diese Einwilligung ist freiwillig und hat keinen Einfluss auf deine Behandlung. Deine Ergebnisse werden nicht verfälscht und nicht mit KI verändert. Für die Nutzung wird kein Honorar gezahlt.</p>
    <div class="opts">
      <span>${box}Nur zur internen Dokumentation – keine Veröffentlichung</span>
      <span>${box}Instagram (${S.instagram})</span><span>${box}Website & Buchungsseite</span><span>${box}Werbung (z. B. Flyer, Portfolio)</span>
    </div>
    <div class="opts"><span>Bei Veröffentlichung:</span><span>${box}nur der behandelte Bereich, Gesicht nicht erkennbar</span><span>${box}Gesicht darf erkennbar sein</span></div>
    <p class="small">Du kannst die Einwilligung jederzeit formlos für die Zukunft widerrufen (z. B. per WhatsApp). Ich lösche die Inhalte dann aus meinen Kanälen. Was im Internet bereits von Dritten kopiert wurde, kann ich leider nicht in jedem Fall entfernen. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO, § 22 KUG.</p>
  </section>

  <section class="keep">${h2(11, 'Bestätigung & Unterschrift')}
    <p>Ich bin volljährig (mindestens 18 Jahre). Ich habe diese Erklärung vollständig gelesen und verstanden, wurde mündlich und schriftlich aufgeklärt und hatte ausreichend Bedenkzeit. Ich möchte die Behandlung „${t.short}“ durch ${S.inhaberin} durchführen lassen. Eine Kopie dieser Erklärung habe ich erhalten bzw. kann ich jederzeit bekommen.</p>
    <div class="sign"><div>Ort, Datum</div><div>Unterschrift Kundin / Kunde</div><div>Unterschrift ${S.inhaberin}</div></div>
  </section>

  <div class="end">${kontakt} · Stand: ${S.stand}</div>
  <section class="pb">
    <div class="kicker">Nur für das Studio · wird von NMY ausgefüllt</div>
    <h1 style="font-size:20pt">Behandlungs\u00ADdokumentation</h1>
    <div class="sub">${t.short} · Kundin: <span class="inline-line" style="min-width:70mm"></span></div>
    ${['Erstbehandlung', 'Nachbehandlung', 'Weitere Behandlung'].map((x, i) => `<div class="doc" style="margin-bottom:5mm">${h2(i + 1, x)}
      <div class="fields">${field('Datum')}${field('Technik / Nadelkonfiguration')}${field('Vorzeichnung freigegeben – Kürzel Kundin')}
        ${field('Pigment / Hersteller')}${field('Farbton & Mischung')}${field('Charge (LOT) & haltbar bis')}
        ${field('Nadelmodul & Charge')}${field('Pflegeprodukt & Anleitung mitgegeben')}${field('Fotos vorher / nachher')}
        ${field('Besonderheiten / Reaktionen', 'full')}</div></div>`).join('')}
    <div class="note small">Gesundheitsangaben bei jedem Folgetermin kurz mündlich abfragen und hier unter „Besonderheiten“ vermerken (z. B. „keine Änderungen“). Aufbewahrung: 10 Jahre nach der letzten Behandlung, verschlossen.</div>
  </section>
`);
}

// ---------------- Datenschutz-Information ----------------
function privacy() {
  const rows = [
    ['Termin & Vertrag', 'Name, Kontaktdaten, Termin, gebuchte Leistung, Preis', 'Vertragsdurchführung – Art. 6 Abs. 1 lit. b DSGVO'],
    ['Gesundheitsfragen & Behandlungsdokumentation', 'Angaben aus dem Gesundheitsfragebogen, Vorzeichnung, Pigment & Charge, Verlauf', 'deine ausdrückliche Einwilligung – Art. 9 Abs. 2 lit. a DSGVO'],
    ['Nachweis & Abwehr von Ansprüchen', 'unterschriebene Aufklärung und Dokumentation', 'berechtigtes Interesse – Art. 6 Abs. 1 lit. f, Art. 9 Abs. 2 lit. f DSGVO'],
    ['Rechnungen & Buchhaltung', 'Name, Leistung, Betrag, Datum', 'gesetzliche Pflicht – Art. 6 Abs. 1 lit. c DSGVO i. V. m. § 147 AO, § 257 HGB'],
    ['Vorher-/Nachher-Fotos', 'Fotos/Videos des behandelten Bereichs', 'nur mit deiner Einwilligung – Art. 6 Abs. 1 lit. a DSGVO, § 22 KUG'],
    ['Erinnerungen & Bewertungsbitte', 'Telefonnummer bzw. WhatsApp', 'nur mit deiner Einwilligung – Art. 6 Abs. 1 lit. a DSGVO, § 7 UWG'],
  ].map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('');
  return page(`
  ${head('Information nach Art. 13 DSGVO · für alle Behandlungen', 'Datenschutz­information', 'Wie ich mit deinen Daten umgehe – klar und ehrlich')}
  <div class="intro"><b>Kurz gesagt:</b> Ich erhebe nur, was ich für deine sichere Behandlung, die Abrechnung und gesetzliche Pflichten brauche. Deine Gesundheitsangaben bleiben bei mir und werden nicht verkauft und nicht für Werbung genutzt. Fotos veröffentliche ich nur, wenn du es ausdrücklich erlaubst.</div>

  <section>${h2(1, 'Verantwortlich')}
    <p>${S.inhaberin} · ${S.name}<br>${S.adresse}<br>${S.telefon} · ${S.web}</p>
    <p class="small">Ein Datenschutzbeauftragter ist gesetzlich nicht vorgeschrieben (§ 38 BDSG). Bei allen Fragen zum Datenschutz wende dich direkt an mich.</p>
  </section>

  <section>${h2(2, 'Welche Daten, wofür und auf welcher Grundlage')}
    <table><thead><tr><th>Zweck</th><th>Daten</th><th>Rechtsgrundlage</th></tr></thead><tbody>${rows}</tbody></table>
  </section>

  <section>${h2(3, 'Musst du die Daten angeben?')}
    <p>Gesetzlich bist du nicht dazu verpflichtet. Ohne deine Kontaktdaten kann ich jedoch keinen Termin vergeben. Ohne die Gesundheitsangaben kann ich Permanent Make-up, Lifting- oder Hautbehandlungen aus Sicherheitsgründen nicht durchführen. Fotos und Erinnerungen sind immer freiwillig.</p>
  </section>

  <section>${h2(4, 'Wer deine Daten erhält')}
    <p>Grundsätzlich niemand. Ausnahmen gibt es nur, soweit es für den jeweiligen Zweck nötig ist:</p>
    ${list([
      '<b>Treatwell</b> (Online-Terminbuchung), wenn du darüber buchst. Dafür gilt zusätzlich der Datenschutzhinweis von Treatwell.',
      '<b>WhatsApp / Meta Platforms Ireland Ltd.</b>, wenn du mir über WhatsApp schreibst. Meta kann Daten auch in den USA verarbeiten; Grundlage ist das EU-US Data Privacy Framework.',
      '<b>Instagram / Meta</b> sowie <b>Cloudflare, Inc.</b> (Hosting meiner Website, Buchungsseite und Social-Media-Planung als Auftragsverarbeiter), nur für Fotos, die du zur Veröffentlichung freigegeben hast. Beide Anbieter sind unter dem EU-US Data Privacy Framework zertifiziert.',
      '<b>Steuerberatung</b> bzw. Finanzamt, nur Rechnungsdaten und nur soweit gesetzlich nötig.',
      'Behörden oder Gerichte, nur wenn ich gesetzlich dazu verpflichtet bin oder es zur Abwehr von Ansprüchen nötig ist.',
    ])}
    <p>Deine Gesundheitsangaben werden nicht an Dritte weitergegeben, nicht online gespeichert und nicht für Werbung oder KI-Auswertungen genutzt.</p>
  </section>

  <section>${h2(5, 'Wie lange ich deine Daten speichere')}
    ${list([
      '<b>Einverständniserklärung, Gesundheitsfragen & Behandlungsdokumentation:</b> 10 Jahre nach deiner letzten Behandlung. So kann ich bei Fragen zu Pigment, Charge oder Verlauf auch später noch Auskunft geben und mich gegen unberechtigte Ansprüche verteidigen.',
      '<b>Rechnungen:</b> so lange, wie es das Steuer- und Handelsrecht vorschreibt (derzeit 8 bzw. 10 Jahre).',
      '<b>Fotos:</b> bis zu deinem Widerruf. Fotos nur zur internen Dokumentation werden zusammen mit der Behandlungsdokumentation gelöscht.',
      '<b>Kontaktdaten für Erinnerungen:</b> bis zu deinem Widerruf, spätestens 3 Jahre nach deinem letzten Termin.',
    ])}
    <p>Papierunterlagen bewahre ich verschlossen auf, digitale Daten geschützt durch Passwort und Verschlüsselung. Danach wird alles sicher vernichtet bzw. gelöscht.</p>
  </section>

  <section class="keep">${h2(6, 'Deine Rechte')}
    <p>Du hast jederzeit das Recht auf <b>Auskunft</b> (Art. 15 DSGVO), <b>Berichtigung</b> (Art. 16), <b>Löschung</b> (Art. 17), <b>Einschränkung der Verarbeitung</b> (Art. 18) und <b>Datenübertragbarkeit</b> (Art. 20). Gegen eine Verarbeitung aufgrund berechtigter Interessen kannst du <b>widersprechen</b> (Art. 21). Eine Einwilligung kannst du jederzeit mit Wirkung für die Zukunft <b>widerrufen</b> (Art. 7 Abs. 3). Ein formloser Hinweis per WhatsApp oder Post genügt. Die bis dahin erfolgte Verarbeitung bleibt rechtmäßig. Gesetzliche Aufbewahrungspflichten und Unterlagen, die ich zur Abwehr von Ansprüchen brauche, darf ich bis zum Ende der Frist behalten.</p>
    <p>Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren, z. B. bei der für mich zuständigen: <b>Die Landesbeauftragte für den Datenschutz Niedersachsen</b>, Prinzenstraße 5, 30159 Hannover, www.lfd.niedersachsen.de.</p>
    <p class="small">Es findet keine automatisierte Entscheidungsfindung und kein Profiling statt.</p>
  </section>

  <section class="keep">${h2(7, 'Deine Einwilligungen')}
    ${check('<b>Gesundheitsdaten:</b> Ich willige ausdrücklich ein, dass meine Gesundheitsangaben zur Vorbereitung, Durchführung und Dokumentation meiner Behandlungen verarbeitet und wie oben beschrieben gespeichert werden (Art. 9 Abs. 2 lit. a DSGVO).')}
    ${check('<b>Erinnerungen & Bewertung (freiwillig):</b> Ich bin einverstanden, dass du mich per WhatsApp oder SMS an Pflege und Nachtermin erinnerst und einmalig nach meiner Zufriedenheit bzw. einer Bewertung fragst. Das kann ich jederzeit beenden.')}
    <p class="small">Fotos & Videos regelst du separat in der Einverständniserklärung zur jeweiligen Behandlung.</p>
    <p>Ich habe diese Datenschutz-Information erhalten und gelesen.</p>
    <div class="fields" style="margin-top:4mm">${field('Vorname, Nachname')}${field('Geburtsdatum')}</div>
    <div class="sign two"><div>Ort, Datum</div><div>Unterschrift Kundin / Kunde</div></div>
  </section>
  <div class="end">${kontakt} · Stand: ${S.stand}</div>`);
}

const footer = title => `<div style="width:100%;font-family:Helvetica,Arial,sans-serif;font-size:6.6pt;color:#8C877F;padding:0 15mm;display:flex;justify-content:space-between;letter-spacing:.04em">
  <span>NMY Cosmetics · ${title}</span><span>Kürzel Kundin: ________</span><span>Seite <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;

const docs = [
  [BROWS.file, consent(BROWS), `Einverständniserklärung ${BROWS.short}`],
  [LIPS.file, consent(LIPS), `Einverständniserklärung ${LIPS.short}`],
  ['NMY-Datenschutzinformation.pdf', privacy(), 'Datenschutzinformation'],
];

const browser = await chromium.launch();
const pg = await browser.newPage();
for (const [file, html, title] of docs) {
  const tmp = join(here, '.tmp.html');
  writeFileSync(tmp, html);
  await pg.goto('file://' + tmp, { waitUntil: 'networkidle' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.pdf({ path: join(out, file), format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: footer(title) });
  console.log('✓', file);
}
await browser.close();
