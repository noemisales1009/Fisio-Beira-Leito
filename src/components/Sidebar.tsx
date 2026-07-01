import React from 'react';

export default function Sidebar({ currentView, setCurrentView, onLogout, toggleMobileMenu, turno, physioName }: any) {
  const navItems = [
    { id: 'dashboard', icon: 'fa-gauge-high', label: 'Painel Geral (UTI PED)' },
    { id: 'bedside', icon: 'fa-bed', label: 'Ficha & Beira Leito' },
    { id: 'scores', icon: 'fa-square-poll-vertical', label: 'Scores & Calculadoras' },
    { id: 'gasometry', icon: 'fa-droplet', label: 'Gasometria & Curvas' },
    { id: 'admission', icon: 'fa-hospital-user', label: 'Triagem & Admissão' }
  ];

  return (
    <aside className="w-full md:w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 h-full overflow-y-auto transition-colors duration-300">
      <div>
        {/* Identidade da Marca */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-3">
            <span className="bg-clinical-500 text-white p-2 rounded-xl flex items-center justify-center shadow-md">
              <i className="fa-solid fa-lungs text-lg"></i>
            </span>
            <div>
              <h2 className="text-sm font-bold text-clinical-800 dark:text-white font-title transition-colors">Fisio Beira Leito</h2>
              <span className="text-[10px] text-clinical-500 dark:text-clinical-400 font-semibold tracking-wider uppercase transition-colors">Plataforma UTI PED</span>
            </div>
          </div>
          <button className="md:hidden text-slate-400 hover:text-clinical-600 dark:hover:text-white" onClick={toggleMobileMenu}>
            <i className="fa-solid fa-bars text-xl"></i>
          </button>
        </div>

        {/* Plantonista Info */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800/80 flex items-center gap-3 transition-colors">
          <div className="w-10 h-10 rounded-full bg-clinical-100 dark:bg-clinical-500/10 border border-clinical-200 dark:border-clinical-500/30 flex items-center justify-center text-clinical-600 dark:text-clinical-400 font-bold transition-colors">
            MS
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-white transition-colors">{physioName || 'Dra. Mariana S.'}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono transition-colors">CREFITO 48291-F</div>
            {turno && (
              <div className="text-[10px] text-clinical-600 dark:text-clinical-400 font-semibold mt-0.5 transition-colors">
                <i className="fa-regular fa-clock"></i> Turno: {turno}
              </div>
            )}
          </div>
        </div>

        {/* Menu de Navegação */}
        <nav className="p-3 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                if(window.innerWidth < 768) toggleMobileMenu();
              }}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition ${
                currentView === item.id
                  ? 'bg-clinical-500 text-white shadow-md shadow-clinical-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-clinical-600 dark:hover:text-white'
              }`}
            >
              <i className={`fa-solid ${item.icon} text-sm w-4 text-center`}></i> {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Botão Sair */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-850 mt-auto transition-colors">
        <button onClick={onLogout} className="w-full bg-slate-50 dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/50 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2">
          <i className="fa-solid fa-arrow-right-from-bracket"></i> Desconectar
        </button>
      </div>
    </aside>
  );
}
