// Buchungs-/Anfrage-Funnel in 3 Schritten als Bottom-Sheet (mobil zuerst).
// Datenschutz: Es wird NICHTS auf dem Server gespeichert. Die Angaben werden nur zu einer
// WhatsApp-Nachricht zusammengesetzt, die die Kundin selbst an Nikita sendet.
import { useEffect, useRef, useState } from 'react';
import { FUNNEL, BRAND } from '../content/site.js';
import { whatsappLink, bookingLink } from '../lib.js';
import { Arrow } from './ui.jsx';

const STEPS = ['Behandlung', 'Zeitraum', 'Über dich'];

function Choice({ name, value, checked, onChange, title, hint, type = 'radio' }) {
  return (
    <label className={`flex min-h-[3.75rem] cursor-pointer items-center gap-4 rounded-[var(--radius-tile)] border px-4 py-3 transition-colors ${checked ? 'border-ink-strong bg-tile' : 'border-line bg-transparent'}`}>
      <input type={type} name={name} value={value} checked={checked} onChange={onChange} className="h-5 w-5 flex-none accent-[var(--color-ink-strong)]" />
      <span className="leading-snug"><span className="font-semibold">{title}</span>{hint && <span className="block text-[0.875rem] text-ink">{hint}</span>}</span>
    </label>
  );
}

export default function BookingSheet({ open, preset, onClose }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ treatment: '', period: '', times: [], name: '', hadPmu: '', note: '' });
  const [sent, setSent] = useState(false);
  const panel = useRef(null);
  const heading = useRef(null);

  // Öffnen: Vorauswahl übernehmen, Fokus setzen, Escape schließt
  useEffect(() => {
    if (!open) return;
    setStep(preset ? 1 : 0); setSent(false);
    if (preset) setData(d => ({ ...d, treatment: preset }));
    const t = setTimeout(() => heading.current?.focus(), 60);
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', onKey);
    return () => { clearTimeout(t); removeEventListener('keydown', onKey); };
  }, [open, preset]);
  useEffect(() => { heading.current?.focus(); }, [step, sent]);

  const tr = FUNNEL.treatments.find(t => t.id === data.treatment);
  const canNext = [!!data.treatment, !!data.period, data.name.trim().length > 1][step];
  const message = [
    `Hallo ${BRAND.firstName}, ich interessiere mich für: ${tr?.name || '–'}.`,
    `Wunschzeitraum: ${data.period || '–'}${data.times.length ? ` (${data.times.join(', ')})` : ''}.`,
    data.hadPmu && `Schon einmal Permanent Make-up in diesem Bereich: ${data.hadPmu}.`,
    data.note.trim() && `Hinweis: ${data.note.trim()}`,
    `Viele Grüße, ${data.name.trim()}`,
  ].filter(Boolean).join('\n');

  const toggleTime = v => setData(d => ({ ...d, times: v === 'Egal' ? ['Egal'] : d.times.includes(v) ? d.times.filter(x => x !== v) : [...d.times.filter(x => x !== 'Egal'), v] }));

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}
      style={{ visibility: open ? 'visible' : 'hidden', transition: open ? 'visibility 0s' : 'visibility 0s linear .5s' }}>
      <div onClick={onClose} className={`absolute inset-0 bg-black/35 transition-opacity duration-500 ${open ? 'opacity-100' : 'opacity-0'}`} />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="sheet-title" data-lenis-prevent
        className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[92svh] max-w-[640px] flex-col rounded-t-[1.25rem] bg-page shadow-[var(--shadow-sheet)] transition-transform duration-500 ease-[var(--ease-soft)] ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-between px-[var(--spacing-pad)] pb-2 pt-4">
          {!sent && step > 0 ? <button onClick={() => setStep(step - 1)} className="min-h-11 pr-4 text-[0.9375rem] text-ink">← Zurück</button> : <span />}
          <button onClick={onClose} aria-label="Schließen" className="grid h-11 w-11 place-items-center rounded-full text-2xl text-ink">×</button>
        </div>

        <div className="overflow-y-auto px-[var(--spacing-pad)] pb-[calc(24px+env(safe-area-inset-bottom))]">
          {!sent ? (
            <>
              <p className="label font-bold">Schritt {step + 1} von 3 · {STEPS[step]}</p>
              <div className="mt-3 flex gap-1.5" aria-hidden="true">{STEPS.map((s, i) => <span key={s} className={`h-[3px] flex-1 rounded-full transition-colors duration-500 ${i <= step ? 'bg-ink-strong' : 'bg-line'}`} />)}</div>

              {step === 0 && (<fieldset className="mt-6">
                <legend><h2 id="sheet-title" ref={heading} tabIndex={-1} className="title-sm outline-none">Was wünschst du dir?</h2></legend>
                <div className="mt-5 grid gap-2.5">{FUNNEL.treatments.map(t => <Choice key={t.id} name="tr" value={t.id} title={t.name} hint={t.hint} checked={data.treatment === t.id} onChange={() => setData({ ...data, treatment: t.id })} />)}</div>
              </fieldset>)}

              {step === 1 && (<fieldset className="mt-6">
                <legend><h2 id="sheet-title" ref={heading} tabIndex={-1} className="title-sm outline-none">Wann passt es dir?</h2></legend>
                <div className="mt-5 grid gap-2.5">{FUNNEL.periods.map(p => <Choice key={p} name="pe" value={p} title={p} checked={data.period === p} onChange={() => setData({ ...data, period: p })} />)}</div>
                <p className="mt-7 font-semibold">Welche Tageszeit? <span className="font-normal text-ink">(optional)</span></p>
                <div className="mt-3 flex flex-wrap gap-2">{FUNNEL.times.map(t => (
                  <button key={t} type="button" aria-pressed={data.times.includes(t)} onClick={() => toggleTime(t)}
                    className={`min-h-11 rounded-full border px-4 text-[0.9375rem] ${data.times.includes(t) ? 'border-ink-strong bg-ink-strong text-white' : 'border-line'}`}>{t}</button>))}</div>
              </fieldset>)}

              {step === 2 && (<div className="mt-6">
                <h2 id="sheet-title" ref={heading} tabIndex={-1} className="title-sm outline-none">Fast geschafft.</h2>
                <label className="mt-5 block"><span className="font-semibold">Dein Vorname</span>
                  <input value={data.name} onChange={e => setData({ ...data, name: e.target.value })} autoComplete="given-name" maxLength={40}
                    className="mt-2 block min-h-[3.25rem] w-full rounded-xl border border-line bg-tile px-4 text-base" /></label>
                {['powder-brows', 'lip-blush', 'auffrischen'].includes(data.treatment) && (<fieldset className="mt-6">
                  <legend className="font-semibold">Hattest du dort schon einmal Permanent Make-up?</legend>
                  <div className="mt-3 grid grid-cols-2 gap-2.5">{['Nein', 'Ja'].map(v => <Choice key={v} name="pmu" value={v} title={v} checked={data.hadPmu === v} onChange={() => setData({ ...data, hadPmu: v })} />)}</div>
                </fieldset>)}
                <label className="mt-6 block"><span className="font-semibold">Möchtest du noch etwas sagen?</span> <span className="text-ink">(optional)</span>
                  <textarea value={data.note} onChange={e => setData({ ...data, note: e.target.value })} maxLength={300} rows={3} placeholder="z. B. Wünsche zur Form, Allergien, Fragen"
                    className="mt-2 block w-full rounded-xl border border-line bg-tile px-4 py-3 text-base" /></label>
                <p className="mt-4 text-[0.875rem] leading-relaxed text-ink">Deine Angaben werden nicht auf dieser Seite gespeichert. Sie werden nur zu einer WhatsApp-Nachricht zusammengesetzt, die du selbst absendest.</p>
              </div>)}

              <div className="mt-8 flex flex-col gap-3">
                {step < 2
                  ? <button disabled={!canNext} onClick={() => setStep(step + 1)} className="pill pill-solid !min-h-[3.25rem] w-full disabled:opacity-40">Weiter <Arrow /></button>
                  : <a href={canNext ? whatsappLink('anfrage', message) : undefined} aria-disabled={!canNext} target="_blank" rel="noopener"
                      onClick={e => { if (!canNext) e.preventDefault(); else setTimeout(() => setSent(true), 400); }}
                      className={`pill pill-solid !min-h-[3.25rem] w-full ${canNext ? '' : 'pointer-events-none opacity-40'}`}>Anfrage per WhatsApp senden <Arrow /></a>}
                <a href={bookingLink('anfrage')} className="text-center text-[0.9375rem] text-ink underline underline-offset-4">Lieber direkt selbst online buchen</a>
              </div>
            </>
          ) : (
            <div className="pt-4">
              <p className="label font-bold">Danke, {data.name.trim()}</p>
              <h2 id="sheet-title" ref={heading} tabIndex={-1} className="mt-3 title-sm outline-none">So geht es weiter.</h2>
              <ol className="mt-6">{FUNNEL.nextSteps.map((s, i) => (
                <li key={s} className="grid grid-cols-[2.25rem_1fr] border-t border-line py-4"><span className="pt-0.5 text-[0.8125rem] font-semibold text-ink">0{i + 1}</span><span>{s}</span></li>))}</ol>
              <p className="mt-4 text-[0.9375rem] text-ink">WhatsApp hat sich nicht geöffnet? <a className="underline underline-offset-4" href={whatsappLink('anfrage', message)} target="_blank" rel="noopener">Hier noch einmal versuchen</a>.</p>
              <div className="mt-8 flex flex-col gap-3">
                <a href={bookingLink('danke')} className="pill pill-line w-full">Oder direkt online buchen <Arrow /></a>
                <button onClick={onClose} className="min-h-11 text-[0.9375rem] text-ink">Zurück zur Seite</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
