// Gemini (kostenlose Stufe): Captions, ganze Karussells, Buchungs-Stories, Filmideen, Trend-Radar, Analyse.
// Ziel aller Texte: Reichweite bei neuen Kundinnen + Terminbuchungen.
// Datenschutz: Es werden NIE Fotos oder Namen von Kundinnen übertragen – nur Behandlung, Thema und Kennzahlen.
import { TREATMENTS, CAPTION_RULES, BRAND_FACTS, hashtags, fallbackCaption } from './brand.js';
import { getSetting, setSetting } from './util.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';



/** Verfügbare Flash-Modelle, neuestes zuerst (Modelle werden regelmäßig ersetzt). Bei Überlastung wird das nächste genutzt. */
async function pickModels(env, key) {
  const fixed = await getSetting(env, 'gemini_model');
  if (fixed) return [fixed];
  const cached = await getSetting(env, 'gemini_model_auto');
  const at = Number(await getSetting(env, 'gemini_model_auto_at', '0'));
  if (cached && Date.now() - at < 7 * 864e5) return cached.split(',');
  try {
    const res = await fetch(`${BASE}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
    const data = await res.json();
    const names = (data.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map(m => m.name.replace('models/', ''))
      .filter(n => /^gemini-\d+(\.\d+)?-flash(-lite)?$/.test(n));
    const ver = n => parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)[1]) - (n.includes('lite') ? 0.05 : 0);
    names.sort((a, b) => ver(b) - ver(a));
    if (names.length) {
      const list = names.slice(0, 4);
      await setSetting(env, 'gemini_model_auto', list.join(','));
      await setSetting(env, 'gemini_model_auto_at', Date.now());
      return list;
    }
  } catch (e) { console.log('Modellsuche:', e.message); }
  return cached ? cached.split(',') : ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
}

async function generate(env, { system, prompt, search = false, temperature = 0.8, json = false }) {
  const key = await getSetting(env, 'gemini_key');
  if (!key) return null;
  const models = await pickModels(env, key);
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens: 4096, ...(json ? { responseMimeType: 'application/json' } : {}) },
  };
  if (search) body.tools = [{ google_search: {} }];
  let res, data;
  // Google erneuert das Gratis-Kontingent um Mitternacht pazifischer Zeit -> danach wieder versuchen
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
  const exhausted = ((await getSetting(env, 'gemini_exhausted')) || '').split(',').filter(x => x.startsWith(today)).map(x => x.slice(11));
  const usable = models.filter(m => !exhausted.includes(m));
  if (!usable.length) throw new Error('Gemini-Tageskontingent aufgebraucht');
  outer: for (const model of usable) {
    for (let attempt = 0; attempt < 2; attempt++) {
      res = await fetch(`${BASE}/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
      });
      data = await res.json().catch(() => ({}));
      if (res.ok) break outer;
      if (res.status !== 429 && res.status !== 503) break outer;
      if (res.status === 429 && /quota/i.test(data.error?.message || '')) {
        // Tageskontingent dieses Modells weg -> heute nicht mehr versuchen, direkt nächstes Modell
        exhausted.push(model);
        await setSetting(env, 'gemini_exhausted', exhausted.map(m => `${today} ${m}`).join(','));
        continue outer;
      }
      // überlastet / Kontingent: kurz warten, dann erneut bzw. nächstes Modell
      const wait = Number((JSON.stringify(data).match(/"retryDelay":"(\d+)s"/) || [])[1] || 0);
      await new Promise(r => setTimeout(r, Math.min(12, Math.max(4, wait)) * 1000));
    }
  }
  if (!res.ok) {
    await setSetting(env, 'gemini_last_error', `${new Date().toISOString()} ${res.status}: ${(data.error?.message || '').slice(0, 200)}`);
    if (res.status === 404) await setSetting(env, 'gemini_model_auto_at', '0'); // Modell weg -> neu suchen
    throw new Error(`Gemini ${res.status}: ${data.error?.message || 'Fehler'}`);
  }
  const cand = data.candidates?.[0];
  const text = cand?.content?.parts?.map(p => p.text || '').join('').trim();
  const sources = (cand?.groundingMetadata?.groundingChunks || []).map(c => c.web).filter(Boolean).map(w => ({ title: w.title, uri: w.uri }));
  return text ? { text, sources } : null;
}

async function generateJSON(env, opts) {
  const out = await generate(env, { ...opts, json: true });
  if (!out) return null;
  const raw = out.text.replace(/^```(?:json)?\s*|\s*```$/g, '');
  return JSON.parse(raw);
}

// Formulierungen, die rechtlich heikel sind oder nicht zur Marke passen
const BANNED = [/seevedeich|21217/i, /\d\s?(€|euro)/i, /\b(rabatt|prozent|angebotspreis|statt \d)/i, /heil(t|ung)?sversprechen/i, /garant/i, /für immer/i, /\bperfekt\b/i, /schmerzfrei/i, /schmerzlos/i, /medizinisch/i, /narben? (entfernen|weg)/i, /\bnur noch \d+ (termine|plätze)/i, /\bheute nur\b/i, /\bSie (können|sollten|haben|sind|werden)\b/];
const clean = s => !BANNED.some(r => r.test(s));
const offending = s => BANNED.map(r => (String(s).match(r) || [])[0]).filter(Boolean);

const factsFor = t => t.facts.map(f => `${f.k}: ${f.v}`).join('; ');

const TOPIC_TEXT = {
  werte: 'Nikitas Werte und Arbeitsweise (persönlich, Vertrauen, ohne Selbstvorstellung)',
  'ueber-mich': 'Vorstellung von Nikita selbst (Vertrauen aufbauen, persönlich, nahbar)',
  studio: 'Einblick ins Homestudio in Seevetal (Ruhe, Hygiene, Wohlfühlen)',
  ergebnis: 'Ergebnis einer Kundin (Vorher/Nachher)',
  reel: 'Reel mit Behandlungs- oder Ergebnis-Video',
};

export async function writeCaption(env, { topic, treatment, hook, note, hasBeforeAfter, healed, angle }, avoid = []) {
  const t = TREATMENTS[treatment] || TREATMENTS['powder-brows'];
  try {
    const out = await generate(env, {
      system: CAPTION_RULES.replace('{FACTS}', `${t.label} – ${factsFor(t)}`),
      prompt: `Schreibe die Caption für einen Instagram-Beitrag.
Behandlung: ${t.label}
Thema: ${TOPIC_TEXT[topic] || topic}${angle ? ` – Blickwinkel: ${angle}` : ''}${hasBeforeAfter ? ' (Karussell mit Vorher/Nachher-Vergleich)' : ''}${healed ? ', abgeheiltes Ergebnis' : topic === 'ergebnis' ? ', frisch gestochen' : ''}
Hook auf dem Bild: ${String(hook || '').replace(/_/g, '')}
${note ? `Hinweis von Nikita (ohne Namen verwenden): ${note}` : ''}
Hashtags am Ende genau so: ${hashtags(treatment)}
${avoid.length ? `Verwende diese Wörter/Formulierungen auf keinen Fall: ${avoid.join(', ')}` : ''}
Gib nur die fertige Caption aus.`,
    });
    if (out?.text && !clean(out.text) && !avoid.length) {
      await setSetting(env, 'gemini_last_error', `${new Date().toISOString()} Caption gefiltert: ${offending(out.text).join(', ')}`);
      return writeCaption(env, { topic, treatment, hook, note, hasBeforeAfter, healed, angle }, offending(out.text));
    }
    if (out?.text && clean(out.text)) {
      const tags = hashtags(treatment);
      return { text: `${out.text.replace(tags, '').trim()}\n\n${tags}`, ai: true };
    }
  } catch (e) {
    console.log('Caption-Fallback:', e.message);
  }
  return { text: fallbackCaption({ topic: topic === 'reel' ? 'ergebnis' : topic, treatment, hook }), ai: false };
}

// ---------- Ganze Karussells ----------
const len = (s, n) => typeof s === 'string' && s.trim().length > 0 && s.length <= n;

function validCarousel(c) {
  if (!c || !len(c.hook, 70) || !Array.isArray(c.slides) || c.slides.length < 2 || c.slides.length > 4) return false;
  for (const s of c.slides) {
    if (s.type === 'text') { if (!len(s.headline, 70) || !len(s.body, 190)) return false; }
    else if (s.type === 'list') {
      if (!len(s.headline, 45) || !Array.isArray(s.items) || s.items.length < 2 || s.items.length > 3) return false;
      if (!s.items.every(it => len(it.title, 38) && len(it.text, 100))) return false;
    } else return false;
  }
  return clean(JSON.stringify(c));
}

/**
 * Lässt Gemini ein komplettes Karussell schreiben.
 * @param stage reichweite | vertrauen | buchung
 * @param angle konkreter Blickwinkel (z. B. "Mythos oder Fakt")
 * @param learnings kurze Liste, was bisher gut lief (aus den Zahlen)
 */
export async function generateCarousel(env, { treatment, stage, angle, learnings = [], recentHooks = [] }) {
  const t = TREATMENTS[treatment] || TREATMENTS['powder-brows'];
  const goal = {
    reichweite: 'maximale Reichweite bei Frauen in Seevetal/Hamburg-Harburg, die Nikita noch nicht kennen: zum Speichern und Teilen animieren (Mehrwert, Aha-Effekt, Mythen aufklären)',
    vertrauen: 'Vertrauen aufbauen bei Interessentinnen, die noch zögern (Ablauf, Hygiene, Ehrlichkeit, natürliche Ergebnisse)',
    buchung: 'Interessentinnen zur Terminbuchung bewegen (Einwände ausräumen, Nutzen konkret machen, Angebot klar nennen, ein klarer nächster Schritt)',
  }[stage];
  try {
    const c = await generateJSON(env, {
      system: `${CAPTION_RULES.replace('{FACTS}', `${t.label} – ${factsFor(t)}`)}\n\nZusätzliche Fakten über das Studio: ${BRAND_FACTS}`,
      prompt: `Erstelle die Folientexte für ein Instagram-Karussell im ruhigen, hochwertigen Stil von NMY Cosmetics.
Behandlung: ${t.label}
Ziel: ${goal}
Blickwinkel: ${angle}
${learnings.length ? `Was bisher gut funktioniert hat: ${learnings.join('; ')}` : ''}
${recentHooks.length ? `Diese Hooks wurden kürzlich verwendet, nicht wiederholen: ${recentHooks.join(' | ')}` : ''}

Regeln für die Folien:
- "hook": Titel der ersten Folie, max. 60 Zeichen, macht neugierig. Ein Wort darf mit _Unterstrichen_ als kursiver Akzent markiert werden.
- "sub": optional, max. 80 Zeichen.
- "slides": 2–4 Folien, jeweils entweder {"type":"text","headline":"…","body":"…"} (headline max. 60, body max. 170 Zeichen, **fett** erlaubt)
  oder {"type":"list","headline":"…","items":[{"title":"…","text":"…"}]} (headline max. 40, 2–3 items, title max. 34, text max. 95).
- Keine Preis- oder Buchungsfolie – die hängt die App automatisch an.
- Nur die genannten Fakten verwenden, nichts erfinden (keine Preise, Zahlen, Studien, Schmerzangaben, Rabatte, Terminknappheit).
Antworte nur mit JSON: {"hook":"…","sub":"…","slides":[…]}`,
      temperature: 0.9,
    });
    if (validCarousel(c)) return c;
    console.log('Karussell ungültig, Fallback');
  } catch (e) {
    console.log('Karussell-Fallback:', e.message);
  }
  return null;
}

// ---------- Buchungs-Story ----------
export async function generateBookingStory(env, { treatment, recent = [] }) {
  const t = TREATMENTS[treatment] || TREATMENTS['powder-brows'];
  try {
    const s = await generateJSON(env, {
      system: `${CAPTION_RULES.replace('{FACTS}', `${t.label} – ${factsFor(t)}`)}\n\nZusätzliche Fakten: ${BRAND_FACTS}`,
      prompt: `Schreibe eine Instagram-Story (nur Text auf beigem Hintergrund), die Interessentinnen zur Terminbuchung über den Link in der Bio bewegt.
Behandlung: ${t.label}. Kurz, ruhig, hochwertig, ein klarer Nutzen.
${recent.length ? `Nicht wiederholen: ${recent.join(' | ')}` : ''}
JSON: {"label":"max. 28 Zeichen, z. B. Behandlung · Seevetal","headline":"max. 55 Zeichen, ein Wort darf _kursiv_ sein","body":"max. 110 Zeichen"}`,
      temperature: 0.9,
    });
    if (s && len(s.label, 32) && len(s.headline, 60) && len(s.body, 120) && clean(JSON.stringify(s))) return s;
  } catch (e) { console.log('Story-Fallback:', e.message); }
  return null;
}

// ---------- Filmideen für Reels ----------
export async function filmIdeas(env, learnings = []) {
  const out = await generate(env, {
    system: 'Du bist Reel-Strategin für ein kleines, hochwertiges Permanent-Make-up-Studio in Seevetal bei Hamburg. Ziel: Reichweite bei neuen Kundinnen und Terminbuchungen. Antworte auf Deutsch, knapp, umsetzbar. Keine Tanz-Trends, keine erfundenen Fakten.',
    prompt: `Gib 3 Reel-Ideen für diese Woche, die Nikita mit dem Handy während normaler Termine filmen kann (Kundin liegt auf der Liege, nur Einwilligungs-Kundinnen; Nikita muss nicht sprechen).
Behandlungen: Powder Brows (Hauptfokus), Lip Blush, Lashlifting.
${learnings.length ? `Was bisher gut lief: ${learnings.join('; ')}` : ''}
Pro Idee:
**Titel**
- Hook-Text (erste 2 Sekunden, max. 8 Wörter, Du-Form)
- Was filmen (3–4 kurze Einstellungen, je 2–4 Sek.)
- Warum es Reichweite/Buchungen bringt (1 Satz)`,
    temperature: 0.8,
    search: false,
  });
  return out?.text || null;
}

export async function trendRadar(env) {
  return generate(env, {
    system: 'Du bist Social-Media-Strategin für ein kleines Permanent-Make-up-Studio bei Hamburg. Ziel: neue Kundinnen und Terminbuchungen. Antworte auf Deutsch, konkret und knapp.',
    prompt: `Recherchiere aktuelle Instagram-Trends (letzte 4 Wochen) rund um Permanent Make-up, Powder Brows, Lip Blush und Beauty in Deutschland.
Liefere:
1. 5 aktuelle Reel-Formate/Trends, die zu einem ruhigen, hochwertigen, natürlichen Stil passen (keine Tanz-Trends), jeweils mit konkreter Umsetzungsidee für ein Studio, das Kundinnen auf der Liege filmt.
2. 5 Hook-Ideen in Du-Form, die neue Kundinnen ansprechen.
3. Saisonale Anlässe der nächsten 4 Wochen, die sich für Beiträge mit Buchungsaufruf eignen.
4. 1 Warnung: welche Trends nicht zur Marke passen.
Nur belegbare Aussagen.`,
    search: true,
    temperature: 0.4,
  });
}

export async function analyse(env, summary) {
  return generate(env, {
    system: 'Du bist Performance-Marketing-Analystin. Oberstes Ziel: mehr Terminbuchungen und mehr Reichweite bei neuen Kundinnen für ein Permanent-Make-up-Studio in Seevetal. Antworte auf Deutsch, in kurzen Stichpunkten, mit klaren nächsten Schritten. Keine erfundenen Zahlen.',
    prompt: `Hier die Daten der letzten Wochen (JSON):\n${JSON.stringify(summary).slice(0, 25000)}\n
Beantworte:
1. Welche Inhalte (Thema/Format/Wochentag/Uhrzeit) bringen Reichweite (Reichweite, Speichern, Teilen) und welche Buchungen?
2. Gibt es einen Zusammenhang zwischen Beiträgen und Buchungs-Klicks/Buchungen in den 72 Stunden danach?
3. Drei konkrete Änderungen für die nächsten 2 Wochen.
Wenn zu wenig Daten vorliegen, sag das ehrlich und nenne, was gesammelt werden muss.`,
    temperature: 0.3,
  });
}

// ---------- Caption-Vorschlag für eigene Aktionen ----------
// Angebote/Preise NUR, wenn Nikita sie selbst angibt – dann wörtlich. Nichts erfinden.
export async function suggestActionCaption(env, { title = '', details = '', kind = 'post' }) {
  const rules = CAPTION_RULES
    .replace('- KEINE Preise, Rabatte oder Euro-Beträge nennen.', '- Preise, Rabatte oder Zeiträume NUR verwenden, wenn sie in Nikitas Angaben stehen – dann wörtlich übernehmen. Nichts dazuerfinden.')
    .replace('{FACTS}', BRAND_FACTS);
  const out = await generate(env, {
    system: rules,
    prompt: `Schreibe die Caption für einen Instagram-${kind === 'reel' ? 'Reel' : 'Beitrag'} zu einer Aktion.
Aktion: ${title}
Nikitas Angaben (verbindlich, nichts hinzufügen): ${details || '(keine weiteren Angaben)'}
Klarer Call-to-Action: "Termin online buchen – Link in der Bio".
Hashtags am Ende: ${hashtags('powder-brows')}
Gib nur die fertige Caption aus.`,
    temperature: 0.8,
  }).catch(() => null);
  if (!out?.text) return null;
  const strict = BANNED.filter(r => !/€|euro|rabatt|statt/.test(r.source));
  if (strict.some(r => r.test(out.text))) return null;
  // Jede Zahl mit € / % in der KI-Caption muss aus Nikitas Angaben stammen
  const nums = out.text.match(/\d+[.,]?\d*\s?(€|%|euro|prozent)/gi) || [];
  if (nums.some(x => !details.replace(/\s/g, '').toLowerCase().includes(x.replace(/\s/g, '').toLowerCase()))) return null;
  return out.text;
}
