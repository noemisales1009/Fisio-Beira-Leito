import { useState } from 'react';

/* ─── Tipos e helpers ─────────────────────────────────── */
interface ScaleOption { text: string; val: number }
interface ScaleItem   { label: string; options: ScaleOption[] }
interface Badge       { t: string; c: string }

const BADGE_OK    = 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30';
const BADGE_LEVE  = 'bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-500/30';
const BADGE_MOD   = 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30';
const BADGE_GRAVE = 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30';

const selectCls = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-xs rounded-xl p-3 text-slate-800 dark:text-white focus:outline-none focus:border-clinical-500 transition-colors";
const inputCls  = selectCls;

/* ─── Formulário genérico de escala ──────────────────── */
function ScaleForm({ title, note, items, max, badge }: {
  title: string; note?: string; items: ScaleItem[]; max: number; badge: (total: number) => Badge;
}) {
  const [vals, setVals] = useState<number[]>(items.map(i => i.options[0].val));
  const total = vals.reduce((s, v) => s + v, 0);
  const b = badge(total);
  return (
    <div className="space-y-5">
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-850 transition-colors">
        <span className="text-xs font-bold text-clinical-600 dark:text-clinical-400 block mb-1"><i className="fa-solid fa-info-circle mr-1"></i>{title}</span>
        {note && <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{note}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((item, i) => (
          <div key={item.label}>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">{item.label}</label>
            <select
              value={vals[i]}
              onChange={e => setVals(v => v.map((x, j) => j === i ? parseInt(e.target.value) : x))}
              className={selectCls}
            >
              {item.options.map(o => <option key={o.text} value={o.val}>{o.text} [{o.val}]</option>)}
            </select>
          </div>
        ))}
      </div>
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-xl flex items-center justify-between transition-colors">
        <div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase block font-semibold">Resultado do Score</span>
          <span className="text-3xl font-extrabold text-slate-800 dark:text-white">{total} <span className="text-slate-400 text-lg">/ {max}</span></span>
        </div>
        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border transition-colors ${b.c}`}>{b.t}</span>
      </div>
    </div>
  );
}

/* ─── BSA-NEO — Boletim de Silverman-Andersen (neonatos) ── */
const BSA_ITEMS: ScaleItem[] = [
  { label: 'Mov. tóraco-abdominal', options: [
    { text: 'Sincronizado', val: 0 }, { text: 'Atraso na inspiração', val: 1 }, { text: 'Balanço (gangorra)', val: 2 }] },
  { label: 'Retração intercostal', options: [
    { text: 'Ausente', val: 0 }, { text: 'Discreta', val: 1 }, { text: 'Acentuada', val: 2 }] },
  { label: 'Retração xifoide', options: [
    { text: 'Ausente', val: 0 }, { text: 'Discreta', val: 1 }, { text: 'Acentuada', val: 2 }] },
  { label: 'Batimento de asa nasal', options: [
    { text: 'Ausente', val: 0 }, { text: 'Discreto', val: 1 }, { text: 'Acentuado', val: 2 }] },
  { label: 'Gemido expiratório', options: [
    { text: 'Ausente', val: 0 }, { text: 'Audível c/ estetoscópio', val: 1 }, { text: 'Audível sem estetoscópio', val: 2 }] },
];
const bsaBadge = (t: number): Badge =>
  t === 0 ? { t: 'Sem desconforto', c: BADGE_OK }
  : t <= 5 ? { t: 'Desconforto leve/moderado', c: BADGE_MOD }
  : { t: 'Desconforto grave', c: BADGE_GRAVE };

/* ─── Wood-Downes modificado por Ferrés (até 2 anos) ──── */
const WDF_ITEMS: ScaleItem[] = [
  { label: 'Sibilância', options: [
    { text: 'Não', val: 0 }, { text: 'Final da expiração', val: 1 }, { text: 'Toda a expiração', val: 2 }, { text: 'Inspiração e expiração', val: 3 }] },
  { label: 'Tiragem', options: [
    { text: 'Não', val: 0 }, { text: 'Subcostal + intercostal inferior', val: 1 }, { text: '+ Supraclavicular + asa nasal', val: 2 }, { text: '+ Intercostal sup. + supraesternal', val: 3 }] },
  { label: 'Frequência Respiratória', options: [
    { text: '< 30', val: 0 }, { text: '31–45', val: 1 }, { text: '46–60', val: 2 }, { text: '> 60', val: 3 }] },
  { label: 'Frequência Cardíaca', options: [
    { text: '< 120', val: 0 }, { text: '> 120', val: 1 }] },
  { label: 'Entrada de Ar (Ausculta)', options: [
    { text: 'Boa e simétrica', val: 0 }, { text: 'Regular e simétrica', val: 1 }, { text: 'Muito diminuída', val: 2 }, { text: 'Tórax silente', val: 3 }] },
  { label: 'Cianose', options: [
    { text: 'Não', val: 0 }, { text: 'Sim', val: 1 }] },
];
const wdfBadge = (t: number): Badge =>
  t === 0 ? { t: 'Sem alterações', c: BADGE_OK }
  : t <= 3 ? { t: 'Crise leve', c: BADGE_LEVE }
  : t <= 7 ? { t: 'Crise moderada', c: BADGE_MOD }
  : { t: 'Crise grave', c: BADGE_GRAVE };

/* ─── Glasgow (pediátrico) ────────────────────────────── */
const GLASGOW_ITEMS: ScaleItem[] = [
  { label: 'Abertura Ocular', options: [
    { text: 'Espontânea', val: 4 }, { text: 'Ao chamado / voz', val: 3 }, { text: 'À dor', val: 2 }, { text: 'Ausente', val: 1 }] },
  { label: 'Resposta Verbal', options: [
    { text: 'Balbucia / orientado', val: 5 }, { text: 'Choro irritado / confuso', val: 4 }, { text: 'Choro à dor', val: 3 }, { text: 'Gemido à dor', val: 2 }, { text: 'Ausente', val: 1 }] },
  { label: 'Resposta Motora', options: [
    { text: 'Mov. espontâneos / obedece', val: 6 }, { text: 'Localiza a dor', val: 5 }, { text: 'Retirada à dor', val: 4 }, { text: 'Flexão anormal', val: 3 }, { text: 'Extensão anormal', val: 2 }, { text: 'Ausente', val: 1 }] },
];
const glasgowBadge = (t: number): Badge =>
  t >= 13 ? { t: 'Alteração leve / normal', c: BADGE_OK }
  : t >= 9 ? { t: 'Alteração moderada', c: BADGE_MOD }
  : { t: 'Alteração grave', c: BADGE_GRAVE };

/* ─── COMFORT-B (sedação/conforto) ────────────────────── */
const COMFORT_ITEMS: ScaleItem[] = [
  { label: 'Alerta', options: [
    { text: 'Sono profundo', val: 1 }, { text: 'Sono leve', val: 2 }, { text: 'Sonolento', val: 3 }, { text: 'Acordado e alerta', val: 4 }, { text: 'Hiperalerta', val: 5 }] },
  { label: 'Calma / Agitação', options: [
    { text: 'Calmo', val: 1 }, { text: 'Levemente ansioso', val: 2 }, { text: 'Ansioso', val: 3 }, { text: 'Muito ansioso', val: 4 }, { text: 'Em pânico', val: 5 }] },
  { label: 'Resposta Respiratória', options: [
    { text: 'Sem tosse, respiração tranquila', val: 1 }, { text: 'Respiração espontânea, pouca resposta à VM', val: 2 }, { text: 'Tosse ocasional / resistência leve', val: 3 }, { text: 'Respira ativamente contra o ventilador', val: 4 }, { text: 'Briga com o ventilador', val: 5 }] },
  { label: 'Movimentos Físicos', options: [
    { text: 'Nenhum', val: 1 }, { text: 'Leves e ocasionais', val: 2 }, { text: 'Leves e frequentes', val: 3 }, { text: 'Vigorosos (extremidades)', val: 4 }, { text: 'Vigorosos (tronco e cabeça)', val: 5 }] },
  { label: 'Tônus Muscular', options: [
    { text: 'Relaxado', val: 1 }, { text: 'Reduzido', val: 2 }, { text: 'Normal', val: 3 }, { text: 'Aumentado (flexão de dedos)', val: 4 }, { text: 'Rigidez extrema', val: 5 }] },
  { label: 'Tensão Facial', options: [
    { text: 'Relaxada', val: 1 }, { text: 'Normal', val: 2 }, { text: 'Tensão em alguns músculos', val: 3 }, { text: 'Tensão evidente em toda a face', val: 4 }, { text: 'Careta / distorção facial', val: 5 }] },
];
const comfortBadge = (t: number): Badge =>
  t <= 10 ? { t: 'Sedação profunda', c: BADGE_MOD }
  : t <= 22 ? { t: 'Sedação adequada', c: BADGE_OK }
  : { t: 'Sedação insuficiente / dor', c: BADGE_GRAVE };

/* ─── Calculadora de Oxigenação ───────────────────────── */
function OxigenacaoCalc() {
  const [f, setF] = useState({ pao2: '', fio2: '', spo2: '', map: '' });
  const set = (k: string, v: string) => setF(x => ({ ...x, [k]: v }));
  const pao2 = parseFloat(f.pao2), fio2 = parseFloat(f.fio2), spo2 = parseFloat(f.spo2), map = parseFloat(f.map);

  const pf  = pao2 > 0 && fio2 > 0 ? +(pao2 / fio2).toFixed(0) : null;
  const sf  = spo2 > 0 && fio2 > 0 ? +(spo2 / fio2).toFixed(0) : null;
  const io  = map > 0 && fio2 > 0 && pao2 > 0 ? +(map * fio2 * 100 / pao2).toFixed(1) : null;
  const iso = map > 0 && fio2 > 0 && spo2 > 0 ? +(map * fio2 * 100 / spo2).toFixed(1) : null;

  const results = [
    { l: 'P/F (PaO₂/FiO₂)', v: pf,  alerta: pf !== null && pf < 200,
      r: pf === null ? 'Preencher PaO₂ e FiO₂' : pf < 100 ? 'SARA grave' : pf < 200 ? 'SARA moderada' : pf < 300 ? 'SARA leve' : 'Normal' },
    { l: 'S/F (SpO₂/FiO₂)', v: sf,  alerta: sf !== null && sf < 264,
      r: sf === null ? 'Preencher SpO₂ e FiO₂' : '<264 ≈ P/F<300 · <221 ≈ P/F<200' },
    { l: 'IO — Gasometria', v: io,  alerta: io !== null && io > 8,
      r: io === null ? 'Preencher MAP, FiO₂ e PaO₂' : 'IO = MAP×FiO₂×100/PaO₂' },
    { l: 'ISO — Oximetria', v: iso, alerta: iso !== null && iso > 7.5,
      r: iso === null ? 'Preencher MAP, FiO₂ e SpO₂' : 'ISO = MAP×FiO₂×100/SpO₂' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { k: 'pao2', label: 'PaO₂ (mmHg)' },
          { k: 'fio2', label: 'FiO₂ (0.21–1.0)' },
          { k: 'spo2', label: 'SpO₂ (%)' },
          { k: 'map',  label: 'MAP (cmH₂O)' },
        ].map(c => (
          <div key={c.k}>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">{c.label}</label>
            <input type="number" step="any" value={(f as any)[c.k]} onChange={e => set(c.k, e.target.value)} className={inputCls} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {results.map(item => (
          <div key={item.l} className={`p-4 rounded-xl border transition-colors ${item.alerta
            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-700/40'
            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-850'}`}>
            <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-widest block mb-1">{item.l}</span>
            <span className={`text-2xl font-extrabold font-mono ${item.alerta ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>{item.v ?? '—'}</span>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">{item.r}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Página de Scores ────────────────────────────────── */
const CARDS = [
  { key: 'conforto',   icon: 'fa-child',      title: 'Conforto Respiratório',    sub: 'BSA-NEO (neonatos) · Wood-Downes-Ferrés (até 2 anos)' },
  { key: 'glasgow',    icon: 'fa-brain',      title: 'Glasgow',                  sub: 'Escala de Coma de Glasgow pediátrica (3–15)' },
  { key: 'comfort',    icon: 'fa-bed',        title: 'COMFORT-B',                sub: 'Sedação e conforto em UTI pediátrica (6–30)' },
  { key: 'oxigenacao', icon: 'fa-lungs',      title: 'Oxigenação',               sub: 'Relação P/F, Relação S/F, IO / ISO' },
  { key: 'parametros', icon: 'fa-wind',       title: 'Parâmetros Ventilatórios', sub: 'Volume Corrente por Peso, MAP, Ventilation Index (VI)' },
  { key: 'mecanica',   icon: 'fa-chart-line', title: 'Mecânica Respiratória',    sub: 'Driving Pressure (ΔP), Complacência, Resistência' },
];

export default function Scores() {
  const [activeCalc, setActiveCalc] = useState<string | null>(null);
  const [confortoEscala, setConfortoEscala] = useState<'bsa' | 'wdf'>('wdf');
  const activeCard = CARDS.find(c => c.key === activeCalc);

  return (
    <section className="p-4 md:p-6 space-y-6">
      {!activeCalc && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CARDS.map(c => (
            <div key={c.key} onClick={() => setActiveCalc(c.key)}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:border-clinical-400 dark:hover:border-clinical-500/60 p-6 rounded-2xl cursor-pointer hover:-translate-y-1 transition duration-300 flex flex-col items-center text-center shadow-sm hover:shadow-md dark:shadow-lg group">
              <div className="w-16 h-16 bg-clinical-500 text-white rounded-2xl flex items-center justify-center text-2xl shadow-md mb-4 transition-transform group-hover:scale-105">
                <i className={`fa-solid ${c.icon}`}></i>
              </div>
              <h3 className="text-sm md:text-base font-semibold text-clinical-800 dark:text-white font-title transition-colors">{c.title}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed transition-colors">{c.sub}</p>
            </div>
          ))}
        </div>
      )}

      {activeCalc && activeCard && (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 shadow-sm dark:shadow-none p-6 rounded-2xl animate-in fade-in zoom-in-95 duration-200 transition-colors">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-850 pb-4 mb-6 transition-colors">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-clinical-100 dark:bg-clinical-500/10 text-clinical-600 dark:text-clinical-400 flex items-center justify-center text-lg transition-colors">
                <i className={`fa-solid ${activeCard.icon}`}></i>
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase transition-colors">{activeCard.title}</h3>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 transition-colors">Insira os dados clínicos</span>
              </div>
            </div>
            <button onClick={() => setActiveCalc(null)} className="text-slate-400 hover:text-slate-800 dark:hover:text-white transition">
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          {activeCalc === 'conforto' && (
            <div className="space-y-5">
              <div className="flex gap-2">
                {[
                  { key: 'wdf', label: 'Wood-Downes-Ferrés', desc: 'até 2 anos' },
                  { key: 'bsa', label: 'BSA-NEO', desc: 'neonatos' },
                ].map(t => (
                  <button key={t.key} onClick={() => setConfortoEscala(t.key as 'bsa' | 'wdf')}
                    className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition ${confortoEscala === t.key
                      ? 'bg-clinical-500 text-white border-clinical-500 shadow-md shadow-clinical-500/30'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-850 text-slate-500 dark:text-slate-400 hover:border-clinical-400'}`}>
                    {t.label} <span className="font-normal opacity-80">({t.desc})</span>
                  </button>
                ))}
              </div>
              {confortoEscala === 'wdf'
                ? <ScaleForm key="wdf" title="Wood-Downes modificado por Ferrés" note="Avaliação do desconforto respiratório em lactentes e crianças até 2 anos. Crise leve 1–3 · moderada 4–7 · grave 8–14." items={WDF_ITEMS} max={14} badge={wdfBadge} />
                : <ScaleForm key="bsa" title="Boletim de Silverman-Andersen (BSA-NEO)" note="Avaliação do desconforto respiratório neonatal. 0 = sem desconforto · 1–5 = leve/moderado · ≥6 = grave." items={BSA_ITEMS} max={10} badge={bsaBadge} />}
            </div>
          )}

          {activeCalc === 'glasgow' && (
            <ScaleForm title="Escala de Coma de Glasgow — Pediátrica" note="Leve 13–15 · Moderada 9–12 · Grave 3–8." items={GLASGOW_ITEMS} max={15} badge={glasgowBadge} />
          )}

          {activeCalc === 'comfort' && (
            <ScaleForm title="Escala COMFORT-Behavior (COMFORT-B)" note="Avaliação de sedação e conforto. 6–10 sedação profunda · 11–22 adequada · 23–30 insuficiente/dor." items={COMFORT_ITEMS} max={30} badge={comfortBadge} />
          )}

          {activeCalc === 'oxigenacao' && <OxigenacaoCalc />}

          {(activeCalc === 'parametros' || activeCalc === 'mecanica') && (
            <div className="text-center py-10">
              <i className="fa-solid fa-person-digging text-4xl text-slate-400 dark:text-slate-600 mb-4 transition-colors"></i>
              <h4 className="text-slate-800 dark:text-white font-bold transition-colors">Módulo em Desenvolvimento</h4>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 transition-colors">Pressões ventilatórias, mecânica e fórmulas de compensação serão adicionadas na próxima fase.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
