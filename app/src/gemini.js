// Gemini (kostenlose Stufe): Captions, Trend-Radar, Analyse.
// Datenschutz: Es werden NIE Fotos oder Namen von Kundinnen übertragen – nur Behandlung, Thema und Kennzahlen.
import { TREATMENTS, CAPTION_RULES, hashtags, fallbackCaption } from './brand.js';
import { getSetting } from './util.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

async function generate(env, { system, prompt, search = false, temperature = 0.8 }) {
  const key = await getSetting(env, 'gemini_key');
  if (!key) return null;
  const model = (await getSetting(env, 'gemini_model')) || 'gemini-2.5-flash';
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens: 2048 },
  };
  if (search) body.tools = [{ google_search: {} }];
  const res = await fetch(`${BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${data.error?.message || 'Fehler'}`);
  const cand = data.candidates?.[0];
  const text = cand?.content?.parts?.map(p => p.text || '').join('').trim();
  const sources = (cand?.groundingMetadata?.groundingChunks || []).map(c => c.web).filter(Boolean).map(w => ({ title: w.title, uri: w.uri }));
  return text ? { text, sources } : null;
}

// Formulierungen, die rechtlich heikel sind oder nicht zur Marke passen
const BANNED = [/heil(t|ung)?sversprechen/i, /garant/i, /für immer/i, /\bperfekt\b/i, /schmerzfrei/i, /medizinisch/i, /narben? (entfernen|weg)/i];

export async function writeCaption(env, { topic, treatment, hook, note, hasBeforeAfter, healed }) {
  const t = TREATMENTS[treatment] || TREATMENTS['powder-brows'];
  const facts = [...t.facts.map(f => `${f.k}: ${f.v}`), `Preis: ${t.price.new}${t.price.old ? ` statt ${t.price.old}` : ''}`].join('; ');
  try {
    const out = await generate(env, {
      system: CAPTION_RULES.replace('{FACTS}', `${t.label} – ${facts}`),
      prompt: `Schreibe die Caption für einen Instagram-Beitrag.
Behandlung: ${t.label}
Thema: ${{ werte: 'Nikitas Werte und Arbeitsweise (persönlich, Vertrauen, ohne Selbstvorstellung)', 'ueber-mich': 'Vorstellung von Nikita selbst (Vertrauen aufbauen, persönlich, nahbar)', studio: 'Einblick ins Homestudio in Seevetal (Ruhe, Hygiene, Wohlfühlen)' }[topic] || topic}${hasBeforeAfter ? ' (Karussell mit Vorher/Nachher-Vergleich)' : ''}${healed ? ', abgeheiltes Ergebnis' : topic === 'ergebnis' ? ', frisch gestochen' : ''}
Hook auf dem Bild: ${hook.replace(/_/g, '')}
${note ? `Hinweis von Nikita (ohne Namen verwenden): ${note}` : ''}
Hashtags am Ende genau so: ${hashtags(treatment)}
Gib nur die fertige Caption aus.`,
    });
    if (out?.text && !BANNED.some(r => r.test(out.text))) return out.text;
  } catch (e) {
    console.log('Caption-Fallback:', e.message);
  }
  return fallbackCaption({ topic: topic === 'reel' ? 'ergebnis' : topic, treatment, hook });
}

export async function trendRadar(env) {
  return generate(env, {
    system: 'Du bist Social-Media-Strategin für ein kleines Permanent-Make-up-Studio bei Hamburg. Antworte auf Deutsch, konkret und knapp.',
    prompt: `Recherchiere aktuelle Instagram-Trends (letzte 4 Wochen) rund um Permanent Make-up, Powder Brows, Lip Blush und Beauty in Deutschland.
Liefere:
1. 5 aktuelle Reel-Formate/Trends, die zu einem ruhigen, hochwertigen, natürlichen Stil passen (keine Tanz-Trends), jeweils mit konkreter Umsetzungsidee für ein Studio, das Kundinnen auf der Liege filmt.
2. 5 Hook-Ideen in Du-Form.
3. Saisonale Anlässe der nächsten 4 Wochen, die sich für Beiträge eignen.
4. 1 Warnung: welche Trends nicht zur Marke passen.
Nur belegbare Aussagen.`,
    search: true,
    temperature: 0.4,
  });
}

export async function analyse(env, summary) {
  return generate(env, {
    system: 'Du bist Performance-Marketing-Analystin. Ziel: mehr Buchungen für ein Permanent-Make-up-Studio in Seevetal. Antworte auf Deutsch, in kurzen Stichpunkten, mit klaren nächsten Schritten. Keine erfundenen Zahlen.',
    prompt: `Hier die Daten der letzten Wochen (JSON):\n${JSON.stringify(summary).slice(0, 25000)}\n
Beantworte:
1. Welche Inhalte (Thema/Format/Wochentag/Uhrzeit) laufen gut, welche schlecht – gemessen an Reichweite, Speicherungen und Buchungen?
2. Gibt es einen Zusammenhang zwischen Beiträgen und Bio-Klicks/Buchungen in den 48 Stunden danach?
3. Drei konkrete Änderungen für die nächsten 2 Wochen.
Wenn zu wenig Daten vorliegen, sag das ehrlich und nenne, was gesammelt werden muss.`,
    temperature: 0.3,
  });
}
