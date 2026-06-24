import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Scores from './components/Scores';
import Bedside from './components/Bedside';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Helper properties to map views to headers
  const getHeaderInfo = () => {
    switch (currentView) {
      case 'dashboard': return { title: 'Painel Geral da UTIP', parent: 'Painel de Controle Central' };
      case 'bedside': return { title: 'Ficha Clínica de Monitoramento', parent: 'Visita Beira Leito' };
      case 'scores': return { title: 'Módulos de Avaliação Clínica', parent: 'Scores e Calculadoras' };
      case 'gasometry': return { title: 'Estatísticas de Gasometria', parent: 'Gráficos de Oxigenação' };
      case 'admission': return { title: 'Protocolo de Entrada', parent: 'Triagem de Admissão' };
      default: return { title: '', parent: '' };
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggedIn(true);
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 font-sans transition-colors duration-300">
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          type="button"
          className="fixed top-4 right-4 z-50 text-slate-400 hover:text-clinical-500 transition-colors p-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md"
          title={isDarkMode ? 'Modo claro' : 'Modo escuro'}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 p-8 rounded-2xl shadow-xl dark:shadow-2xl w-full max-w-md relative overflow-hidden transition-colors duration-300">
          <div className="absolute -top-16 -right-16 w-32 h-32 bg-clinical-500/10 dark:bg-clinical-500/20 rounded-full blur-xl"></div>
          <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-clinical-500/5 dark:bg-clinical-500/10 rounded-full blur-xl"></div>

          <div className="text-center relative z-10">
            <div className="mx-auto w-16 h-16 bg-clinical-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-clinical-500/30 mb-4 text-2xl">
              <i className="fa-solid fa-lungs"></i>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-clinical-800 dark:text-white font-title transition-colors">Fisio Beira Leito</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 transition-colors">Gestão de Suporte Ventilatório & Scores UTIP</p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-4 relative z-10">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1 transition-colors">E-mail</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <i className="fa-solid fa-envelope"></i>
                </span>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-clinical-500 focus:ring-1 focus:ring-clinical-500 transition" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1 transition-colors">Senha</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <i className="fa-solid fa-lock"></i>
                </span>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-clinical-500 focus:ring-1 focus:ring-clinical-500 transition" />
              </div>
            </div>

            <button type="submit" className="w-full mt-4 bg-clinical-500 hover:bg-clinical-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-clinical-500/20 transition duration-200 flex items-center justify-center gap-2">
              Acessar Sistema <i className="fa-solid fa-arrow-right-to-bracket"></i>
            </button>
          </form>
          
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
      
      {/* Mobile Overlay Sidebar */}
      <div className={`fixed inset-0 bg-black/80 z-40 transition-opacity md:hidden ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMobileMenuOpen(false)}></div>
      
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         <Sidebar currentView={currentView} setCurrentView={setCurrentView} onLogout={() => setIsLoggedIn(false)} toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
      </div>

      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 flex items-center justify-between shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-4">
             <button className="md:hidden text-slate-500 dark:text-slate-400 hover:text-clinical-500 dark:hover:text-white" onClick={() => setIsMobileMenuOpen(true)}>
               <i className="fa-solid fa-bars text-xl"></i>
             </button>
            <div>
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 hidden sm:block transition-colors">{getHeaderInfo().parent}</h3>
              <h1 className="text-lg font-bold text-clinical-800 dark:text-white font-title transition-colors">{getHeaderInfo().title}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-clinical-500 transition-colors bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg text-xs transition-colors duration-300">
              <span className="text-slate-500 dark:text-slate-400"><i className="fa-regular fa-clock"></i> Turno:</span>
              <select className="bg-transparent text-clinical-800 dark:text-white font-semibold focus:outline-none cursor-pointer">
                <option value="SD" className="bg-white dark:bg-slate-950">SD (Diurno)</option>
                <option value="SN" className="bg-white dark:bg-slate-950">SN (Noturno)</option>
                <option value="M" className="bg-white dark:bg-slate-950">M (Manhã)</option>
                <option value="T" className="bg-white dark:bg-slate-950">T (Tarde)</option>
                <option value="MT" className="bg-white dark:bg-slate-950">MT (Manhã/Tarde)</option>
              </select>
            </div>
            <span className="text-xs bg-clinical-50 dark:bg-clinical-500/10 text-clinical-600 dark:text-clinical-400 border border-clinical-200 dark:border-clinical-500/20 px-2.5 py-1 rounded-lg font-bold font-mono transition-colors duration-300">
              <i className="fa-solid fa-calendar-day mr-1"></i> {new Date().toLocaleDateString('pt-BR')}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
           {currentView === 'dashboard' && <Dashboard setCurrentView={setCurrentView} />}
           {currentView === 'scores' && <Scores />}
           {currentView === 'bedside' && <Bedside />}

           {/* Placeholders for views not fully implemented to save tokens */}
           {['gasometry', 'admission'].includes(currentView) && (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
                <i className="fa-solid fa-code text-5xl mb-4 text-slate-300 dark:text-slate-700"></i>
                <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">Módulo em Integração</h2>
                <p className="text-sm mt-2 max-w-md text-center">A seção "{currentView}" está sendo portada do seu HTML vanilla para os componentes React.</p>
                <button onClick={() => setCurrentView('dashboard')} className="mt-6 px-4 py-2 bg-clinical-500 text-white rounded-lg text-sm font-bold hover:bg-clinical-600 transition">Voltar ao Painel</button>
              </div>
           )}
        </div>
      </main>
    </div>
  );
}
