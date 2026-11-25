import { correctPhoto } from './photo.js';
import { muteVideo, combineBeforeAfter, videoWithText, frameFromVideo, TRACKS } from './video.js';


const $ = (s, el = document) => el.querySelector(s);
const view = $('#view');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let TREATMENTS = {};
let HOOKS = {};

function toast(msg, ms = 3200) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), ms);
}

async function api(path, opts = {}) {
  let res;
  try {
    res = await fetch(path, { credentials: 'same-origin', ...opts, headers: { ...(opts.body && !(opts.body instanceof Blob) ? { 'content-type': 'application/json' } : {}), ...(opts.headers || {}) } });
  } catch (e) {
    throw new Error('Keine Verbindung zum Server – bitte Internet prüfen und erneut versuchen.');
  }
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
    <a class="btn block" href="#aktion" style="margin-top:8px">✦ Eigene Aktion planen (z. B. Black Friday)</a>
    <a class="btn block" href="#bewertung" style="margin-top:8px">★ Kundin um Google-Bewertung bitten</a>
    <h2>Filmideen <i>diese Woche</i></h2>
    <div class="card">${(() => { const f = s.insights.find(i => i.kind === 'filmideen'); return f
      ? `<p class="muted small">Reels bringen die meiste Reichweite. Einfach beim nächsten Termin filmen und hochladen.</p><pre class="ai" style="margin-top:8px">${esc(f.content)}</pre>`
      : '<p class="muted small">Kommt jeden Montag automatisch (sobald der Gemini-Schlüssel eingetragen ist).</p>'; })()}
      <button class="btn sm" id="fi" style="margin-top:10px">Neue Ideen</button></div>
    <h2>Als Nächstes</h2>
    ${next.length ? next.map(postCard).join('') : '<div class="card empty">Noch nichts geplant. Lade Material hoch oder fülle den Plan auf.</div>'}
    <a class="btn block" href="#plan" style="margin-top:6px">Ganzen Plan ansehen</a>`;
  $('#wa').onclick = () => quickBooking();
  $('#fi').onclick = async () => { $('#fi').disabled = true; $('#fi').textContent = 'Einen Moment …'; try { await post('/api/filmideen'); route(); } catch (e) { toast(e.message, 6000); $('#fi').disabled = false; $('#fi').textContent = 'Neue Ideen'; } };
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
  { role: 'video', t: 'Video', h: 'ab 3 Sek., hochkant · Ton wird entfernt', video: true },
];

const OWN_SLOTS = [
  { role: 'ich-1', t: 'Foto von mir', h: 'Porträt, gern bei der Arbeit' },
  { role: 'ich-2', t: 'Noch eins', h: 'optional' },
  { role: 'studio-1', t: 'Homestudio', h: 'Raum, Liege, Licht' },
  { role: 'studio-2', t: 'Studio-Detail', h: 'optional, z. B. Pigmente, Deko' },
  { role: 'studio-3', t: 'Studio-Detail', h: 'optional' },
];

async function viewUpload() {
  const approved = ((await api('/api/settings')).music_approved || '').split(',').filter(Boolean);
  const mode = new URLSearchParams(location.hash.split('?')[1]).get('modus') === 'eigen' ? 'eigen' : 'kundin';
  const own = mode === 'eigen';
  const slots = own ? OWN_SLOTS : SLOTS;
  const MUSIC = TRACKS.filter(t => approved.includes(t.id));
  const state = { treatment: 'powder-brows', files: {}, originals: {}, smooth: true, edit: !own, music: 'trend', ba: {}, baLabel: 'Direkt danach' }; // Standard: Sound selbst in Instagram wählen
  view.innerHTML = `
    <p class="label">Neues Material</p>
    <h1>Hochladen & <i>fertig.</i></h1>
    <p class="lead">Die App korrigiert das Licht, erstellt Beitrag, Story und Caption und plant alles automatisch ein.</p>
    <div class="chips" style="margin-bottom:4px">
      <a class="chip" href="#hochladen" aria-pressed="${!own}" style="display:flex;align-items:center;text-decoration:none">Kundin</a>
      <a class="chip" href="#hochladen?modus=eigen" aria-pressed="${own}" style="display:flex;align-items:center;text-decoration:none">Ich & Homestudio</a></div>
    <div ${own ? 'hidden' : ''}><h2>Behandlung</h2>
    <div class="chips" id="chips">${Object.entries(TREATMENTS).map(([k, v]) => `<button class="chip" data-k="${k}" aria-pressed="${k === state.treatment}">${esc(v)}</button>`).join('')}</div></div>
    <h2>${own ? 'Fotos von dir & deinem Studio' : 'Fotos & Video'}</h2>
    ${own ? '<p class="muted small" style="margin-bottom:10px">Daraus entsteht je ein persönlicher Beitrag zu einem deiner Werte bzw. ein Studio-Beitrag plus eine Story – nur dann, wenn du hier Fotos hochlädst.</p>' : ''}
    <div class="slots">${slots.map(s => `<label class="slot" data-role="${s.role}"><span class="t">${s.t}</span><span class="h">${s.h}</span>
      <input type="file" accept="${s.video ? 'video/*' : 'image/*'}"></label>`).join('')}</div>
    <div class="card" ${own ? 'hidden' : ''} style="margin-top:12px"><span class="label">Vorher / Nachher als Video</span>
      <p class="muted small" style="margin:4px 0 10px">Zwei Videos → ein Reel: erst „Vorher“, weicher Übergang, dann das Ergebnis. Ideal für Lippen & Brauen.</p>
      <div class="slots baslots">
        <label class="slot" data-ba="vb"><span class="t">Vorher-Video</span><span class="h">ca. 3–12 Sek.</span><input type="file" accept="video/*"></label>
        <label class="slot" data-ba="va"><span class="t">Nachher-Video</span><span class="h">ca. 3–15 Sek.</span><input type="file" accept="video/*"></label></div>
      <div class="chips" id="balabel" style="margin-top:10px"><button class="chip" data-v="Direkt danach" aria-pressed="true">Nachher = Direkt danach</button><button class="chip" data-v="Abgeheilt" aria-pressed="false">Nachher = Abgeheilt</button></div>
      <p class="muted small" id="bainfo" style="margin-top:8px">Das Zusammensetzen dauert auf dem iPhone ca. 1–3 Minuten – App dabei bitte geöffnet lassen.</p></div>
    <label class="check" style="background:var(--card);border:1px solid var(--line)"><input type="checkbox" id="edit" ${own ? '' : 'checked'}>
      <span><b>Bilder bearbeiten</b> – Licht & Farbe angleichen<br><span class="muted small">Aus: Fotos bleiben genau so, wie sie sind (z. B. bereits professionell bearbeitet).</span></span></label>
    <label class="check" id="smoothbox" style="background:var(--card);border:1px solid var(--line)" ${own ? 'hidden' : ''}><input type="checkbox" id="smooth" checked>
      <span><b>Profi-Look</b> – Haut dezent glätten, Details schärfen<br><span class="muted small" id="smoothinfo"></span></span></label>
    <p class="muted small" style="margin-top:8px">Tipp: immer gleicher Winkel auf der Liege, Gesicht mittig, kein Filter.</p>
    <label class="field" ${own ? 'hidden' : ''}><span>Notiz (optional, ohne Namen)</span><input type="text" id="note" placeholder="z. B. Korrektur alter Brauen, sehr natürlich gewünscht"></label>
    <div class="card" id="musicpick" hidden><span class="label">Musik zum Video</span>
      <p class="muted small" style="margin:4px 0 10px">Der Originalton wird immer entfernt.${MUSIC.length ? '' : ' Eigene NMY-Musik kannst du unter <a href="#einstellungen">Mehr → Musik</a> anhören und freigeben.'}</p>
      <div class="chips" id="tracks">${[...MUSIC, { id: 'trend', name: '🎵 Trend-Sound in Instagram' }, { id: '', name: 'Ohne Musik' }].map(t => `<button class="chip" data-t="${t.id}" aria-pressed="${t.id === state.music}">${t.name}</button>`).join('')}</div>
      <p class="muted small" id="trendinfo" hidden style="margin-top:8px">Du bekommst zur Sendezeit eine Nachricht, öffnest das Video mit einem Tipp in Instagram und wählst dort den Sound. <b>Abmahnsicher:</b> Sounds aus der Meta Sound Collection bzw. ruhige Instrumentals ohne bekannten Interpreten. <b>Nicht:</b> bekannte Chart-Hits oder „Originalton“ anderer Accounts.</p>
      <audio id="preview" controls preload="none" style="width:100%;margin-top:10px"></audio>
      <p class="label" style="margin-top:14px">Text im Video</p>
      <p class="muted small" style="margin:4px 0 8px">Wird in den ersten Sekunden ein- und ausgeblendet. Leer lassen = ohne Schrift.</p>
      <div class="chips" id="hookchips"></div>
      <input type="text" id="vtext" maxlength="80" style="margin-top:8px" placeholder="z. B. Frische Lippen – ohne Lippenstift.">
      <button class="btn sm" id="vtextapply" style="margin-top:8px">Text ins Video übernehmen</button>
      <label class="check" style="margin-top:12px;background:none;padding:0"><input type="checkbox" id="cover" checked><span><b>Startbild erstellen</b> – Titelbild im NMY-Look, passend zu deinem Feed</span></label>
      <p class="label" style="margin-top:12px">Vorschau fertiges Video</p>
      <video id="vprev" controls playsinline style="width:100%;max-height:420px;border-radius:12px;background:#000;margin-top:6px" hidden></video></div>
    <label class="check" id="musicbox" hidden><input type="checkbox" id="music"><span><b>Ton ist stumm:</b> Ich habe das Video in der Fotos-App stummgeschaltet (Bearbeiten → Lautsprecher-Symbol). <span class="muted small">Videos werden immer ohne Originalton veröffentlicht.</span></span></label>
    <label class="check" ${own ? 'hidden' : ''}><input type="checkbox" id="consent"><span>Die Kundin hat schriftlich eingewilligt, dass diese Fotos/Videos auf Instagram veröffentlicht werden.</span></label>
    <button class="btn primary block" id="go" disabled>Hochladen & Beiträge erstellen</button>
    <div id="prog" hidden><div class="progress"><div></div></div><p class="muted small" id="progtxt"></p></div>`;

  const ZONE = { 'powder-brows': 'Brauen', browlifting: 'Brauen', 'lip-blush': 'Lippen', lashlifting: 'Augen & Wimpern' };
  const info = () => {
    const z = ZONE[state.treatment];
    if (own) { $('#smoothinfo').textContent = 'Porträts: Haut dezent geglättet, Augen und Lippen bleiben scharf. Studiofotos: Licht und Schärfe.'; return; }
    $('#smoothinfo').textContent = state.treatment === 'microneedling'
      ? 'Bei Microneedling wird die Haut nicht geglättet – sie ist ja das Ergebnis. Licht und Schärfe werden trotzdem optimiert.'
      : `Die ${z} bleiben unverändert (echtes Ergebnis). Vorher und Nachher werden gleich bearbeitet.`;
  };
  info();
  const processPhoto = async (role) => {
    const slot = view.querySelector(`.slot[data-role="${role}"]`);
    const f = state.originals[role]; if (!f) return;
    slot.querySelectorAll('img,.tag,.h.busy').forEach(n => n.remove());
    slot.insertAdjacentHTML('beforeend', '<span class="h busy">Foto wird bearbeitet …</span>');
    try {
      const out = await correctPhoto(f, { treatment: own ? (role.startsWith('ich') ? 'portrait' : 'studio') : state.treatment, smooth: state.smooth, edit: state.edit });
      state.files[role] = out;
      slot.querySelector('.h.busy')?.remove();
      const what = out.original ? 'unbearbeitet' : out.smoothed ? 'Profi-Look' : out.face || !state.smooth || state.treatment === 'microneedling' || role.startsWith('studio') ? 'Licht & Schärfe' : 'Licht & Schärfe · kein Gesicht erkannt';
      slot.insertAdjacentHTML('beforeend', `<img src="${out.preview}" alt=""><span class="tag">${slot.querySelector('.t').textContent} · ${what}</span>`);
    } catch (e) { slot.querySelector('.h.busy')?.remove(); toast('Foto konnte nicht gelesen werden: ' + e.message); }
    check();
  };
  const vtext = () => $('#vtext').value.trim();
  const renderHooks = () => {
    const hs = HOOKS[state.treatment] || [];
    $('#hookchips').innerHTML = hs.map(h => `<button class="chip" data-h="${esc(h)}">${esc(h.replace(/_/g, ''))}</button>`).join('');
    if (!$('#vtext').dataset.touched) $('#vtext').value = (hs[0] || '').replace(/_/g, '');
  };
  renderHooks();
  $('#hookchips').onclick = e => { const b = e.target.closest('[data-h]'); if (!b) return; $('#vtext').value = b.dataset.h.replace(/_/g, ''); $('#vtext').dataset.touched = '1'; };
  $('#vtext').oninput = () => ($('#vtext').dataset.touched = '1');
  const processVideo = async () => {
    if (state.files.video?.ba) { toast('Es wird das Vorher/Nachher-Reel verwendet.', 4000); return; }
    const { f, duration, secs, tag } = state.videoOriginal;
    const music = state.music && state.music !== 'trend' ? state.music : null;
    $('#go').disabled = true;
    const muted = await videoWithText(f, { text: vtext(), label: TREATMENTS[state.treatment], duration, music }, t => { tag.textContent = t; });
    state.files.video = { file: muted, video: true, duration, muted: true };
    tag.textContent = `Video${secs} · ${music ? 'Musik „' + TRACKS.find(t => t.id === music).name + '“' : state.music === 'trend' ? 'Trend-Sound in Instagram' : 'ohne Ton'} ✓`;
    const vp = $('#vprev'); if (vp.src) URL.revokeObjectURL(vp.src); vp.src = URL.createObjectURL(muted); vp.hidden = false;
    check();
  };
  const processBA = async () => {
    const { vb, va } = state.ba; if (!vb || !va) return;
    const tags = ['vb', 'va'].map(k => view.querySelector(`[data-ba="${k}"] .tag`));
    const say = t => tags.forEach(x => x && (x.textContent = t));
    $('#go').disabled = true;
    const music = state.music && state.music !== 'trend' ? state.music : null;
    const out = await combineBeforeAfter(vb.f, va.f, { durBefore: vb.duration, durAfter: va.duration, afterLabel: state.baLabel, music, text: vtext(), label: TREATMENTS[state.treatment] }, say);
    state.files.video = { file: out.file, video: true, duration: out.duration, muted: true, ba: true };
    say(`Reel ${Math.round(out.duration)} Sek. ✓`);
    const vp = $('#vprev'); if (vp.src) URL.revokeObjectURL(vp.src); vp.src = URL.createObjectURL(out.file); vp.hidden = false;
    check();
  };
  const reprocessAll = async () => { for (const role of Object.keys(state.originals)) await processPhoto(role); };
  $('#chips').onclick = e => {
    const b = e.target.closest('.chip'); if (!b) return;
    state.treatment = b.dataset.k;
    view.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c === b));
    info(); reprocessAll(); renderHooks();
  };
  $('#smooth').onchange = () => { state.smooth = $('#smooth').checked; reprocessAll(); };
  $('#edit').onchange = () => { state.edit = $('#edit').checked; $('#smoothbox').hidden = !state.edit; reprocessAll(); };
  const setPreview = () => {
    const a = $('#preview'); const real = state.music && state.music !== 'trend';
    if (real) { a.src = `/musik/${state.music}.m4a`; a.hidden = false; } else { a.removeAttribute('src'); a.hidden = true; }
    $('#trendinfo').hidden = state.music !== 'trend';
  };
  setPreview();
  $('#tracks').onclick = async e => {
    const b = e.target.closest('.chip'); if (!b) return;
    state.music = b.dataset.t;
    view.querySelectorAll('#tracks .chip').forEach(c => c.setAttribute('aria-pressed', c === b));
    setPreview();
    if (state.ba.vb && state.ba.va) {
      try { await processBA(); } catch (er) { toast('Video konnte nicht erstellt werden: ' + er.message, 7000); }
    } else if (state.videoOriginal && state.files.video?.muted) {
      $('#go').disabled = true;
      try { await processVideo(); } catch (er) { toast('Musik konnte nicht unterlegt werden: ' + er.message, 6000); }
    }
  };
  const check = () => {
    const needsConfirm = !!state.files.video && !state.files.video.muted;
    $('#musicbox').hidden = !needsConfirm;
    $('#go').disabled = !((own || $('#consent').checked) && Object.keys(state.files).length && (!needsConfirm || $('#music').checked));
  };
  $('#consent').onchange = check;
  $('#music').onchange = check;
  // Vorher-/Nachher-Videos
  const videoDuration = f => new Promise(res => {
    const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true; v.playsInline = true;
    v.onloadedmetadata = () => res(isFinite(v.duration) ? v.duration : null); v.onerror = () => res(null); v.src = URL.createObjectURL(f);
    setTimeout(() => res(null), 8000);
  });
  view.querySelectorAll('[data-ba]').forEach(slot => {
    const input = slot.querySelector('input');
    input.onchange = async () => {
      const f = input.files[0]; if (!f) return;
      const duration = await videoDuration(f);
      if (duration != null && duration < 2) { toast('Bitte ein Video ab 2 Sekunden wählen.'); input.value = ''; return; }
      slot.querySelectorAll('video,.tag').forEach(n => n.remove());
      slot.insertAdjacentHTML('beforeend', `<video src="${URL.createObjectURL(f)}" muted playsinline></video><span class="tag">${duration ? Math.round(duration) + ' Sek.' : 'Video'}</span>`);
      slot.classList.add('filled');
      state.ba[slot.dataset.ba] = { f, duration };
      $('#musicpick').hidden = false;
      if (state.ba.vb && state.ba.va) {
        if (state.videoOriginal) toast('Das Vorher/Nachher-Reel ersetzt das einzelne Video.', 5000);
        try { await processBA(); } catch (e) { console.warn(e); toast('Vorher/Nachher-Video konnte auf diesem Handy nicht erstellt werden: ' + e.message, 9000); }
      }
    };
  });
  $('#vtextapply').onclick = async () => {
    $('#vtext').dataset.touched = '1';
    try {
      if (state.ba.vb && state.ba.va) await processBA();
      else if (state.videoOriginal) await processVideo();
      else toast('Bitte zuerst ein Video wählen.');
    } catch (e) { toast('Text konnte nicht eingefügt werden: ' + e.message, 7000); }
  };
  $('#balabel').onclick = async e => {
    const b = e.target.closest('.chip'); if (!b) return;
    state.baLabel = b.dataset.v; view.querySelectorAll('#balabel .chip').forEach(c => c.setAttribute('aria-pressed', c === b));
    if (state.ba.vb && state.ba.va) { try { await processBA(); } catch (er) { toast(er.message, 7000); } }
  };
  view.querySelectorAll('.slots:not(.baslots) .slot').forEach(slot => {
    const input = slot.querySelector('input');
    input.onchange = async () => {
      const f = input.files[0]; if (!f) return;
      const role = slot.dataset.role;
      slot.querySelectorAll('img,video,.tag').forEach(n => n.remove());
      if (role === 'video') {
        if (f.size > 1024 * 1024 * 1024) { toast('Video zu groß (max. 1 GB)'); return; }
        const src = URL.createObjectURL(f);
        const duration = await new Promise(res => {
          const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true; v.playsInline = true;
          v.onloadedmetadata = () => res(isFinite(v.duration) ? v.duration : null); v.onerror = () => res(null); v.src = src;
          setTimeout(() => res(null), 8000);
        });
        if (duration != null && duration < 3) { toast('Instagram nimmt Videos erst ab 3 Sekunden an – bitte ein etwas längeres Video wählen.', 6000); input.value = ''; return; }
        const secs = duration ? ` · ${Math.round(duration)} Sek.` : '';
        slot.insertAdjacentHTML('beforeend', `<video src="${src}" muted playsinline></video><span class="tag">Ton wird entfernt …</span>`);
        const tag = slot.querySelector('.tag');
        state.videoOriginal = { f, duration, secs, tag };
        $('#musicpick').hidden = false;
        try {
          await processVideo();
        } catch (e) {
          console.warn(e);
          // Ohne automatische Stummschaltung nur nach ausdrücklicher Bestätigung
          state.files[role] = { file: f, video: true, duration, muted: false };
          tag.textContent = `Video${secs} · Ton nicht entfernt`;
          toast('Der Ton konnte auf diesem Handy nicht automatisch entfernt werden. Bitte das Video in der Fotos-App stummschalten (Bearbeiten → Lautsprecher-Symbol antippen → Fertig) und dann bestätigen.', 9000);
        }
      } else {
        state.originals[role] = f;
        await processPhoto(role);
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
      const set = await post('/api/sets', own ? { treatment: 'ich-studio', note: '', consent: true } : { treatment: state.treatment, note: $('#note').value, consent: $('#consent').checked });
      const entries = Object.entries(state.files);
      for (const [i, [role, f]] of entries.entries()) {
        const base = i / entries.length, span = 1 / entries.length;
        if (f.video) await uploadVideo(set.id, f.file, f.duration, f.muted ? 'auto' : 'bestaetigt', p => setP((base + p * span) * 0.85, `Video wird hochgeladen … ${Math.round(p * 100)} %`));
        else {
          setP(base * 0.85, `Foto „${role}“ wird hochgeladen …`);
          await api(`/api/media?set=${set.id}&role=${role.split('-')[0]}&w=${f.width}&h=${f.height}&edit=${f.original ? 'original' : f.smoothed ? 'profi' : 'licht'}`, { method: 'PUT', body: f.blob, headers: { 'content-type': 'image/jpeg' } });
        }
      }
      if (state.files.video && $('#cover').checked) {
        setP(0.88, 'Startbild wird erstellt …');
        try {
          const src = state.files.video.ba ? state.ba.va.f : state.videoOriginal.f;
          const dur = state.files.video.ba ? state.ba.va.duration : state.videoOriginal.duration;
          const frame = await frameFromVideo(src, Math.min(1.2, (dur || 3) / 3));
          const c = await correctPhoto(frame, { edit: true, smooth: false, treatment: 'studio' });
          await api(`/api/media?set=${set.id}&role=cover&w=${c.width}&h=${c.height}&edit=licht`, { method: 'PUT', body: c.blob, headers: { 'content-type': 'image/jpeg' } });
        } catch (e) { console.warn('Startbild', e); }
      }
      setP(0.9, 'Beiträge werden erstellt …');
      const r = await post(`/api/sets/${set.id}/planen`, { manual: !!state.files.video && state.music === 'trend', coverText: vtext(), ba: !!state.files.video?.ba });
      setP(1, 'Fertig!');
      toast(`${r.created.length} Beiträge erstellt und eingeplant.`, 4500);
      setTimeout(() => (location.hash = '#plan'), 900);
    } catch (e) {
      toast('Fehler: ' + e.message, 6000); btn.disabled = false;
    }
  };
}

async function uploadVideo(setId, f, duration, muted, onProgress) {
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
  return post('/api/media/mpu/complete', { id, key, uploadId, parts, set: setId, mime: f.type || 'video/mp4', size: f.size, duration, muted });
}


// ---------------- Eigene Aktion ----------------
const todayStr = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

async function viewAktion() {
  const approved = ((await api('/api/settings')).music_approved || '').split(',').filter(Boolean);
  const MUSIC = TRACKS.filter(t => approved.includes(t.id));
  const st = { kind: 'story', content: 'bild', repeat: 'taeglich', media: null, music: 'trend', file: null, aiCaption: false };
  view.innerHTML = `
    <p class="label">Eigene Aktion</p>
    <h1>Du bestimmst, <i>was</i> und <i>wann.</i></h1>
    <p class="lead">Z. B. Black Friday: dein eigenes Bild oder Video, täglich in der Story bis zu einem Datum – die App postet automatisch.</p>
    <label class="field"><span>Name der Aktion</span><input type="text" id="a_title" placeholder="z. B. Black Friday" maxlength="60"></label>
    <h2>Was soll gepostet werden?</h2>
    <div class="chips" id="a_kind">
      <button class="chip" data-v="story" aria-pressed="true">Story</button>
      <button class="chip" data-v="post" aria-pressed="false">Beitrag (Feed)</button>
      <button class="chip" data-v="reel" aria-pressed="false">Reel</button></div>
    <h2>Inhalt</h2>
    <div class="chips" id="a_content">
      <button class="chip" data-v="bild" aria-pressed="true">Eigenes Bild</button>
      <button class="chip" data-v="video" aria-pressed="false">Eigenes Video</button>
      <button class="chip" data-v="text" aria-pressed="false">Nur Text (NMY-Stil)</button></div>
    <div id="a_media" style="margin-top:12px">
      <label class="slot" style="aspect-ratio:9/16;max-width:220px"><span class="t" id="a_slot_t">Bild wählen</span><span class="h" id="a_slot_h">fertig gestaltet, wird nicht beschnitten</span><input type="file" id="a_file" accept="image/*"></label>
      <label class="check" id="a_editbox" style="background:var(--card);border:1px solid var(--line)"><input type="checkbox" id="a_edit"><span><b>Bild bearbeiten</b> – Licht & Farbe angleichen<br><span class="muted small">Aus lassen, wenn dein Bild schon fertig gestaltet ist.</span></span></label>
      <div class="card" id="a_musicbox" hidden><span class="label">Musik zum Video</span>
        <p class="muted small" style="margin:4px 0 10px">Du entscheidest: Originalton behalten, eigene NMY-Musik, Trend-Sound in Instagram oder ganz ohne Ton.</p>
        <div class="chips" id="a_music">${[{ id: 'original', name: '🔊 Originalton behalten' }, ...MUSIC, { id: 'trend', name: '🎵 Trend-Sound in Instagram' }, { id: '', name: 'Ohne Ton' }].map(t => `<button class="chip" data-t="${t.id}" aria-pressed="${t.id === 'trend'}">${t.name}</button>`).join('')}</div>
        <label class="check" id="a_origbox" hidden><input type="checkbox" id="a_orig"><span><b>Ton ist sauber:</b> Im Video ist nur eigener Ton (z. B. meine Stimme) oder Musik, für die ich eine Lizenz habe – kein Radio, kein Spotify, keine fremden Songs.</span></label>
        <p class="muted small" id="a_trendinfo" style="margin-top:8px">Trend-Sound heißt: Du bekommst an jedem Tag eine Nachricht und postest selbst mit einem Tipp. Für tägliche Stories lieber NMY-Musik oder ohne Musik – dann läuft alles automatisch.</p>
        <video id="a_vprev" controls playsinline style="width:100%;max-height:420px;border-radius:12px;background:#000;margin-top:10px" hidden></video></div>
    </div>
    <div id="a_textbox" hidden>
      <label class="field"><span>Überschrift</span><input type="text" id="a_head" maxlength="70" placeholder="z. B. Black _Friday_ bei NMY"></label>
      <label class="field"><span>Text</span><textarea id="a_body" style="min-height:90px" maxlength="180" placeholder="z. B. Nur vom 27.–30.11.: …"></textarea></label>
      <label class="field"><span>Button</span><input type="text" id="a_pill" maxlength="28" value="Link in der Bio"></label>
      <p class="muted small">Tipp: Ein Wort mit _Unterstrichen_ wird kursiv hervorgehoben.</p></div>
    <div id="a_capbox" hidden>
      <h2>Caption</h2>
      <textarea id="a_caption" placeholder="Text unter dem Beitrag …"></textarea>
      <button class="btn sm" id="a_ai" style="margin-top:8px">✨ Von Gemini vorschlagen lassen</button>
      <p class="muted small" style="margin-top:6px">Angebote und Zeiträume übernimmt die KI nur, wenn du sie oben im Text oder hier selbst nennst.</p></div>
    <h2>Wann?</h2>
    <div class="chips" id="a_repeat">
      <button class="chip" data-v="taeglich" aria-pressed="true">Täglich von … bis …</button>
      <button class="chip" data-v="einmal" aria-pressed="false">Einmal an einem Tag</button></div>
    <div class="row" style="margin-top:10px;gap:10px">
      <label class="field" style="flex:1;margin:0"><span id="a_startlbl">Von</span><input type="date" id="a_start" value="${todayStr()}"></label>
      <label class="field" style="flex:1;margin:0" id="a_endwrap"><span>Bis</span><input type="date" id="a_end" value="${todayStr()}"></label></div>
    <label class="field"><span>Uhrzeit</span><input type="time" id="a_time" value="10:00"></label>
    <p class="muted small" id="a_hint"></p>
    <label class="check"><input type="checkbox" id="a_consent"><span>Falls Kundinnen zu sehen sind: Ihre schriftliche Einwilligung liegt vor.</span></label>
    <p class="muted small">Rechtlich wichtig: Rabatte und „statt“-Preise nur nennen, wenn sie stimmen; Zeiträume genau angeben.</p>
    <button class="btn primary block" id="a_go">Aktion einplanen</button>
    <div id="a_prog" hidden><div class="progress"><div></div></div><p class="muted small" id="a_progtxt"></p></div>`;

  const chipGroup = (id, key, after) => { $('#' + id).onclick = e => {
    const b = e.target.closest('.chip'); if (!b) return;
    st[key] = b.dataset.v; view.querySelectorAll(`#${id} .chip`).forEach(c => c.setAttribute('aria-pressed', c === b)); after && after();
  }; };
  const sync = () => {
    if (st.kind === 'reel' && st.content !== 'video') { st.content = 'video'; view.querySelectorAll('#a_content .chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.v === 'video')); }
    $('#a_media').hidden = st.content === 'text';
    $('#a_textbox').hidden = st.content !== 'text';
    $('#a_capbox').hidden = st.kind === 'story';
    $('#a_editbox').hidden = st.content !== 'bild';
    $('#a_musicbox').hidden = st.content !== 'video';
    $('#a_file').accept = st.content === 'video' ? 'video/*' : 'image/*';
    $('#a_slot_t').textContent = st.content === 'video' ? 'Video wählen' : 'Bild wählen';
    $('#a_endwrap').hidden = st.repeat !== 'taeglich';
    $('#a_startlbl').textContent = st.repeat === 'taeglich' ? 'Von' : 'Am';
    const n = st.repeat === 'taeglich' ? Math.max(1, Math.round((new Date($('#a_end').value) - new Date($('#a_start').value)) / 864e5) + 1) : 1;
    $('#a_hint').textContent = `→ ${n}× ${st.kind === 'story' ? 'Story' : st.kind === 'reel' ? 'Reel' : 'Beitrag'} um ${$('#a_time').value} Uhr` + (st.kind !== 'story' && n > 2 ? ' · Tipp: Feed-Beiträge/Reels lieber 1–2× pro Aktion, täglich besser als Story.' : '');
  };
  chipGroup('a_kind', 'kind', sync); chipGroup('a_content', 'content', () => { st.media = null; st.file = null; sync(); }); chipGroup('a_repeat', 'repeat', sync);
  ['a_start', 'a_end', 'a_time'].forEach(i => ($('#' + i).onchange = sync));
  sync();

  const slot = $('#a_file').closest('.slot');
  const processVid = async () => {
    const tag = slot.querySelector('.tag') || slot.appendChild(Object.assign(document.createElement('span'), { className: 'tag' }));
    if (st.music === 'original') {
      // Originalton bleibt – Video unverändert
      st.media = { blob: st.file.f, video: true, duration: st.file.duration, original: true };
      tag.textContent = 'mit Originalton';
      const vp = $('#a_vprev'); vp.src = URL.createObjectURL(st.file.f); vp.hidden = false; vp.muted = false;
      return;
    }
    const music = st.music && st.music !== 'trend' ? st.music : null;
    const out = await muteVideo(st.file.f, t => (tag.textContent = t), { music, duration: st.file.duration });
    st.media = { blob: out, video: true, duration: st.file.duration };
    tag.textContent = (music ? 'Musik ✓' : st.music === 'trend' ? 'Trend-Sound in Instagram' : 'ohne Ton ✓');
    const vp = $('#a_vprev'); vp.src = URL.createObjectURL(out); vp.hidden = false;
  };
  const processImg = async () => {
    const out = await correctPhoto(st.file.f, { edit: $('#a_edit').checked, smooth: false, treatment: 'studio' });
    st.media = out;
    slot.querySelectorAll('img,.tag').forEach(n => n.remove());
    slot.insertAdjacentHTML('beforeend', `<img src="${out.preview}" style="object-fit:contain;background:#000" alt=""><span class="tag">${out.original ? 'unbearbeitet' : 'bearbeitet'}</span>`);
  };
  $('#a_file').onchange = async () => {
    const f = $('#a_file').files[0]; if (!f) return;
    slot.querySelectorAll('img,video,.tag').forEach(n => n.remove());
    try {
      if (st.content === 'video') {
        const duration = await new Promise(res => { const v = document.createElement('video'); v.preload = 'metadata'; v.onloadedmetadata = () => res(v.duration); v.onerror = () => res(null); v.src = URL.createObjectURL(f); setTimeout(() => res(null), 8000); });
        if (duration != null && duration < 3) { toast('Instagram nimmt Videos erst ab 3 Sekunden an.'); return; }
        st.file = { f, duration };
        slot.insertAdjacentHTML('beforeend', `<video src="${URL.createObjectURL(f)}" muted playsinline></video><span class="tag">Ton wird entfernt …</span>`);
        await processVid();
      } else { st.file = { f }; await processImg(); }
      slot.classList.add('filled');
    } catch (e) { toast('Datei konnte nicht verarbeitet werden: ' + e.message, 7000); }
  };
  $('#a_edit').onchange = () => st.file && st.content === 'bild' && processImg();
  $('#a_music').onclick = async e => {
    const b = e.target.closest('.chip'); if (!b) return;
    st.music = b.dataset.t; view.querySelectorAll('#a_music .chip').forEach(c => c.setAttribute('aria-pressed', c === b));
    $('#a_trendinfo').hidden = st.music !== 'trend';
    $('#a_origbox').hidden = st.music !== 'original';
    if (st.file && st.content === 'video') { try { await processVid(); } catch (er) { toast(er.message); } }
  };
  $('#a_caption').oninput = () => (st.aiCaption = false);
  $('#a_ai').onclick = async () => {
    const btn = $('#a_ai'); btn.disabled = true; btn.textContent = 'Einen Moment …';
    try {
      const details = [$('#a_head').value, $('#a_body').value, $('#a_caption').value].filter(Boolean).join(' · ');
      const r = await post('/api/aktionen/vorschlag', { title: $('#a_title').value, details, kind: st.kind });
      $('#a_caption').value = r.text; st.aiCaption = true;
    } catch (e) { toast(e.message, 7000); }
    btn.disabled = false; btn.textContent = '✨ Von Gemini vorschlagen lassen';
  };

  $('#a_go').onclick = async () => {
    if (!$('#a_title').value.trim()) return toast('Bitte einen Namen für die Aktion eingeben');
    if (st.content !== 'text' && !st.media) return toast('Bitte zuerst ein Bild oder Video wählen');
    if (st.content === 'text' && !$('#a_head').value.trim()) return toast('Bitte eine Überschrift eingeben');
    if (st.content === 'video' && st.music === 'original' && !$('#a_orig').checked) return toast('Bitte bestätigen, dass im Video keine fremde Musik ohne Lizenz läuft.', 6000);
    if (!$('#a_consent').checked) return toast('Bitte die Einwilligung bestätigen (oder: es sind keine Kundinnen zu sehen – dann trotzdem abhaken).', 6000);
    const btn = $('#a_go'); btn.disabled = true;
    const prog = $('#a_prog'); prog.hidden = false;
    const bar = prog.querySelector('.progress div'), txt = $('#a_progtxt');
    const setP = (p, t) => { bar.style.width = Math.round(p * 100) + '%'; txt.textContent = t; };
    try {
      let media_id = null;
      if (st.content !== 'text') {
        const set = await post('/api/sets', { treatment: 'aktion', note: $('#a_title').value, consent: true });
        if (st.content === 'video') {
          const r = await uploadVideo(set.id, st.media.blob, st.media.duration, st.media.original ? 'original' : 'auto', p => setP(p * 0.9, `Video wird hochgeladen … ${Math.round(p * 100)} %`));
          media_id = r.id;
        } else {
          setP(0.4, 'Bild wird hochgeladen …');
          const r = await api(`/api/media?set=${set.id}&role=ergebnis&w=${st.media.width}&h=${st.media.height}&edit=${st.media.original ? 'original' : 'licht'}`, { method: 'PUT', body: st.media.blob, headers: { 'content-type': 'image/jpeg' } });
          media_id = r.id;
        }
      }
      setP(0.95, 'Wird eingeplant …');
      const r = await post('/api/aktionen', {
        title: $('#a_title').value, kind: st.kind, content: st.content, media_id,
        text: { headline: $('#a_head').value, body: $('#a_body').value, pill: $('#a_pill').value },
        caption: $('#a_caption').value, aiCaption: st.aiCaption, manual: st.content === 'video' && st.music === 'trend',
        start: $('#a_start').value, end: $('#a_end').value, time: $('#a_time').value, repeat: st.repeat,
      });
      setP(1, 'Fertig!');
      toast(`Aktion eingeplant: ${r.posts}× – du bekommst jeweils eine E-Mail, wenn es online ist.`, 5000);
      setTimeout(() => (location.hash = '#plan'), 900);
    } catch (e) { toast('Fehler: ' + e.message, 7000); btn.disabled = false; }
  };
}


// ---------------- Um Google-Bewertung bitten ----------------
let qrLib = null;
function loadQr() {
  if (!qrLib) qrLib = new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
    sc.onload = () => res(window.qrcode); sc.onerror = () => { qrLib = null; rej(new Error('QR-Code konnte nicht geladen werden')); };
    document.head.appendChild(sc);
  });
  return qrLib;
}
async function qrCanvas(text, size = 600, dark = '#141210', light = '#F1ECE8') {
  const q = (await loadQr())(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(), quiet = 2, cell = Math.floor(size / (n + quiet * 2));
  const c = document.createElement('canvas'); c.width = c.height = cell * (n + quiet * 2);
  const g = c.getContext('2d'); g.fillStyle = light; g.fillRect(0, 0, c.width, c.height); g.fillStyle = dark;
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect((k + quiet) * cell, (r + quiet) * cell, cell, cell);
  return c;
}
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

/** Druckkarte A6 (1240x1748 px ≈ 300 dpi) im NMY-Stil */
async function reviewCard(link) {
  await Promise.all([document.fonts.load('700 80px "Playfair Display"'), document.fonts.load('400 30px Montserrat')]).catch(() => {});
  const W = 1240, H = 1748, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#F1ECE8'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(94,75,66,.45)'; g.lineWidth = 3; g.strokeRect(50, 50, W - 100, H - 100);
  g.textAlign = 'center'; g.fillStyle = '#4A423D';
  g.font = '400 30px Montserrat, Helvetica, Arial'; g.fillText('G O O G L E - B E W E R T U N G', W / 2, 220);
  g.fillStyle = '#141210'; g.font = '700 92px "Playfair Display", Georgia, serif';
  g.fillText('Wie hat es dir', W / 2, 380); g.fillText('gefallen?', W / 2, 490);
  g.fillStyle = '#4A423D'; g.font = '400 36px Montserrat, Helvetica, Arial';
  g.fillText('Ich freue mich über deine ehrliche Bewertung.', W / 2, 590);
  const qr = await qrCanvas(link, 640); g.drawImage(qr, (W - qr.width) / 2, 660);
  g.font = '400 30px Montserrat, Helvetica, Arial'; g.fillText('Code mit der Handy-Kamera scannen', W / 2, 660 + qr.height + 70);
  try { const logo = await loadImg('/icon-512.png'); g.drawImage(logo, W / 2 - 110, H - 330, 220, 220); } catch {}
  return new Promise(r => c.toBlob(r, 'image/png'));
}

async function viewBewertung() {
  const st = await api('/api/settings');
  let G = {}; try { G = JSON.parse(st.google_reviews || '{}'); } catch {}
  let link = st.google_review_url || '';
  const draft = name => `Hallo ${name || ''},\n\nvielen Dank, dass du bei mir warst! 🤍 Ich würde mich sehr über deine ehrliche Bewertung bei Google freuen – für mein kleines Studio ist das eine große Hilfe:\n\n${link || '[Link]'}\n\nLiebe Grüße\nNikita · NMY Cosmetics`;
  view.innerHTML = `
    <p class="label">Google-Bewertungen</p>
    <h1>Um eine <i>Bewertung</i> bitten</h1>
    <p class="lead">Mehr Bewertungen = mehr Vertrauen bei neuen Kundinnen aus der Region.</p>
    <div class="card"><label class="field" style="margin-top:0"><span>Dein Google-Bewertungslink</span><input type="text" id="r_link" value="${esc(link)}" placeholder="https://g.page/r/…/review"></label>
      <p class="muted small">So bekommst du ihn: Google Unternehmensprofil (Google Maps → dein Profil, oder in der Google-Suche „NMY Cosmetics“ → „Profil verwalten“) → <b>„Nach Rezensionen fragen“</b> → Link kopieren.</p>
      <button class="btn sm" id="r_save" style="margin-top:8px">Link speichern</button></div>
    <div id="r_body" ${link ? '' : 'hidden'}>
      <h2>1 · Im Studio <span class="muted small">(empfohlen)</span></h2>
      <div class="card" style="text-align:center"><p class="muted small" style="margin-bottom:10px">Direkt nach dem Termin: Kundin scannt mit der Handy-Kamera und landet sofort beim Bewertungsformular.</p>
        <div id="r_qr" style="display:flex;justify-content:center"></div>
        <div class="row" style="justify-content:center;margin-top:12px"><button class="btn sm primary" id="r_full">Vollbild zeigen</button><button class="btn sm" id="r_card">QR-Karte zum Ausdrucken</button></div></div>
      <h2>2 · Per WhatsApp</h2>
      <div class="card">
        <div class="row" style="gap:10px"><label class="field" style="flex:1;margin:0"><span>Vorname</span><input type="text" id="r_name" placeholder="z. B. Anna"></label>
          <label class="field" style="flex:1.3;margin:0"><span>Handynummer (optional)</span><input type="tel" id="r_tel" placeholder="0176 …"></label></div>
        <label class="field"><span>Nachricht</span><textarea id="r_msg" style="min-height:170px"></textarea></label>
        <label class="check"><input type="checkbox" id="r_ok"><span><b>Die Kundin ist einverstanden</b>, dass ich ihr den Link per WhatsApp schicke. <span class="muted small">(Ohne Einverständnis gilt die Bitte als unerlaubte Werbung.)</span></span></label>
        <button class="btn primary block" id="r_wa">In WhatsApp öffnen</button>
        <p class="muted small" style="margin-top:8px">Ohne Nummer wählst du den Kontakt direkt in WhatsApp aus.</p></div>
      <p class="muted small" style="margin-top:14px">Google-Regeln: Alle Kundinnen fragen – nicht nur zufriedene – und nichts als Gegenleistung anbieten (z. B. keinen Rabatt).</p>
    </div>`;
  const fill = () => { $('#r_msg').value = draft($('#r_name').value.trim()); };
  const renderQr = async () => {
    if (!link) return;
    try { const c = await qrCanvas(link, 520); c.style.width = '240px'; c.style.height = '240px'; $('#r_qr').replaceChildren(c); }
    catch (e) { $('#r_qr').textContent = e.message; }
  };
  fill(); renderQr();
  $('#r_name').oninput = fill;
  $('#r_save').onclick = async () => {
    const v = $('#r_link').value.trim();
    if (!/^https:\/\//.test(v)) return toast('Bitte den kompletten Link einfügen (beginnt mit https://)');
    await post('/api/settings', { google_review_url: v }); link = v; toast('Bewertungslink gespeichert');
    $('#r_body').hidden = false; fill(); renderQr();
  };
  $('#r_full').onclick = async () => {
    const c = await qrCanvas(link, 900);
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:50;background:#F1ECE8;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center';
    ov.innerHTML = '<p class="label" style="justify-content:center">Google-Bewertung</p><h1 style="margin:10px 0 18px">Wie hat es dir <i>gefallen?</i></h1>';
    c.style.width = 'min(80vw,420px)'; c.style.height = 'auto'; ov.appendChild(c);
    ov.insertAdjacentHTML('beforeend', '<p class="muted" style="margin-top:16px">Code mit der Handy-Kamera scannen</p><button class="btn" style="margin-top:22px">Schließen</button>');
    ov.querySelector('button').onclick = () => ov.remove();
    document.body.appendChild(ov);
  };
  $('#r_card').onclick = async () => {
    const blob = await reviewCard(link); const f = new File([blob], 'nmy-bewertungskarte.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f] }).catch(() => {});
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); }
    toast('Karte gespeichert – z. B. als A6 ausdrucken.', 5000);
  };
  $('#r_wa').onclick = () => {
    if (!$('#r_ok').checked) return toast('Bitte erst bestätigen, dass die Kundin einverstanden ist.', 5000);
    let tel = $('#r_tel').value.replace(/[^\d+]/g, '');
    if (tel.startsWith('+')) tel = tel.slice(1); else if (tel.startsWith('00')) tel = tel.slice(2); else if (tel.startsWith('0')) tel = '49' + tel.slice(1);
    const url = `https://wa.me/${tel}?text=${encodeURIComponent($('#r_msg').value)}`;
    post('/api/bewertung/angefragt').catch(() => {});
    location.href = url;
  };
}

// ---------------- Plan ----------------
const KIND = { carousel: 'Karussell', story: 'Story', reel: 'Reel', image: 'Bild' };
const STATUS = { render: ['wird erstellt', 'wait'], geplant: ['geplant', ''], bereit: ['bereit – Trend-Sound wählen', 'wait'], veroeffentlicht: ['online', 'ok'], fehler: ['Fehler', 'bad'], pausiert: ['pausiert', 'wait'] };

function postCard(p) {
  const [st, cls] = STATUS[p.status] || [p.status, ''];
  const media = p.video ? `<video src="${file(p.video)}" muted playsinline controls preload="metadata"></video>` : p.assets.map(k => `<img src="${file(k)}" loading="lazy" alt="">`).join('');
  return `<article class="post" data-id="${p.id}">
    <div class="head"><div><span class="label">${KIND[p.kind] || p.kind}${p.aktion ? ' · Aktion „' + esc(p.aktion) + '“' : p.treatment ? ' · ' + esc(p.treatment) : ''}</span><br><b>${esc(p.published || p.when || '')}</b></div><span class="badge ${cls}">${st}</span></div>
    ${media ? `<div class="strip">${media}</div>` : p.status === 'render' ? '<p class="muted small" style="padding:0 14px 12px">Bilder werden gerade erstellt …</p>' : ''}
    ${p.error ? `<p class="err">${esc(p.error)}</p>` : ''}
    ${p.kind !== 'story' ? `<details><summary>Caption ${p.status === 'veroeffentlicht' ? 'ansehen' : 'ansehen / ändern'}</summary>
      ${p.status === 'veroeffentlicht' ? `<pre class="ai">${esc(p.caption)}</pre>` : `<textarea data-cap>${esc(p.caption)}</textarea><button class="btn sm" data-act="caption" style="margin-top:8px">Caption speichern</button>`}</details>` : ''}
    <div class="actions">${p.status === 'veroeffentlicht'
      ? (p.permalink ? `<a class="btn sm" href="${esc(p.permalink)}" target="_blank" rel="noopener">Auf Instagram ansehen</a>` : '') +
        (p.kind !== 'story' && p.ig_media_id ? repostButtons(p.ig_media_id, p.permalink) : '')
      : p.manual ? `<button class="btn sm primary" data-act="teilen">In Instagram öffnen</button>${p.assets[0] ? '<button class="btn sm" data-act="cover">Startbild speichern</button>' : ''}<button class="btn sm" data-act="ist-online">Ist online ✓</button><button class="btn sm" data-act="loeschen">Löschen</button>
         <div class="card" style="width:100%;margin:4px 0 0;padding:12px"><p class="small"><b>So postest du (ca. 1 Min.):</b></p><ol class="small" style="padding-left:18px;margin-top:4px">
           <li>„In Instagram öffnen“ → Reel wählen. Die Caption ist schon kopiert.</li>
           ${p.assets[0] ? '<li>Titelbild: „Startbild speichern“ und in Instagram unter „Titelbild bearbeiten“ auswählen.</li>' : ''}
           <li>Musik wählen: ✅ Meta Sound Collection / ruhige Instrumentals ohne bekannten Interpreten · ❌ keine Chart-Hits, kein „Originalton“ anderer Accounts.</li>
           <li>Caption einfügen.${p.ai ? ' <b>Wichtig: unter „Erweiterte Einstellungen“ den Haken „Mit KI erstellt“ setzen.</b>' : ''}</li>
           <li>Posten und hier „Ist online ✓“ tippen.</li></ol>
           <p class="muted small" style="margin-top:6px">Das Video mit diesem Sound nur auf Instagram nutzen (nicht TikTok/Website).</p></div>`
      : `<button class="btn sm" data-act="jetzt">Jetzt posten</button>
         ${p.status === 'pausiert' || p.status === 'fehler' ? '<button class="btn sm" data-act="fortsetzen">Fortsetzen</button>' : '<button class="btn sm" data-act="pausieren">Pausieren</button>'}
         <button class="btn sm" data-act="loeschen">Löschen</button>`}</div>
  </article>`;
}

function repostButtons(igId, permalink) {
  return `<span class="small muted" style="width:100%;margin-top:4px">In Story teilen:</span>
    <button class="btn sm" data-repost="${igId}" data-when="jetzt">Jetzt</button>
    <button class="btn sm" data-repost="${igId}" data-when="spaeter">Nächster Story-Platz</button>
    ${permalink ? `<a class="btn sm" href="${esc(permalink)}" target="_blank" rel="noopener" data-sticker>Mit Link-Sticker ✈️</a>` : ''}`;
}

function bindRepost(root = view) {
  root.querySelectorAll('[data-repost]').forEach(b => (b.onclick = async e => {
    e.stopPropagation();
    if (b.dataset.when === 'jetzt' && !confirm('Diesen Beitrag jetzt in deiner Story teilen? (geht in ca. 2–15 Minuten online)')) return;
    b.disabled = true;
    try { const r = await post('/api/repost', { ig_media_id: b.dataset.repost, when: b.dataset.when }); toast(b.dataset.when === 'jetzt' ? 'Story wird erstellt und gleich geteilt.' : 'Story eingeplant – siehe Plan.'); }
    catch (er) { toast(er.message, 6000); b.disabled = false; }
  }));
  root.querySelectorAll('[data-sticker]').forEach(a => (a.onclick = () => toast('In Instagram: ✈️ antippen → „Zur Story hinzufügen“ → teilen.', 7000)));
}

function bindPostCards() {
  bindRepost();
  view.querySelectorAll('.post').forEach(card => {
    card.onclick = async e => {
      const act = e.target.closest('[data-act]')?.dataset.act; if (!act) return;
      const id = card.dataset.id;
      try {
        if (act === 'cover') {
          const p = (await api('/api/posts?scope=kommend')).find(x => x.id === id);
          const blob = await (await fetch(file(p.assets[0]))).blob();
          const f = new File([blob], 'nmy-startbild.jpg', { type: 'image/jpeg' });
          if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f] });
          else { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); }
          toast('In Instagram beim Reel: „Titelbild bearbeiten“ → „Aus Aufnahmen hinzufügen“ → dieses Bild wählen.', 8000);
          return;
        }
        if (act === 'teilen') {
          const p = (await api('/api/posts?scope=kommend')).find(x => x.id === id);
          await navigator.clipboard.writeText(p.caption || '').catch(() => {});
          toast('Video wird vorbereitet …');
          const blob = await (await fetch(file(p.video))).blob();
          const f = new File([blob], 'nmy-reel.mp4', { type: 'video/mp4' });
          if (navigator.canShare?.({ files: [f] })) { await navigator.share({ files: [f] }); }
          else { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = 'nmy-reel.mp4'; a.click(); toast('Video gespeichert – jetzt in Instagram hochladen. Caption ist kopiert.', 6000); }
          return;
        }
        if (act === 'loeschen') { if (!confirm('Diesen Beitrag wirklich löschen?')) return; await api(`/api/posts/${id}`, { method: 'DELETE' }); }
        else if (act === 'caption') await api(`/api/posts/${id}`, { method: 'PATCH', body: JSON.stringify({ caption: card.querySelector('[data-cap]').value }) });
        else {
          if (act === 'jetzt' && !confirm('Jetzt sofort veröffentlichen? (innerhalb der nächsten 15 Minuten)')) return;
          if (act === 'ist-online' && !confirm('Hast du das Video in Instagram gepostet?')) return;
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
  const [posts, aktionen] = await Promise.all([api('/api/posts?scope=' + scope), api('/api/aktionen')]);
  view.innerHTML = `<p class="label">Redaktionsplan</p><h1>Dein <i>Plan</i></h1>
    <p class="lead">Feed: 5× pro Woche (Mo, Di, Mi, Fr, So abends) · Stories täglich. Alles wird automatisch veröffentlicht – du bekommst eine E-Mail, sobald etwas online ist.</p>
    <a class="btn block primary" href="#aktion" style="margin-bottom:10px">✦ Eigene Aktion planen</a>
    ${aktionen.length ? `<div class="card"><span class="label">Laufende Aktionen</span><ul class="list">${aktionen.map(a => `<li><span><b>${esc(a.title)}</b><br><span class="muted small">${{ story: 'Story', post: 'Beitrag', reel: 'Reel' }[a.kind]} · ${a.start_date === a.end_date ? a.start_date.split('-').reverse().join('.') : a.start_date.split('-').reverse().join('.') + ' – ' + a.end_date.split('-').reverse().join('.')} · ${a.time} Uhr<br>${a.online} online · ${a.offen} geplant${a.naechster ? ' · nächster: ' + esc(a.naechster) : ''}</span></span><button class="btn sm" data-end="${a.id}">Beenden</button></li>`).join('')}</ul></div>` : ''}
    <div class="chips" style="margin-bottom:6px"><a class="chip" href="#plan?scope=kommend" aria-pressed="${scope === 'kommend'}" style="display:flex;align-items:center;text-decoration:none">Kommend</a>
    <a class="chip" href="#plan?scope=online" aria-pressed="${scope !== 'kommend'}" style="display:flex;align-items:center;text-decoration:none">Veröffentlicht</a></div>
    ${posts.length ? posts.map(postCard).join('') : '<div class="card empty">Hier ist noch nichts.</div>'}
    ${scope === 'kommend' ? '<button class="btn block" id="fill" style="margin-top:8px">Nächste 7 Tage automatisch auffüllen</button>' : '<h2>Alle Beiträge auf deinem Instagram</h2><p class="muted small">Auch ältere Beiträge kannst du in der Story teilen.</p><div id="igmedia"><p class="muted">Lädt …</p></div>'}`;
  bindPostCards();
  view.querySelectorAll('[data-end]').forEach(b => (b.onclick = async () => {
    if (!confirm('Aktion beenden? Alle noch nicht veröffentlichten Termine dieser Aktion werden gelöscht.')) return;
    const r = await api('/api/aktionen/' + b.dataset.end, { method: 'DELETE' }); toast(`Aktion beendet – ${r.removed} Termine entfernt`); route();
  }));
  if ($('#fill')) $('#fill').onclick = async () => { const r = await post('/api/plan/auffuellen'); toast(`${r.made} Beiträge ergänzt`); setTimeout(route, 1500); };
  if (scope !== 'kommend') {
    const list = await api('/api/instagram/beitraege').catch(() => []);
    $('#igmedia').innerHTML = list.length ? list.map(m => `<article class="post"><div class="head" style="gap:12px;justify-content:flex-start">
        ${m.thumb ? `<img src="${esc(m.thumb)}" alt="" style="width:64px;height:80px;object-fit:cover;border-radius:6px;flex:none" loading="lazy" referrerpolicy="no-referrer">` : ''}
        <div><span class="label">${/VIDEO|REELS/.test(m.product_type || m.media_type) ? 'Reel' : m.media_type === 'CAROUSEL_ALBUM' ? 'Karussell' : 'Beitrag'} · ${new Date(m.ts).toLocaleDateString('de-DE')}</span><br><span class="small">${esc(m.title || '')}</span>${m.reposts ? `<br><span class="badge ok">${m.reposts}× in Story geteilt</span>` : ''}</div></div>
        <div class="actions">${repostButtons(m.id, m.permalink)}</div></article>`).join('')
      : '<div class="card empty">Erscheint nach der nächsten Instagram-Synchronisierung.</div>';
    bindRepost($('#igmedia'));
  }
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

    <h2>Kommentare & Antworten</h2>
    <div class="card" id="kommentare"><p class="muted small">Lädt …</p></div>

    <h2>Letzte Buchungen</h2>
    <div class="card">${s.recentBookings.length ? `<ul class="list">${s.recentBookings.map(b => `<li><span>${esc(b.treatment || 'Behandlung unbekannt')}<br><span class="muted small">${esc(b.when)} · ${esc(b.source)}${b.status === 'storniert' ? ' · storniert' : ''}</span></span>${b.source !== 'treatwell' ? `<button class="btn sm" data-del="${b.id}">Entfernen</button>` : ''}</li>`).join('')}</ul>` : '<p class="empty">Treatwell-Buchungen erscheinen automatisch, sobald die Gmail-Verbindung eingerichtet ist.</p>'}
      <button class="btn sm" id="wa" style="margin-top:10px">+ WhatsApp-/Telefon-Buchung</button></div>`;
  const busy = (btn, fn) => async () => { btn.disabled = true; btn.textContent = 'Einen Moment …'; try { await fn(); route(); } catch (e) { toast(e.message, 6000); btn.disabled = false; } };
  $('#sync').onclick = busy($('#sync'), () => post('/api/instagram/sync'));
  api('/api/kommentare').then(list => {
    const L = { beantwortet: ['beantwortet', 'ok'], pruefen: ['bitte selbst antworten', 'bad'], spam: ['Spam ignoriert', ''], alt: ['vor dem Start', ''], fehler: ['Fehler', 'bad'], geloescht: ['Antwort gelöscht', ''], neu: ['neu', 'wait'] };
    const shown = list.filter(c => c.status !== 'alt').slice(0, 15);
    $('#kommentare').innerHTML = shown.length ? `<ul class="list">${shown.map(c => `<li style="display:block"><div class="row between"><b>@${esc(c.username)}</b><span class="badge ${(L[c.status] || ['', ''])[1]}">${(L[c.status] || [c.status])[0]}</span></div>
      <p class="small" style="margin-top:4px">${esc(c.text)}</p>${c.reply_text ? `<p class="small muted" style="margin-top:6px">↳ ${esc(c.reply_text)}</p>` : ''}
      ${c.status === 'beantwortet' && c.reply_id ? `<button class="btn sm" data-delrep="${c.id}" style="margin-top:6px">Antwort löschen</button>` : ''}</li>`).join('')}</ul>`
      : '<p class="empty">Neue Kommentare unter deinen Beiträgen erscheinen hier – inklusive der automatischen Antworten.</p>';
    $('#kommentare').querySelectorAll('[data-delrep]').forEach(b => (b.onclick = async () => { if (!confirm('Diese automatische Antwort auf Instagram löschen?')) return; try { await api('/api/kommentare/' + b.dataset.delrep + '/antwort', { method: 'DELETE' }); toast('Antwort gelöscht'); route(); } catch (e) { toast(e.message, 6000); } }));
  }).catch(() => ($('#kommentare').innerHTML = '<p class="muted small">Kommentare konnten nicht geladen werden.</p>'));
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

    <h2>Google-Bewertungen <span class="muted small">(Buchungsseite)</span></h2>
    <a class="btn sm" href="#bewertung" style="margin-bottom:8px">★ Kundin um Bewertung bitten</a>
    <div class="card" id="greviews"><p class="muted small">Erscheinen animiert auf deiner Buchungsseite. Bitte nur echte Bewertungen unverändert aus deinem Google-Profil übernehmen (Name wie bei Google, z. B. „Anna K.“).</p>
      <label class="field"><span>Link zu deinem Google-Profil</span><input type="text" id="g_url" placeholder="https://g.page/… oder Google-Maps-Link"></label>
      <div class="row" style="gap:10px"><label class="field" style="flex:1;margin:0"><span>Gesamtnote</span><input type="text" id="g_rating" inputmode="decimal" placeholder="5,0"></label>
        <label class="field" style="flex:1;margin:0"><span>Anzahl Bewertungen</span><input type="number" id="g_count" placeholder="12"></label></div>
      <div id="g_list" style="margin-top:14px"></div>
      <div class="row" style="margin-top:10px"><button class="btn sm" id="g_add">+ Bewertung</button><button class="btn sm primary" id="g_save">Speichern</button><a class="btn sm" href="https://buchung.nmy-cosmetics.workers.dev/#bewertungen" target="_blank">Ansehen</a></div></div>

    <h2>Kommentare</h2>
    <div class="card"><label class="check" style="margin:0;background:none;padding:0"><input type="checkbox" id="auto_reply" ${s.auto_reply === 'aus' ? '' : 'checked'}>
      <span><b>Kommentare unter deinen Beiträgen automatisch beantworten</b><br><span class="muted small">2× täglich (12 und 19 Uhr). Kurz, persönlich, in Du-Form – Fragen werden auf den Link in der Bio gelenkt. Kritik und heikle Themen beantwortet die App nicht, du bekommst stattdessen eine Nachricht. Alle Antworten siehst du unter „Analyse“.</span></span></label></div>

    <h2>Story-Reposts</h2>
    <div class="card"><label class="check" style="margin:0;background:none;padding:0"><input type="checkbox" id="auto_repost" ${s.auto_repost === '0' ? '' : 'checked'}>
      <span><b>Neue Beiträge automatisch in der Story teilen</b><br><span class="muted small">Jeder neue Feed-Beitrag oder jedes neue Reel wird am nächsten Tag als „Neu im Feed“-Story geteilt.</span></span></label></div>

    <h2>Musik</h2>
    <div class="card"><p class="muted small">Eigens für NMY komponiert, frei von fremden Rechten. Erst anhören – nur freigegebene Titel nutzt die App für deine Videos.</p>
      ${TRACKS.map(t => `<div style="margin:12px 0"><div class="row between"><b>${t.name}</b>
        <label class="small" style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-track="${t.id}" ${(s.music_approved || '').split(',').includes(t.id) ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--ink)">freigegeben</label></div>
        <audio controls preload="none" src="/musik/${t.id}.m4a" style="width:100%;margin-top:6px"></audio></div>`).join('')}
      <p class="muted small">Trend-Musik: beim Video-Upload „Trend-Sound in Instagram“ wählen.</p></div>

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
  // Google-Bewertungen bearbeiten
  let G = {}; try { G = JSON.parse(s.google_reviews || '{}'); } catch { G = {}; }
  G.reviews = G.reviews || [];
  $('#g_url').value = G.url || ''; $('#g_rating').value = G.rating || ''; $('#g_count').value = G.count || '';
  const gRow = (r = {}) => `<div class="card g_r" style="margin:8px 0;padding:12px">
      <div class="row" style="gap:8px"><input type="text" class="g_name" placeholder="Name (wie bei Google)" value="${esc(r.name || '')}" style="flex:2">
      <select class="g_stars" style="flex:1">${[5, 4, 3, 2, 1].map(n => `<option ${(+r.stars || 5) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <input type="text" class="g_date" placeholder="Datum, z. B. vor 2 Monaten" value="${esc(r.date || '')}" style="margin-top:8px">
      <textarea class="g_text" placeholder="Bewertungstext (unverändert)" style="min-height:80px;margin-top:8px">${esc(r.text || '')}</textarea>
      <button class="btn sm g_del" style="margin-top:6px">Entfernen</button></div>`;
  const gRender = () => { $('#g_list').innerHTML = G.reviews.map(gRow).join(''); $('#g_list').querySelectorAll('.g_del').forEach((b, k) => (b.onclick = () => { gCollect(); G.reviews.splice(k, 1); gRender(); })); };
  const gCollect = () => { G.reviews = [...$('#g_list').querySelectorAll('.g_r')].map(c => ({ name: c.querySelector('.g_name').value.trim(), stars: +c.querySelector('.g_stars').value, date: c.querySelector('.g_date').value.trim(), text: c.querySelector('.g_text').value.trim() })); };
  gRender();
  $('#g_add').onclick = () => { gCollect(); G.reviews.push({ stars: 5 }); gRender(); };
  $('#g_save').onclick = async () => {
    gCollect();
    const data = { url: $('#g_url').value.trim(), rating: $('#g_rating').value.trim(), count: $('#g_count').value.trim(), reviews: G.reviews.filter(r => r.text) };
    try { await post('/api/settings', { google_reviews: JSON.stringify(data) }); toast(`Gespeichert – ${data.reviews.length} Bewertungen auf deiner Buchungsseite`); } catch (e) { toast(e.message); }
  };
  $('#auto_reply').onchange = async e => { await post('/api/settings', { auto_reply: e.target.checked ? 'auto' : 'aus' }); toast(e.target.checked ? 'Automatische Antworten an' : 'Automatische Antworten aus'); };
  $('#auto_repost').onchange = async e => { await post('/api/settings', { auto_repost: e.target.checked ? '1' : '0' }); toast(e.target.checked ? 'Automatisches Teilen an' : 'Automatisches Teilen aus'); };
  view.querySelectorAll('[data-track]').forEach(cb => (cb.onchange = async () => {
    const ids = [...view.querySelectorAll('[data-track]')].filter(x => x.checked).map(x => x.dataset.track);
    await post('/api/settings', { music_approved: ids.join(',') });
    toast(cb.checked ? 'Titel freigegeben' : 'Freigabe entfernt');
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
const ROUTES = { start: viewStart, hochladen: viewUpload, plan: viewPlan, analyse: viewAnalyse, einstellungen: viewSettings, aktion: viewAktion, bewertung: viewBewertung };
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
    HOOKS = me.hooks || {};
    $('#tabs').hidden = false;
    route();
  } catch { /* Login wird angezeigt */ }
}
window.addEventListener('hashchange', route);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
start();
