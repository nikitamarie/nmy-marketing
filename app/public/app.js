import { correctPhoto } from './photo.js';

const $ = (s, el = document) => el.querySelector(s);
const view = $('#view');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let TREATMENTS = {};

function toast(msg, ms = 3200) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), ms);
}

async function api(path, opts = {}) {
  const res = await fetch(path, { credentials: 'same-origin', ...opts, headers: { ...(opts.body && !(opts.body instanceof Blob) ? { 'content-type': 'application/json' } : {}), ...(opts.headers || {}) } });
  if (res.status === 401 && path !== '/api/login') { showLogin(); throw new Error('Bitte anmelden'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Fehler ' + res.status);
  return data;
}
const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) });
const file = key => `/api/file/${encodeURIComponent(key)}`;

// ---------------- Login ----------------
function showLogin() {
  $('#tabs').hidden = true;
  view.innerHTML = `<div class="login">
    <img src="/icon-512.png" alt="NMY Cosmetics" style="border-radius:28px;width:120px">
    <h1>Willkommen, <i>Nikita</i></h1><p class="lead">Deine Marketing-Abteilung.</p>
    <form id="f"><label class="field"><span>Passwort</span><input type="password" id="pw" autocomplete="current-password" required></label>
    <button class="btn primary block">Anmelden</button></form></div>`;
  $('#f').onsubmit = async e => {
    e.preventDefault();
    try { await post('/api/login', { password: $('#pw').value }); start(); } catch (er) { toast(er.message); }
  };
}

// ---------------- Start ----------------
async function viewStart() {
  view.innerHTML = '<p class="muted">Lädt …</p>';
  const [s, posts, ig] = await Promise.all([api('/api/stats'), api('/api/posts?scope=kommend'), api('/api/instagram')]);
  const k = s.kpi;
  const diff = k.bookings30 - k.baseline;
  const next = posts.filter(p => p.status !== 'pausiert').slice(0, 3);
  view.innerHTML = `
    <p class="label">${new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p>
    <h1>Hallo <i>Nikita</i></h1>
    <p class="lead">${ig.connected ? `Instagram @${esc(ig.username)} ist verbunden – alles läuft automatisch.` : 'Instagram ist noch nicht verbunden. <a href="#einstellungen">Jetzt verbinden</a>'}</p>
    <div class="kpis">
      <div class="kpi"><span class="label">Buchungen · 30 Tage</span><b>${k.bookings30}</b><span class="small ${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '+' : '−'}${Math.abs(diff).toLocaleString('de-DE', { maximumFractionDigits: 1 })} zum Startwert</span></div>
      <div class="kpi"><span class="label">Buchungs-Klicks</span><b>${k.clicks30}</b><span class="small muted">über deinen Bio-Link</span></div>
      <div class="kpi"><span class="label">Beiträge · 30 Tage</span><b>${k.posts30}</b><span class="small muted">+ ${k.stories30} Stories</span></div>
      <div class="kpi"><span class="label">Follower</span><b>${k.followers ?? '–'}</b><span class="small muted">${k.followersDelta != null ? (k.followersDelta >= 0 ? '+' : '') + k.followersDelta + ' seit Start' : 'nach Verbindung'}</span></div>
    </div>
    <div class="row" style="margin-top:14px">
      <a class="btn primary" href="#hochladen" style="flex:1">Material hochladen</a>
      <button class="btn" id="wa" style="flex:1">+ WhatsApp-Buchung</button>
    </div>
    <h2>Als Nächstes</h2>
    ${next.length ? next.map(postCard).join('') : '<div class="card empty">Noch nichts geplant. Lade Material hoch oder fülle den Plan auf.</div>'}
    <a class="btn block" href="#plan" style="margin-top:6px">Ganzen Plan ansehen</a>`;
  $('#wa').onclick = () => quickBooking();
  bindPostCards();
}

async function quickBooking() {
  const keys = Object.keys(TREATMENTS);
  const choice = prompt('Welche Behandlung? (Nummer)\n' + keys.map((k, i) => `${i + 1} = ${TREATMENTS[k]}`).join('\n'), '1');
  if (choice == null) return;
  const treatment = keys[+choice - 1] || null;
  await post('/api/bookings', { source: 'whatsapp', treatment });
  toast('Buchung eingetragen – danke!');
  route();
}

// ---------------- Hochladen ----------------
const SLOTS = [
  { role: 'vorher', t: 'Vorher', h: 'vor der Behandlung' },
  { role: 'danach', t: 'Direkt danach', h: 'frisches Ergebnis' },
  { role: 'abgeheilt', t: 'Abgeheilt', h: 'optional, z. B. beim Nachtermin' },
  { role: 'video', t: 'Video', h: '10–30 Sek., hochkant', video: true },
];

function viewUpload() {
  const state = { treatment: 'powder-brows', files: {} };
  view.innerHTML = `
    <p class="label">Neues Material</p>
    <h1>Hochladen & <i>fertig.</i></h1>
    <p class="lead">Die App korrigiert das Licht, erstellt Beitrag, Story und Caption und plant alles automatisch ein.</p>
    <h2>Behandlung</h2>
    <div class="chips" id="chips">${Object.entries(TREATMENTS).map(([k, v]) => `<button class="chip" data-k="${k}" aria-pressed="${k === state.treatment}">${esc(v)}</button>`).join('')}</div>
    <h2>Fotos & Video</h2>
    <div class="slots">${SLOTS.map(s => `<label class="slot" data-role="${s.role}"><span class="t">${s.t}</span><span class="h">${s.h}</span>
      <input type="file" accept="${s.video ? 'video/*' : 'image/*'}"></label>`).join('')}</div>
    <p class="muted small" style="margin-top:8px">Tipp: immer gleicher Winkel auf der Liege, Gesicht mittig, kein Filter.</p>
    <label class="field"><span>Notiz (optional, ohne Namen)</span><input type="text" id="note" placeholder="z. B. Korrektur alter Brauen, sehr natürlich gewünscht"></label>
    <label class="check"><input type="checkbox" id="consent"><span>Die Kundin hat schriftlich eingewilligt, dass diese Fotos/Videos auf Instagram veröffentlicht werden.</span></label>
    <button class="btn primary block" id="go" disabled>Hochladen & Beiträge erstellen</button>
    <div id="prog" hidden><div class="progress"><div></div></div><p class="muted small" id="progtxt"></p></div>`;

  $('#chips').onclick = e => {
    const b = e.target.closest('.chip'); if (!b) return;
    state.treatment = b.dataset.k;
    view.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c === b));
  };
  const check = () => { $('#go').disabled = !($('#consent').checked && Object.keys(state.files).length); };
  $('#consent').onchange = check;
  view.querySelectorAll('.slot').forEach(slot => {
    const input = slot.querySelector('input');
    input.onchange = async () => {
      const f = input.files[0]; if (!f) return;
      const role = slot.dataset.role;
      slot.querySelectorAll('img,video,.tag').forEach(n => n.remove());
      if (role === 'video') {
        if (f.size > 1024 * 1024 * 1024) { toast('Video zu groß (max. 1 GB)'); return; }
        state.files[role] = { file: f, video: true };
        slot.insertAdjacentHTML('beforeend', `<video src="${URL.createObjectURL(f)}" muted playsinline></video><span class="tag">Video</span>`);
      } else {
        slot.insertAdjacentHTML('beforeend', '<span class="h">Licht wird angepasst …</span>');
        try {
          const out = await correctPhoto(f);
          state.files[role] = out;
          slot.insertAdjacentHTML('beforeend', `<img src="${out.preview}" alt=""><span class="tag">${slot.querySelector('.t').textContent} · korrigiert</span>`);
        } catch (e) { toast('Foto konnte nicht gelesen werden: ' + e.message); }
      }
      slot.classList.add('filled');
      check();
    };
  });

  $('#go').onclick = async () => {
    const btn = $('#go'); btn.disabled = true;
    const prog = $('#prog'); prog.hidden = false;
    const bar = prog.querySelector('.progress div'), txt = $('#progtxt');
    const setP = (p, t) => { bar.style.width = Math.round(p * 100) + '%'; txt.textContent = t; };
    try {
      const set = await post('/api/sets', { treatment: state.treatment, note: $('#note').value, consent: $('#consent').checked });
      const entries = Object.entries(state.files);
      for (const [i, [role, f]] of entries.entries()) {
        const base = i / entries.length, span = 1 / entries.length;
        if (f.video) await uploadVideo(set.id, f.file, p => setP((base + p * span) * 0.85, `Video wird hochgeladen … ${Math.round(p * 100)} %`));
        else {
          setP(base * 0.85, `Foto „${role}“ wird hochgeladen …`);
          await api(`/api/media?set=${set.id}&role=${role}&w=${f.width}&h=${f.height}`, { method: 'PUT', body: f.blob, headers: { 'content-type': 'image/jpeg' } });
        }
      }
      setP(0.9, 'Beiträge werden erstellt …');
      const r = await post(`/api/sets/${set.id}/planen`);
      setP(1, 'Fertig!');
      toast(`${r.created.length} Beiträge erstellt und eingeplant.`, 4500);
      setTimeout(() => (location.hash = '#plan'), 900);
    } catch (e) {
      toast('Fehler: ' + e.message, 6000); btn.disabled = false;
    }
  };
}

async function uploadVideo(setId, f, onProgress) {
  const PART = 10 * 1024 * 1024;
  const { id, key, uploadId } = await post('/api/media/mpu/start', { set: setId, mime: f.type || 'video/mp4', size: f.size });
  const parts = [];
  const n = Math.ceil(f.size / PART);
  for (let i = 0; i < n; i++) {
    const chunk = f.slice(i * PART, Math.min(f.size, (i + 1) * PART));
    const part = await api(`/api/media/mpu/part?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&n=${i + 1}`, { method: 'PUT', body: chunk, headers: { 'content-type': 'application/octet-stream' } });
    parts.push(part);
    onProgress((i + 1) / n);
  }
  return post('/api/media/mpu/complete', { id, key, uploadId, parts, set: setId, mime: f.type || 'video/mp4', size: f.size });
}

// ---------------- Plan ----------------
const KIND = { carousel: 'Karussell', story: 'Story', reel: 'Reel', image: 'Bild' };
const STATUS = { render: ['wird erstellt', 'wait'], geplant: ['geplant', ''], veroeffentlicht: ['online', 'ok'], fehler: ['Fehler', 'bad'], pausiert: ['pausiert', 'wait'] };

function postCard(p) {
  const [st, cls] = STATUS[p.status] || [p.status, ''];
  const media = p.video ? `<video src="${file(p.video)}" muted playsinline controls preload="metadata"></video>` : p.assets.map(k => `<img src="${file(k)}" loading="lazy" alt="">`).join('');
  return `<article class="post" data-id="${p.id}">
    <div class="head"><div><span class="label">${KIND[p.kind] || p.kind}${p.treatment ? ' · ' + esc(p.treatment) : ''}</span><br><b>${esc(p.published || p.when || '')}</b></div><span class="badge ${cls}">${st}</span></div>
    ${media ? `<div class="strip">${media}</div>` : p.status === 'render' ? '<p class="muted small" style="padding:0 14px 12px">Bilder werden gerade erstellt …</p>' : ''}
    ${p.error ? `<p class="err">${esc(p.error)}</p>` : ''}
    ${p.kind !== 'story' ? `<details><summary>Caption ${p.status === 'veroeffentlicht' ? 'ansehen' : 'ansehen / ändern'}</summary>
      ${p.status === 'veroeffentlicht' ? `<pre class="ai">${esc(p.caption)}</pre>` : `<textarea data-cap>${esc(p.caption)}</textarea><button class="btn sm" data-act="caption" style="margin-top:8px">Caption speichern</button>`}</details>` : ''}
    <div class="actions">${p.status === 'veroeffentlicht'
      ? (p.permalink ? `<a class="btn sm" href="${esc(p.permalink)}" target="_blank" rel="noopener">Auf Instagram ansehen</a>` : '')
      : `<button class="btn sm" data-act="jetzt">Jetzt posten</button>
         ${p.status === 'pausiert' || p.status === 'fehler' ? '<button class="btn sm" data-act="fortsetzen">Fortsetzen</button>' : '<button class="btn sm" data-act="pausieren">Pausieren</button>'}
         <button class="btn sm" data-act="loeschen">Löschen</button>`}</div>
  </article>`;
}

function bindPostCards() {
  view.querySelectorAll('.post').forEach(card => {
    card.onclick = async e => {
      const act = e.target.closest('[data-act]')?.dataset.act; if (!act) return;
      const id = card.dataset.id;
      try {
        if (act === 'loeschen') { if (!confirm('Diesen Beitrag wirklich löschen?')) return; await api(`/api/posts/${id}`, { method: 'DELETE' }); }
        else if (act === 'caption') await api(`/api/posts/${id}`, { method: 'PATCH', body: JSON.stringify({ caption: card.querySelector('[data-cap]').value }) });
        else {
          if (act === 'jetzt' && !confirm('Jetzt sofort veröffentlichen? (innerhalb der nächsten 15 Minuten)')) return;
          await api(`/api/posts/${id}`, { method: 'PATCH', body: JSON.stringify({ action: act }) });
        }
        toast('Gespeichert'); route();
      } catch (er) { toast(er.message); }
    };
  });
}

async function viewPlan() {
  const scope = new URLSearchParams(location.hash.split('?')[1]).get('scope') || 'kommend';
  view.innerHTML = '<p class="muted">Lädt …</p>';
  const posts = await api('/api/posts?scope=' + scope);
  view.innerHTML = `<p class="label">Redaktionsplan</p><h1>Dein <i>Plan</i></h1>
    <p class="lead">Feed: Mo, Mi, Fr abends · Stories täglich. Alles wird automatisch veröffentlicht – du bekommst eine E-Mail, sobald etwas online ist.</p>
    <div class="chips" style="margin-bottom:6px"><a class="chip" href="#plan?scope=kommend" aria-pressed="${scope === 'kommend'}" style="display:flex;align-items:center;text-decoration:none">Kommend</a>
    <a class="chip" href="#plan?scope=online" aria-pressed="${scope !== 'kommend'}" style="display:flex;align-items:center;text-decoration:none">Veröffentlicht</a></div>
    ${posts.length ? posts.map(postCard).join('') : '<div class="card empty">Hier ist noch nichts.</div>'}
    ${scope === 'kommend' ? '<button class="btn block" id="fill" style="margin-top:8px">Nächste 7 Tage automatisch auffüllen</button>' : ''}`;
  bindPostCards();
  if ($('#fill')) $('#fill').onclick = async () => { const r = await post('/api/plan/auffuellen'); toast(`${r.made} Beiträge ergänzt`); setTimeout(route, 1500); };
  if (posts.some(p => p.status === 'render')) setTimeout(() => location.hash.startsWith('#plan') && route(), 8000);
}

// ---------------- Analyse ----------------
async function viewAnalyse() {
  view.innerHTML = '<p class="muted">Lädt …</p>';
  const s = await api('/api/stats');
  const k = s.kpi;
  const max = Math.max(1, ...s.perWeek.map(w => Math.max(w.bookings, w.clicks)));
  const last = kind => s.insights.find(i => i.kind === kind);
  view.innerHTML = `<p class="label">Auswertung</p><h1>Was bringt <i>Buchungen?</i></h1>
    <div class="kpis">
      <div class="kpi"><span class="label">Buchungen · 30 T.</span><b>${k.bookings30}</b><span class="small muted">Startwert ca. ${k.baseline.toLocaleString('de-DE')}</span></div>
      <div class="kpi"><span class="label">davon Treatwell</span><b>${k.treatwell30}</b><span class="small muted">${k.other30} WhatsApp/sonstige</span></div>
      <div class="kpi"><span class="label">Klicks „Buchen“</span><b>${k.clicks30}</b><span class="small muted">${k.whatsapp30} × WhatsApp</span></div>
      <div class="kpi"><span class="label">Stornos</span><b>${k.cancelled30}</b><span class="small muted">letzte 30 Tage</span></div>
    </div>
    <div class="card"><span class="label">Letzte 12 Wochen</span>
      <div class="bars">${s.perWeek.map(w => `<div class="col" title="Woche ab ${w.week}: ${w.bookings} Buchungen, ${w.clicks} Klicks, ${w.posts} Beiträge">
        <div class="c" style="height:${(w.clicks / max) * 100}%"></div><div class="b" style="height:${(w.bookings / max) * 100}%"></div><small>${w.week.slice(8, 10)}.${w.week.slice(5, 7)}</small></div>`).join('')}</div>
      <div class="legend"><span><i style="background:var(--ink)"></i>Buchungen</span><span><i style="background:#B9A79B"></i>Buchungs-Klicks</span></div></div>

    <h2>Beiträge & Buchungen danach</h2>
    <div class="card"><p class="muted small" style="margin-bottom:6px">Buchungen innerhalb von 72 Stunden nach Veröffentlichung.</p>
      ${s.attribution.length ? `<ul class="list">${s.attribution.map(a => `<li><span>${esc(a.title || KIND[a.kind])}<br><span class="muted small">${esc(a.published)} · ${a.reach != null ? a.reach + ' Reichweite · ' + (a.saved ?? 0) + ' gespeichert' : 'Zahlen folgen'}</span></span><b>${a.bookings72h}</b></li>`).join('')}</ul>` : '<p class="empty">Sobald Beiträge online sind, siehst du hier, welche Buchungen auslösen.</p>'}</div>

    <h2>Top-Beiträge auf Instagram</h2>
    <div class="card">${s.top.length ? `<ul class="list">${s.top.map(t => `<li><a href="${esc(t.permalink)}" target="_blank" rel="noopener">${esc(t.title || t.type)}</a><span class="muted small" style="text-align:right">${t.reach} Reichw.<br>${t.saved ?? 0} gesp. · ${t.shares ?? 0} geteilt</span></li>`).join('')}</ul>
      ${s.bestSlots.length ? `<p class="small" style="margin-top:10px">Beste Zeiten bisher: ${s.bestSlots.map(b => `<b>${esc(b.slot)}</b> (Ø ${b.avgReach})`).join(', ')}</p>` : ''}` : '<p class="empty">Erscheint nach der Instagram-Verbindung (Zahlen werden täglich geholt).</p>'}
      <button class="btn sm" id="sync" style="margin-top:10px">Zahlen jetzt aktualisieren</button></div>

    <h2>KI-Analyse <span class="muted small">(sonntags automatisch)</span></h2>
    <div class="card">${last('analyse') ? `<pre class="ai">${esc(last('analyse').content)}</pre><p class="muted small">Stand: ${esc(last('analyse').created_at)}</p>` : '<p class="muted">Noch keine Analyse.</p>'}
      <button class="btn sm" id="an" style="margin-top:10px">Jetzt analysieren</button></div>

    <h2>Trend-Radar <span class="muted small">(montags automatisch)</span></h2>
    <div class="card">${last('trends') ? `<pre class="ai">${esc(last('trends').content)}</pre><p class="muted small">Stand: ${esc(last('trends').created_at)}</p>` : '<p class="muted">Noch keine Trends abgerufen.</p>'}
      <button class="btn sm" id="tr" style="margin-top:10px">Trends jetzt abrufen</button></div>

    <h2>Letzte Buchungen</h2>
    <div class="card">${s.recentBookings.length ? `<ul class="list">${s.recentBookings.map(b => `<li><span>${esc(b.treatment || 'Behandlung unbekannt')}<br><span class="muted small">${esc(b.when)} · ${esc(b.source)}${b.status === 'storniert' ? ' · storniert' : ''}</span></span>${b.source !== 'treatwell' ? `<button class="btn sm" data-del="${b.id}">Entfernen</button>` : ''}</li>`).join('')}</ul>` : '<p class="empty">Treatwell-Buchungen erscheinen automatisch, sobald die Gmail-Verbindung eingerichtet ist.</p>'}
      <button class="btn sm" id="wa" style="margin-top:10px">+ WhatsApp-/Telefon-Buchung</button></div>`;
  const busy = (btn, fn) => async () => { btn.disabled = true; btn.textContent = 'Einen Moment …'; try { await fn(); route(); } catch (e) { toast(e.message, 6000); btn.disabled = false; } };
  $('#sync').onclick = busy($('#sync'), () => post('/api/instagram/sync'));
  $('#an').onclick = busy($('#an'), () => post('/api/analyse'));
  $('#tr').onclick = busy($('#tr'), () => post('/api/trends'));
  $('#wa').onclick = quickBooking;
  view.querySelectorAll('[data-del]').forEach(b => (b.onclick = async () => { await api('/api/bookings/' + b.dataset.del, { method: 'DELETE' }); route(); }));
}

// ---------------- Einstellungen ----------------
async function viewSettings() {
  view.innerHTML = '<p class="muted">Lädt …</p>';
  const [s, ig, st] = await Promise.all([api('/api/settings'), api('/api/instagram'), api('/api/storage')]);
  const q = new URLSearchParams(location.hash.split('?')[1]);
  if (q.get('ig') === 'ok') toast('Instagram ist verbunden!');
  if (q.get('ig') === 'fehler') toast('Instagram-Verbindung fehlgeschlagen: ' + (q.get('grund') || 'bitte Werte prüfen'), 9000);
  view.innerHTML = `<p class="label">Einstellungen</p><h1>Alles <i>verbinden</i></h1>

    <h2>1 · Instagram</h2>
    <div class="card">${ig.connected
      ? `<p>✓ Verbunden mit <b>@${esc(ig.username)}</b>. Zugang wird automatisch erneuert.</p><a class="btn sm" href="/auth/instagram/start" style="margin-top:10px">Neu verbinden</a>`
      : `<p class="muted small">Aus deiner Meta-App (developers.facebook.com) diese drei Werte eintragen, speichern und verbinden.</p>
        <label class="field"><span>App-ID</span><input type="text" id="fb_app_id" value="${esc(s.fb_app_id)}" inputmode="numeric" placeholder="z. B. 981999657900172"></label>
        <label class="field"><span>App-Geheimcode</span><input type="password" id="fb_app_secret" value="${esc(s.fb_app_secret)}" placeholder="App-Einstellungen → Allgemein"></label>
        <label class="field"><span>Konfigurations-ID</span><input type="text" id="ig_config_id" value="${esc(s.ig_config_id)}" inputmode="numeric" placeholder="z. B. 2179351419361619"></label>
        <p class="muted small">Weiterleitungs-URL (bei Meta schon eingetragen):<br><code>${esc(s.igRedirect)}</code></p>
        <div class="row" style="margin-top:10px"><button class="btn sm" data-save="fb_app_id,fb_app_secret,ig_config_id">Speichern</button><a class="btn sm primary" href="/auth/instagram/start">Mit Instagram verbinden</a></div>
        <details style="margin-top:16px"><summary class="small"><b>Alternative:</b> Zugriffstoken direkt eintragen</summary>
          <p class="muted small" style="margin:8px 0">Falls die Anmeldung über Facebook nicht klappt: In Meta bei „2. Zugriffstokens generieren“ dein Konto hinzufügen, den angezeigten Token kopieren und hier einfügen.</p>
          <textarea id="ig_token_manual" style="min-height:90px" placeholder="Token hier einfügen"></textarea>
          <button class="btn sm primary" id="ig_token_save" style="margin-top:8px">Token prüfen & verbinden</button></details>`}</div>

    <h2>2 · Gemini (Texte, Trends, Analyse)</h2>
    <div class="card"><p class="muted small">Kostenloser Schlüssel von aistudio.google.com → „Get API key“. Kundinnen-Fotos werden nie an Gemini geschickt.</p>
      <label class="field"><span>Gemini API-Schlüssel</span><input type="password" id="gemini_key" value="${esc(s.gemini_key)}"></label>
      <button class="btn sm" data-save="gemini_key">Speichern</button></div>

    <h2>3 · Gmail (Treatwell-Buchungen & E-Mail-Benachrichtigung)</h2>
    <div class="card"><ol class="steps">
      <li>Am Computer <b>script.google.com</b> öffnen → „Neues Projekt“.</li>
      <li>Alles löschen und diesen Code einfügen: <button class="btn sm" data-copy-code>Code kopieren</button></li>
      <li>Speichern, oben die Funktion <b>einrichten</b> auswählen → „Ausführen“ → Zugriff erlauben.</li>
      <li>Fertig: Neue Treatwell-Buchungen erscheinen automatisch, und du bekommst eine E-Mail, sobald etwas online ist.</li></ol>
      <details><summary class="muted small">Code ansehen</summary><pre class="code">${esc(s.appsScript)}</pre></details></div>

    <h2>4 · Dein Link für die Instagram-Bio</h2>
    <div class="card"><p><code>${esc(s.bioUrl)}</code></p><p class="muted small">Diesen Link in Instagram unter „Profil bearbeiten → Links“ eintragen. So siehst du, wie viele über Instagram zur Buchung gehen.</p>
      <div class="row" style="margin-top:8px"><button class="btn sm" data-copy="${esc(s.bioUrl)}">Kopieren</button><a class="btn sm" href="/b" target="_blank">Ansehen</a></div></div>

    <h2>5 · Startwert</h2>
    <div class="card"><label class="field"><span>Buchungen pro Monat vor der App</span><input type="number" step="0.5" id="baseline_bookings" value="${esc(s.baseline_bookings || '3.5')}"></label>
      <button class="btn sm" data-save="baseline_bookings">Speichern</button></div>

    <h2>Kosten</h2>
    <div class="card"><p><b>0 €</b> – alles läuft im kostenlosen Tarif.</p>
      <p class="muted small">Bildspeicher: ${(st.used / 1024 ** 3).toLocaleString('de-DE', { maximumFractionDigits: 2 })} GB von 8 GB belegt (kostenlos bis 10 GB). Ab 8 GB nimmt die App keine Uploads mehr an. Alte Dateien werden automatisch aufgeräumt.</p>
      <div class="progress"><div style="width:${Math.min(100, (st.used / st.limit) * 100)}%"></div></div></div>

    <h2>Konto</h2>
    <div class="card"><label class="field"><span>Aktuelles Passwort</span><input type="password" id="pw_cur" autocomplete="current-password"></label>
      <label class="field"><span>Neues Passwort (min. 10 Zeichen)</span><input type="password" id="pw_new" autocomplete="new-password"></label>
      <div class="row"><button class="btn sm" id="pw">Passwort ändern</button><button class="btn sm" id="out">Abmelden</button></div></div>
    <p class="muted small" style="margin-top:14px">Tipp fürs iPhone: In Safari auf „Teilen“ → „Zum Home-Bildschirm“ – dann öffnet sich die App wie eine echte App.</p>`;

  view.querySelectorAll('[data-save]').forEach(b => (b.onclick = async () => {
    const body = Object.fromEntries(b.dataset.save.split(',').map(k => [k, $('#' + k).value]));
    try { await post('/api/settings', body); toast('Gespeichert'); } catch (e) { toast(e.message); }
  }));
  view.querySelectorAll('[data-copy]').forEach(b => (b.onclick = () => navigator.clipboard.writeText(b.dataset.copy).then(() => toast('Kopiert'))));
  if ($('#ig_token_save')) $('#ig_token_save').onclick = async () => {
    try { const r = await post('/api/instagram/token', { token: $('#ig_token_manual').value }); toast('Verbunden mit @' + r.username); route(); } catch (e) { toast(e.message, 8000); }
  };
  $('[data-copy-code]').onclick = () => navigator.clipboard.writeText(s.appsScript).then(() => toast('Code kopiert'));
  $('#pw').onclick = async () => { try { await post('/api/password', { current: $('#pw_cur').value, next: $('#pw_new').value }); toast('Passwort geändert'); } catch (e) { toast(e.message); } };
  $('#out').onclick = async () => { await api('/api/logout'); showLogin(); };
}

// ---------------- Router ----------------
const ROUTES = { start: viewStart, hochladen: viewUpload, plan: viewPlan, analyse: viewAnalyse, einstellungen: viewSettings };
async function route() {
  const name = (location.hash.slice(1).split('?')[0]) || 'start';
  document.querySelectorAll('.tabs a').forEach(a => a.classList.toggle('active', a.dataset.tab === name));
  window.scrollTo(0, 0);
  try { await (ROUTES[name] || viewStart)(); } catch (e) { if (e.message !== 'Bitte anmelden') view.innerHTML = `<div class="card">Fehler: ${esc(e.message)}</div>`; }
}

async function start() {
  try {
    const me = await api('/api/me');
    TREATMENTS = me.treatments;
    $('#tabs').hidden = false;
    route();
  } catch { /* Login wird angezeigt */ }
}
window.addEventListener('hashchange', route);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
start();
