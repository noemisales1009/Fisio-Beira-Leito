import React, { useState } from 'react';

export default function Scores() {
  const [activeCalc, setActiveCalc] = useState<string | null>(null);

  // Form States (Simplified representation)
  const [dfTotal, setDfTotal] = useState(0);

  const calculateDownes = (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    let total = 0;
    for (let value of formData.values()) {
        total += parseInt(value as string) || 0;
    }
    setDfTotal(total);
  };

  const getDfBadge = () => {
      if (dfTotal === 0) return { text: "Sem Alterações", class: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30" };
      if (dfTotal <= 3) return { text: "Quadro Leve", class: "bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-500/30" };
      if (dfTotal <= 7) return { text: "Quadro Moderado", class: "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30" };
      return { text: "Quadro Grave", class: "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30" };
  };

  return (
    <section className="p-4 md:p-6 space-y-6">
      {/* Grid Principal (Imagem fornecida) */}
      {!activeCalc && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div onClick={() => setActiveCalc('conforto')} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:border-clinical-400 dark:hover:border-clinical-500/60 p-6 rounded-2xl cursor-pointer hover:-translate-y-1 transition duration-300 flex flex-col items-center text-center shadow-sm hover:shadow-md dark:shadow-lg group">
            <div className="w-16 h-16 bg-clinical-500 text-white rounded-2xl flex items-center justify-center text-2xl shadow-md mb-4 transition-transform group-hover:scale-105">
              <i className="fa-solid fa-child"></i>
            </div>
            <h3 className="text-sm md:text-base font-semibold text-clinical-800 dark:text-white font-title transition-colors">Conforto Respiratório</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed transition-colors">PRESS Score, Downes-Ferrés (Bronquiolite), Wood-Downes (Asma)</p>
          </div>

          <div onClick={() => setActiveCalc('oxigenacao')} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:border-clinical-400 dark:hover:border-clinical-500/60 p-6 rounded-2xl cursor-pointer hover:-translate-y-1 transition duration-300 flex flex-col items-center text-center shadow-sm hover:shadow-md dark:shadow-lg group">
            <div className="w-16 h-16 bg-clinical-500 text-white rounded-2xl flex items-center justify-center text-2xl shadow-md mb-4 transition-transform group-hover:scale-105">
              <i className="fa-solid fa-lungs"></i>
            </div>
            <h3 className="text-sm md:text-base font-semibold text-clinical-800 dark:text-white font-title transition-colors">Oxigenação</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed transition-colors">Relação P/F, Relação S/F, OI / OSI</p>
          </div>

          <div onClick={() => setActiveCalc('parametros')} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:border-clinical-400 dark:hover:border-clinical-500/60 p-6 rounded-2xl cursor-pointer hover:-translate-y-1 transition duration-300 flex flex-col items-center text-center shadow-sm hover:shadow-md dark:shadow-lg group">
            <div className="w-16 h-16 bg-clinical-500 text-white rounded-2xl flex items-center justify-center text-2xl shadow-md mb-4 transition-transform group-hover:scale-105">
              <i className="fa-solid fa-wind"></i>
            </div>
            <h3 className="text-sm md:text-base font-semibold text-clinical-800 dark:text-white font-title transition-colors">Parâmetros Ventilatórios</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed transition-colors">Volume Corrente por Peso, MAP, Ventilation Index (VI)</p>
          </div>

          <div onClick={() => setActiveCalc('mecanica')} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:border-clinical-400 dark:hover:border-clinical-500/60 p-6 rounded-2xl cursor-pointer hover:-translate-y-1 transition duration-300 flex flex-col items-center text-center shadow-sm hover:shadow-md dark:shadow-lg group">
            <div className="w-16 h-16 bg-clinical-500 text-white rounded-2xl flex items-center justify-center text-2xl shadow-md mb-4 transition-transform group-hover:scale-105">
              <i className="fa-solid fa-chart-line"></i>
            </div>
            <h3 className="text-sm md:text-base font-semibold text-clinical-800 dark:text-white font-title transition-colors">Mecânica Respiratória</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed transition-colors">Driving Pressure (ΔP), Complacência Estática/Dinâmica, Resistência, Constante de Tempo</p>
          </div>
        </div>
      )}

      {/* Painel Expansivo das Calculadoras */}
      {activeCalc && (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 shadow-sm dark:shadow-none p-6 rounded-2xl animate-in fade-in zoom-in-95 duration-200 transition-colors">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-850 pb-4 mb-6 transition-colors">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-clinical-100 dark:bg-clinical-500/10 text-clinical-600 dark:text-clinical-400 flex items-center justify-center text-lg transition-colors">
                <i className={`fa-solid ${activeCalc === 'conforto' ? 'fa-child' : activeCalc === 'oxigenacao' ? 'fa-lungs' : activeCalc === 'parametros' ? 'fa-wind' : 'fa-chart-line'}`}></i>
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase transition-colors">{activeCalc}</h3>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 transition-colors">Insira os dados clínicos</span>
              </div>
            </div>
            <button onClick={() => setActiveCalc(null)} className="text-slate-400 hover:text-slate-800 dark:hover:text-white transition">
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          {activeCalc === 'conforto' && (
            <form onChange={calculateDownes} className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-850 mb-4 transition-colors">
                <span className="text-xs font-bold text-clinical-600 dark:text-clinical-400 block mb-2 transition-colors"><i className="fa-solid fa-info-circle"></i> Escala de Downes-Ferrés</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed transition-colors">Pontuação calculada baseada na gravidade dos sintomas físicos observados.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {['Frequência Respiratória', 'Tiragem de Musculatura', 'Entrada de Ar (Ausculta)', 'Sibilância', 'Cianose', 'Gemido Expiratório'].map((label, i) => (
                  <div key={i}>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1 transition-colors">{label}</label>
                    <select name={`q${i}`} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-xs rounded-xl p-3 text-slate-800 dark:text-white focus:outline-none focus:border-clinical-500 transition-colors">
                      <option value="0">Opção Normal [0]</option>
                      <option value="1">Alteração Leve/Mod [1]</option>
                      <option value="2">Alteração Grave [2]</option>
                    </select>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-xl flex items-center justify-between transition-colors">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase block font-semibold transition-colors">Resultado do Score</span>
                  <span className="text-3xl font-extrabold text-slate-800 dark:text-white transition-colors">{dfTotal} / 12</span>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border transition-colors ${getDfBadge().class}`}>
                    {getDfBadge().text}
                  </span>
                </div>
              </div>
            </form>
          )}

          {activeCalc !== 'conforto' && (
            <div className="text-center py-10">
              <i className="fa-solid fa-person-digging text-4xl text-slate-400 dark:text-slate-600 mb-4 transition-colors"></i>
              <h4 className="text-slate-800 dark:text-white font-bold transition-colors">Módulo em Desenvolvimento</h4>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 transition-colors">Esta seção da calculadora está sendo adaptada para React.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
