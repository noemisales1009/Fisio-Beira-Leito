import React, { useState } from 'react';

export default function Dashboard({ setCurrentView }: any) {
  const [equipNoteVisible, setEquipNoteVisible] = useState(false);

  return (
    <section className="p-6 space-y-6">
      {/* Topo: Grid de Informações Rápidas e Cenário Atual */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Bloco Cenário Atual */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-none transition-colors duration-300">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-clinical-600 dark:text-clinical-400 flex items-center gap-2 mb-4 transition-colors">
              <i className="fa-solid fa-chart-pie"></i> Cenário Atual da UTIP
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center transition-colors">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1 transition-colors">Total de Leitos</span>
                <span className="text-4xl font-extrabold text-slate-800 dark:text-white font-mono transition-colors">12</span>
              </div>
              <div onClick={() => setCurrentView('bedside')} className="bg-clinical-50 dark:bg-clinical-950/40 hover:bg-clinical-100 dark:hover:bg-clinical-950/80 border border-clinical-200 dark:border-clinical-500/40 p-4 rounded-xl text-center cursor-pointer transition relative group">
                <span className="text-[11px] text-clinical-600 dark:text-clinical-300 block mb-1 transition-colors">Leitos Ocupados <i className="fa-solid fa-magnifying-glass text-[9px] ml-1"></i></span>
                <span className="text-4xl font-extrabold text-clinical-600 dark:text-clinical-400 font-mono transition-colors">10</span>
                <span className="absolute bottom-1.5 right-1/2 translate-x-1/2 text-[9px] text-clinical-600/80 dark:text-clinical-300/80 opacity-0 group-hover:opacity-100 transition-opacity">Ver leitos</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-2 rounded-xl text-center transition-colors">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block transition-colors">Vagos</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono transition-colors">1</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-2 rounded-xl text-center transition-colors">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block transition-colors">Bloqueados</span>
                <span className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono transition-colors">1</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-2 rounded-xl text-center transition-colors">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block transition-colors">Prog. Extubação</span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono transition-colors">2</span>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-200 dark:border-slate-800/80 pt-4 space-y-2 transition-colors">
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/30 p-3 rounded-xl flex items-center gap-3 transition-colors">
              <span className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm shrink-0 transition-colors">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </span>
              <div>
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block transition-colors">Alerta Ventilatório Ativo</span>
                <p className="text-xs text-slate-600 dark:text-slate-200 mt-0.5 transition-colors">Leito 04: Bronquiolite Grave. Requer cuidados críticos.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bloco Cenário Ventilatório Detalhado */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm dark:shadow-none transition-colors duration-300">
          <div className="flex justify-between items-center mb-4 transition-colors">
            <h2 className="text-xs font-bold uppercase tracking-wider text-clinical-600 dark:text-clinical-400 flex items-center gap-2 transition-colors">
              <i className="fa-solid fa-lungs"></i> 2.2 Cenário Ventilatório Geral
            </h2>
            <span className="text-xs bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-lg text-slate-600 dark:text-slate-400 font-medium transition-colors">10 Pacientes Mapeados</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Ar Ambiente', val: '2', color: 'text-clinical-700 dark:text-clinical-400' },
              { label: 'Cateter Nasal (CN)', val: '1', color: 'text-clinical-700 dark:text-clinical-400' },
              { label: 'Máscara Venturi (MV)', val: '1', color: 'text-clinical-700 dark:text-clinical-400' },
              { label: 'Máscara Comum (MC)', val: '0', color: 'text-slate-500 dark:text-slate-400' },
              { label: 'CNAF', val: '1', color: 'text-clinical-700 dark:text-clinical-400' },
              { label: 'VNI', val: '2', color: 'text-clinical-700 dark:text-clinical-400' },
              { label: 'TQT em Ar Amb.', val: '0', color: 'text-clinical-700 dark:text-clinical-400' },
              { label: 'TQT em O₂', val: '1', color: 'text-clinical-700 dark:text-clinical-400' },
              { label: 'TQT em VM', val: '1', color: 'text-clinical-800 dark:text-clinical-300', special: true },
              { label: 'TOT em VM', val: '1', color: 'text-clinical-800 dark:text-clinical-300', special: true },
              { label: 'Pronados', val: '1', color: 'text-clinical-700 dark:text-clinical-400' },
              { label: 'Em NOI', val: '0', color: 'text-clinical-700 dark:text-clinical-400' },
            ].map((item, i) => (
              <div key={i} className={`${item.special ? 'bg-clinical-50 dark:bg-clinical-950/20 border-clinical-200 dark:border-clinical-500/20' : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-850'} border p-2.5 rounded-xl flex justify-between items-center transition-colors`}>
                <span className={`text-xs ${item.special ? 'text-clinical-700 dark:text-clinical-300 font-medium' : 'text-slate-600 dark:text-slate-300'} transition-colors`}>{item.label}</span>
                <span className={`${item.special ? 'bg-clinical-100 dark:bg-clinical-900/60' : 'bg-slate-100 dark:bg-slate-800'} ${item.color} text-xs px-2.5 py-1 rounded-lg font-bold transition-colors`}>{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Parte Inferior: Outros Requisitos Clínicos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-none transition-colors duration-300">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 transition-colors">Problemas com Equipamento?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4 transition-colors">Houve alguma inconformidade ou pane no maquinário durante o plantão?</p>
          </div>
          <div className="space-y-2">
            <select onChange={(e) => setEquipNoteVisible(e.target.value === 'S')} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-xl p-3 focus:outline-none focus:border-clinical-500 text-slate-800 dark:text-white font-semibold transition-colors cursor-pointer">
              <option value="N">Não, todos os equipamentos normais</option>
              <option value="S">Sim, relatar problema/pane</option>
            </select>
            {equipNoteVisible && (
              <textarea placeholder="Descreva o equipamento e o defeito..." className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-xl p-3 h-20 text-slate-800 dark:text-white focus:outline-none focus:border-clinical-500 mt-2 resize-none transition-colors"></textarea>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-none transition-colors duration-300">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 transition-colors">Nº Leitos s/ VM e V.R. Pressão O₂</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4 transition-colors">Registro técnico obrigatório de leitos sem VM ativa e rede de O₂.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1 transition-colors">Identificação Leitos</label>
              <input type="text" defaultValue="Leito 02 e 07" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-xl p-3 text-slate-800 dark:text-white font-semibold focus:outline-none focus:border-clinical-500 transition-colors" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1 transition-colors">Registro (V.R. O₂)</label>
              <input type="text" defaultValue="2002" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-xl p-3 text-slate-800 dark:text-white font-mono font-bold focus:outline-none focus:border-clinical-500 transition-colors" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-none transition-colors duration-300">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-3 transition-colors">Pacientes em Risco Ventilatório?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4 transition-colors">Critérios: ↑ IO | ↓ PF | Necessidade de ↑ de PV | ↑ trabalho respiratório</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 p-3 rounded-xl flex items-center gap-3 transition-colors">
            <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm shrink-0 transition-colors">
              <i className="fa-solid fa-gauge-high"></i>
            </span>
            <div>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block transition-colors">2 Pacientes no Radar</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block transition-colors">Leito 04 (Extremo) & Leito 08 (Instável)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
