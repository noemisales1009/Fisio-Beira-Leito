import { Clock } from 'lucide-react';

export const TURNO_OPTIONS = [
  { value: 'SD', label: 'SD', desc: 'Diurno' },
  { value: 'SN', label: 'SN', desc: 'Noturno' },
  { value: 'M', label: 'M', desc: 'Manhã' },
  { value: 'T', label: 'T', desc: 'Tarde' },
  { value: 'MT', label: 'MT', desc: 'Manhã/Tarde' },
];

export default function TurnoModal({ suggested, onConfirm }: { suggested: string; onConfirm: (turno: string) => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-2xl w-full max-w-sm relative overflow-hidden transition-colors duration-300">
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-clinical-500/10 dark:bg-clinical-500/20 rounded-full blur-xl"></div>

        <div className="relative z-10 text-center">
          <div className="mx-auto w-12 h-12 bg-clinical-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-clinical-500/30 mb-3">
            <Clock size={22} />
          </div>
          <h2 className="text-lg font-extrabold text-clinical-800 dark:text-white font-title transition-colors">Qual o seu turno?</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 transition-colors">Selecione o turno de trabalho para este plantão.</p>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-5 relative z-10">
          {TURNO_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onConfirm(opt.value)}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border py-3 px-2 transition font-semibold ${
                opt.value === suggested
                  ? 'bg-clinical-500 text-white border-clinical-500 shadow-lg shadow-clinical-500/30'
                  : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-clinical-400 hover:text-clinical-600 dark:hover:text-clinical-400'
              }`}
            >
              <span className="text-sm">{opt.label}</span>
              <span className="text-[9px] font-normal opacity-80">{opt.desc}</span>
            </button>
          ))}
        </div>

        <p className="text-center text-[10px] text-slate-400 mt-4 relative z-10">
          Sugerido com base no horário atual: <span className="font-bold text-clinical-500">{suggested}</span>
        </p>
      </div>
    </div>
  );
}
