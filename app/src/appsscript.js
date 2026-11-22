// Erzeugt den Google-Apps-Script-Code, den Nikita einmal in ihr Google-Konto kopiert.
// Das Skript läuft kostenlos alle 10 Minuten in ihrem eigenen Google-Konto:
//  1) liest neue Treatwell-Mails (nur Betreff, Datum, kurzer Auszug – keine Kundinnen-Daten speichern)
//  2) holt Benachrichtigungen der App ab und schickt sie als E-Mail an sie selbst
export function appsScript(origin, token) {
  return `// NMY Marketing-App – Verbindung zu Gmail (Treatwell-Buchungen + Benachrichtigungen)
const APP = '${origin}';
const TOKEN = '${token}';

function nmySync() {
  const props = PropertiesService.getScriptProperties();
  // 1) Treatwell-Buchungen
  const threads = GmailApp.search('from:treatwell newer_than:3d', 0, 30);
  const seen = JSON.parse(props.getProperty('seen') || '[]');
  const mails = [];
  threads.forEach(t => t.getMessages().forEach(m => {
    const id = m.getId();
    if (seen.indexOf(id) >= 0) return;
    // Kundinnen-Namen werden NICHT übertragen: nur Betreff + Behandlungs-Stichworte
    const body = m.getPlainBody();
    const keywords = (body.match(/(Permanent Make-Up[^\\n]{0,40}|Wimpernlifting|Augenbrauenlifting|Microneedling|färben|storniert|abgesagt)/gi) || []).join(' | ');
    mails.push({ id: id, subject: m.getSubject(), date: m.getDate().toISOString(), snippet: keywords });
    seen.push(id);
  }));
  if (mails.length) {
    UrlFetchApp.fetch(APP + '/api/ingest/bookings', { method: 'post', contentType: 'application/json', headers: { 'x-ingest-token': TOKEN }, payload: JSON.stringify({ mails: mails }) });
    props.setProperty('seen', JSON.stringify(seen.slice(-300)));
  }
  // 2) Benachrichtigungen als E-Mail
  const res = UrlFetchApp.fetch(APP + '/api/ingest/notifications', { method: 'post', headers: { 'x-ingest-token': TOKEN }, muteHttpExceptions: true });
  if (res.getResponseCode() === 200) {
    JSON.parse(res.getContentText()).forEach(n => {
      GmailApp.sendEmail(Session.getActiveUser().getEmail(), 'NMY App: ' + n.title, (n.body || '') + (n.url ? '\\n\\n' + n.url : '') + '\\n\\nApp öffnen: ' + APP);
    });
  }
}

// Einmal ausführen: richtet den 10-Minuten-Takt ein
function einrichten() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('nmySync').timeBased().everyMinutes(10).create();
  nmySync();
}
`;
}
