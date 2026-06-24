import { useState } from 'react';
import {
  PieChart, Pie, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

const VENT_DATA = [
  { name: 'Ar Ambiente',   value: 2,  fill: '#38bdf8' },
  { name: 'Cateter Nasal', value: 1,  fill: '#0ea5e9' },
  { name: 'Másc. Venturi', value: 1,  fill: '#0369a1' },
  { name: 'CNAF',          value: 1,  fill: '#f97316' },
  { name: 'VNI',           value: 2,  fill: '#a78bfa' },
  { name: 'TQT em O₂',    value: 1,  fill: '#34d399' },
  { name: 'TQT em VM',     value: 1,  fill: '#fb7185' },
  { name: 'TOT em VM',     value: 1,  fill: '#fbbf24' },
];

const BED_DATA = [
  { name: 'Ocupados',    value: 10, fill: '#0ea5e9' },
  { name: 'Vagos',       value: 1,  fill: '#10b981' },
  { name: 'Bloqueados',  value: 1,  fill: '#f43f5e' },
];

const WEEK_DATA = [
  { dia: 'Seg', VM: 3, VNI: 1, CNAF: 1 },
  { dia: 'Ter', VM: 2, VNI: 2, CNAF: 2 },
  { dia: 'Qua', VM: 3, VNI: 1, CNAF: 1 },
  { dia: 'Qui', VM: 4, VNI: 2, CNAF: 1 },
  { dia: 'Sex', VM: 2, VNI: 3, CNAF: 1 },
  { dia: 'Sáb', VM: 2, VNI: 2, CNAF: 2 },
  { dia: 'Dom', VM: 2, VNI: 2, CNAF: 1 },
];

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 shadow-xl text-xs">
      {label && <p className="font-bold text-slate-300 mb-1.5 border-b border-slate-700 pb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill || p.stroke }}></span>
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-bold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function DonutCenter({ value, title, sub }: { value: string | number; title: string; sub?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <span className="text-2xl font-extrabold text-slate-800 dark:text-white font-mono leading-none">{value}</span>
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{title}</span>
      {sub && <span className="text-[9px] text-slate-400 mt-0.5">{sub}</span>}
    </div>
  );
}


const INIT_VENT = [
  { label: 'Ar Ambiente',        val: 2 },
  { label: 'Cateter Nasal (CN)', val: 1 },
  { label: 'Máscara Venturi',    val: 1 },
  { label: 'Máscara Comum',      val: 0 },
  { label: 'CNAF',               val: 1 },
  { label: 'VNI',                val: 2 },
  { label: 'TQT em Ar Amb.',     val: 0 },
  { label: 'TQT em O₂',         val: 1 },
  { label: 'TQT em VM',          val: 1, special: true },
  { label: 'TOT em VM',          val: 1, special: true },
  { label: 'Pronados',           val: 1 },
  { label: 'Em NOI',             val: 0 },
];

export default function Dashboard({ setCurrentView }: any) {
  const [equipNoteVisible, setEquipNoteVisible] = useState(false);
  const [activeVent, setActiveVent] = useState<number | null>(null);
  const [activeBed, setActiveBed]   = useState<number | null>(null);
  const [ventItems, setVentItems]   = useState(INIT_VENT);

  const changeVent = (i: number, delta: number) => {
    setVentItems(prev => prev.map((item, idx) =>
      idx === i ? { ...item, val: Math.max(0, item.val + delta) } : item
    ));
  };

  const totalMapeados = ventItems.reduce((s, it) => s + it.val, 0);

  const totalVent = VENT_DATA.reduce((s, d) => s + d.value, 0);
  const totalBeds = 12;
  const ventWithPct = VENT_DATA.map(d => ({ ...d, pct: Math.round((d.value / totalVent) * 100) }));
  const bedWithPct  = BED_DATA.map(d => ({ ...d, pct: Math.round((d.value / totalBeds) * 100) }));

  const highlightVent = ventWithPct.map((d, i) => ({
    ...d,
    fill: activeVent === null || activeVent === i ? d.fill : d.fill + '55',
  }));
  const highlightBed = bedWithPct.map((d, i) => ({
    ...d,
    fill: activeBed === null || activeBed === i ? d.fill : d.fill + '44',
  }));

  return (
    <section className="p-6 space-y-6">

      {/* ── Topo ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Cenário Atual */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm dark:shadow-none transition-colors duration-300">
          <h2 className="text-xs font-bold uppercase tracking-wider text-clinical-600 dark:text-clinical-400 flex items-center gap-2 mb-4">
            <i className="fa-solid fa-chart-pie"></i> Cenário Atual da UTI PED
          </h2>

          {/* Big stats */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center transition-colors">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Total de Leitos</span>
              <span className="text-4xl font-extrabold text-slate-800 dark:text-white font-mono">12</span>
            </div>
            <div
              onClick={() => setCurrentView('bedside')}
              className="bg-clinical-50 dark:bg-clinical-950/40 hover:bg-clinical-100 dark:hover:bg-clinical-950/80 border border-clinical-200 dark:border-clinical-500/40 p-4 rounded-xl text-center cursor-pointer transition relative group"
            >
              <span className="text-[11px] text-clinical-600 dark:text-clinical-300 block mb-1">
                Leitos Ocupados <i className="fa-solid fa-magnifying-glass text-[9px] ml-1"></i>
              </span>
              <span className="text-4xl font-extrabold text-clinical-600 dark:text-clinical-400 font-mono">10</span>
              {/* progress bar */}
              <div className="mt-2 w-full h-1 bg-clinical-100 dark:bg-clinical-900/40 rounded-full overflow-hidden">
                <div className="h-full bg-clinical-500 rounded-full" style={{ width: '83%' }}></div>
              </div>
              <span className="text-[9px] text-clinical-500 dark:text-clinical-400 mt-0.5 block">83% ocupação</span>
            </div>
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 p-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Vagos</span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">1</span>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 p-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Bloqueados</span>
              <span className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono">1</span>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Prog. Extub.</span>
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">2</span>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/30 p-3 rounded-xl flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm shrink-0">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </span>
              <div>
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Alerta Ventilatório Ativo</span>
                <p className="text-xs text-slate-600 dark:text-slate-200 mt-0.5">Leito 04: Bronquiolite Grave. Requer cuidados críticos.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cenário Ventilatório */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm dark:shadow-none transition-colors duration-300">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-clinical-600 dark:text-clinical-400 flex items-center gap-2">
              <i className="fa-solid fa-lungs"></i> 2.2 Cenário Ventilatório Geral
            </h2>
            <span className="text-xs bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-lg text-slate-600 dark:text-slate-400 font-medium">{totalMapeados} Pacientes Mapeados</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ventItems.map((item, i) => {
              const isSpecial = 'special' in item && item.special;
              return (
                <div key={i} className={`border p-3 rounded-xl transition-colors ${isSpecial
                  ? 'bg-clinical-50 dark:bg-clinical-950/20 border-clinical-200 dark:border-clinical-500/20'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                }`}>
                  <span className={`text-[11px] block mb-2 leading-tight ${isSpecial ? 'text-clinical-700 dark:text-clinical-300 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}>
                    {item.label}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => changeVent(i, -1)} disabled={item.val === 0}
                      className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center font-bold text-sm transition disabled:opacity-30 disabled:cursor-not-allowed shrink-0">
                      −
                    </button>
                    <span className={`text-lg font-extrabold font-mono flex-1 text-center ${isSpecial
                      ? 'text-clinical-700 dark:text-clinical-300'
                      : item.val === 0 ? 'text-slate-400 dark:text-slate-600' : 'text-clinical-700 dark:text-clinical-400'
                    }`}>{item.val}</span>
                    <button onClick={() => changeVent(i, +1)}
                      className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-800 hover:bg-clinical-100 dark:hover:bg-clinical-900/40 text-slate-500 dark:text-slate-400 hover:text-clinical-600 dark:hover:text-clinical-400 flex items-center justify-center font-bold text-sm transition shrink-0">
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Donut: Suporte Ventilatório */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm dark:shadow-none transition-colors duration-300">
          <h3 className="text-xs font-bold uppercase tracking-wider text-clinical-600 dark:text-clinical-400 flex items-center gap-2 mb-0.5">
            <i className="fa-solid fa-circle-half-stroke"></i> Suporte Ventilatório
          </h3>
          <p className="text-[10px] text-slate-400 mb-3">Distribuição por modalidade</p>

          <div className="relative h-[180px]">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={highlightVent}
                  cx="50%" cy="50%"
                  innerRadius={52} outerRadius={78}
                  paddingAngle={3} dataKey="value"
                  onMouseEnter={(_, i) => setActiveVent(i)}
                  onMouseLeave={() => setActiveVent(null)}
                  stroke="none"
                  style={{ cursor: 'pointer', transition: 'all .2s' }}
                />
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <DonutCenter value={totalVent} title="pacientes" />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {ventWithPct.map((d, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 cursor-default"
                onMouseEnter={() => setActiveVent(i)}
                onMouseLeave={() => setActiveVent(null)}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }}></span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{d.name}</span>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 ml-auto">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut: Ocupação de Leitos */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm dark:shadow-none transition-colors duration-300">
          <h3 className="text-xs font-bold uppercase tracking-wider text-clinical-600 dark:text-clinical-400 flex items-center gap-2 mb-0.5">
            <i className="fa-solid fa-bed-pulse"></i> Ocupação de Leitos
          </h3>
          <p className="text-[10px] text-slate-400 mb-3">Status dos {totalBeds} leitos da UTI PED</p>

          <div className="relative h-[180px]">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={highlightBed}
                  cx="50%" cy="50%"
                  innerRadius={52} outerRadius={78}
                  paddingAngle={4} dataKey="value"
                  onMouseEnter={(_, i) => setActiveBed(i)}
                  onMouseLeave={() => setActiveBed(null)}
                  stroke="none"
                  style={{ cursor: 'pointer', transition: 'all .2s' }}
                />
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <DonutCenter value={totalBeds} title="leitos" sub="83% ocupação" />
          </div>

          <div className="mt-2 flex flex-col gap-2.5">
            {bedWithPct.map((d, i) => (
              <div
                key={i}
                className="cursor-default"
                onMouseEnter={() => setActiveBed(i)}
                onMouseLeave={() => setActiveBed(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }}></span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{d.name}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{d.value}/{totalBeds}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${d.pct}%`, backgroundColor: d.fill }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Area: Tendência Semanal */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm dark:shadow-none transition-colors duration-300">
          <h3 className="text-xs font-bold uppercase tracking-wider text-clinical-600 dark:text-clinical-400 flex items-center gap-2 mb-0.5">
            <i className="fa-solid fa-chart-area"></i> Tendência Semanal
          </h3>
          <p className="text-[10px] text-slate-400 mb-3">Pacientes por modalidade — últimos 7 dias</p>

          <ResponsiveContainer width="100%" height={222}>
            <AreaChart data={WEEK_DATA} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <defs>
                {[['gVM','#f43f5e'],['gVNI','#0ea5e9'],['gCNAF','#f97316']].map(([id, color]) => (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.4} vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} formatter={(v) => <span style={{ color: '#94a3b8' }}>{v}</span>} />
              <Area type="monotone" dataKey="VM"   name="VM"   stroke="#f43f5e" strokeWidth={2} fill="url(#gVM)"   dot={{ r: 3, fill: '#f43f5e', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="VNI"  name="VNI"  stroke="#0ea5e9" strokeWidth={2} fill="url(#gVNI)"  dot={{ r: 3, fill: '#0ea5e9', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="CNAF" name="CNAF" stroke="#f97316" strokeWidth={2} fill="url(#gCNAF)" dot={{ r: 3, fill: '#f97316', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Parte Inferior ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-none transition-colors duration-300">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Problemas com Equipamento?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">Houve alguma inconformidade ou pane durante o plantão?</p>
          </div>
          <div className="space-y-2">
            <select
              onChange={(e) => setEquipNoteVisible(e.target.value === 'S')}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-xl p-3 focus:outline-none focus:border-clinical-500 text-slate-800 dark:text-white font-semibold transition-colors cursor-pointer"
            >
              <option value="N">Não, todos os equipamentos normais</option>
              <option value="S">Sim, relatar problema/pane</option>
            </select>
            {equipNoteVisible && (
              <textarea
                placeholder="Descreva o equipamento e o defeito..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-xl p-3 h-20 text-slate-800 dark:text-white focus:outline-none focus:border-clinical-500 resize-none transition-colors"
              />
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-none transition-colors duration-300">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Nº Leitos s/ VM e V.R. Pressão O₂</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">Registro técnico obrigatório — leitos sem VM e rede O₂.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1">Identificação</label>
              <input type="text" defaultValue="Leito 02 e 07" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-xl p-3 text-slate-800 dark:text-white font-semibold focus:outline-none focus:border-clinical-500 transition-colors" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1">Registro O₂</label>
              <input type="text" defaultValue="2002" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-xl p-3 text-slate-800 dark:text-white font-mono font-bold focus:outline-none focus:border-clinical-500 transition-colors" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-none transition-colors duration-300">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">Pacientes em Risco Ventilatório?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">Critérios: ↑ IO | ↓ PF | Necessidade de ↑ PV | ↑ trabalho resp.</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 p-3 rounded-xl flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm shrink-0">
              <i className="fa-solid fa-gauge-high"></i>
            </span>
            <div>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">2 Pacientes no Radar</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Leito 04 (Extremo) & Leito 08 (Instável)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
