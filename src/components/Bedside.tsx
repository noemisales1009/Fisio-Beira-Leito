import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  Status, GasEntry, DeviceEntry, Patient,
  calcIdade, calcDias, calcDuracao, fromInputDate,
  PATIENTS,
} from '../patients';

/* ─── STATUS / BORDERS ───────────────────────────────── */
const STATUS_STYLE: Record<Status,{bg:string;text:string;dot:string}> = {
  'Estável':       {bg:'bg-emerald-100 dark:bg-emerald-900/30',text:'text-emerald-700 dark:text-emerald-400',dot:'bg-emerald-500'},
  'Instável':      {bg:'bg-amber-100 dark:bg-amber-900/30',    text:'text-amber-700 dark:text-amber-400',    dot:'bg-amber-500'},
  'Crítico':       {bg:'bg-rose-100 dark:bg-rose-900/30',      text:'text-rose-700 dark:text-rose-400',      dot:'bg-rose-500'},
  'Alta Prevista': {bg:'bg-blue-100 dark:bg-blue-900/30',      text:'text-blue-700 dark:text-blue-400',      dot:'bg-blue-500'},
};
const BORDER_COLOR: Record<Status,string> = {
  'Estável':'border-l-emerald-500','Instável':'border-l-amber-500','Crítico':'border-l-rose-500','Alta Prevista':'border-l-blue-500',
};
const DEVICE_OPTIONS = [
  'Ar Ambiente','Cateter Nasal','Máscara Comum','Máscara Venturi',
  'CNAF','VNI','TOT em VM','TQT em VM','TQT em Ar Amb.','TQT em O₂',
  'Pronação','NOI (Óxido Nítrico)',
];

/* ─── FIELD BOX (reutilizável) ───────────────────────── */
function FieldBox({label,value,span2}:{label:string;value:string;span2?:boolean}) {
  return (
    <div className={`bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 ${span2?'col-span-2':''}`}>
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">{label}</span>
      <span className="text-sm font-semibold text-slate-800 dark:text-white">{value}</span>
    </div>
  );
}

/* ─── VITAL BOX ──────────────────────────────────────── */
function VitalBox({label,value,alert}:{label:string;value:string;alert?:boolean}) {
  return (
    <div className={`flex flex-col items-center p-3 rounded-xl border ${alert
      ?'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-700/40'
      :'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">{label}</span>
      <span className={`text-lg font-extrabold font-mono ${alert?'text-rose-600 dark:text-rose-400':'text-slate-800 dark:text-white'}`}>{value}</span>
    </div>
  );
}

/* ─── LABEL ──────────────────────────────────────────── */
function SectionLabel({icon,text,color}:{icon:string;text:string;color?:string}) {
  return (
    <p className={`text-[9px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5 ${color||'text-slate-400 dark:text-slate-500'}`}>
      {icon && <i className={`fa-solid ${icon}`}></i>}{text}
    </p>
  );
}

/* ─── INPUT / SELECT / TEXTAREA helpers ──────────────── */
const inputCls = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-xl p-3 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-clinical-500 transition-colors";
const selectCls = inputCls;

/* ─── GAS TOOLTIP ────────────────────────────────────── */
function GasTooltip({active,payload,label}:any) {
  if (!active||!payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="font-bold text-slate-300 mb-1 border-b border-slate-700 pb-1">{label}</p>
      {payload.map((p:any,i:number)=>(
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{backgroundColor:p.color}}></span>
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-bold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── GASOMETRIA PANEL ───────────────────────────────── */
function GasometriaPanel({patient}:{patient:Patient}) {
  const [entries,setEntries] = useState<GasEntry[]>(patient.gas);
  const [form,setForm] = useState({data:'',hora:'',ph:'',paco2:'',pao2:'',hco3:'',be:'',fio2:''});
  const set = (k:string,v:string) => setForm(f=>({...f,[k]:v}));
  const add = () => {
    const pao2=parseFloat(form.pao2), fio2=parseFloat(form.fio2);
    if (!form.data||!pao2||!fio2) return;
    const e: GasEntry = {data:form.data,hora:form.hora,ph:parseFloat(form.ph)||0,paco2:parseFloat(form.paco2)||0,pao2,hco3:parseFloat(form.hco3)||0,be:parseFloat(form.be)||0,fio2,pf:+(pao2/fio2).toFixed(0),io:fio2>0.3?+(fio2*100*7.5/pao2).toFixed(1):null};
    setEntries(p=>[...p,e]);
    setForm({data:'',hora:'',ph:'',paco2:'',pao2:'',hco3:'',be:'',fio2:''});
  };
  const chartData = entries.map(e=>({name:`${e.data} ${e.hora}`,PF:e.pf,IO:e.io}));

  return (
    <div className="space-y-5">
      {entries.length>0 && (
        <>
          <div>
            <SectionLabel icon="fa-chart-line" text="Evolução PF / IO"/>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{top:4,right:4,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-slate-800" vertical={false}/>
                <XAxis dataKey="name" tick={{fontSize:9,fill:'#64748b'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:9,fill:'#64748b'}} axisLine={false} tickLine={false}/>
                <Tooltip content={<GasTooltip/>}/>
                <Legend wrapperStyle={{fontSize:10}} formatter={(v)=><span className="text-slate-500 dark:text-slate-400">{v}</span>}/>
                <ReferenceLine y={200} stroke="#f43f5e" strokeDasharray="4 2" label={{value:'PF<200',position:'insideTopLeft',fontSize:9,fill:'#f43f5e'}}/>
                <ReferenceLine y={300} stroke="#f97316" strokeDasharray="4 2" label={{value:'PF<300',position:'insideTopLeft',fontSize:9,fill:'#f97316'}}/>
                <Line type="monotone" dataKey="PF" stroke="#0ea5e9" strokeWidth={2} dot={{r:3,fill:'#0ea5e9',strokeWidth:0}} activeDot={{r:5}}/>
                <Line type="monotone" dataKey="IO" stroke="#f43f5e" strokeWidth={2} dot={{r:3,fill:'#f43f5e',strokeWidth:0}} activeDot={{r:5}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <SectionLabel icon="fa-table" text="Histórico"/>
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr>{['Data','Hora','pH','PaCO₂','PaO₂','HCO₃','BE','FiO₂','P/F','IO'].map(h=>(
                  <th key={h} className="text-left px-2 py-1.5 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {entries.map((e,i)=>(
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300 font-medium">{e.data}</td>
                    <td className="px-2 py-1.5 text-slate-500 dark:text-slate-400">{e.hora}</td>
                    <td className={`px-2 py-1.5 font-mono font-bold ${e.ph<7.35?'text-rose-600 dark:text-rose-400':e.ph>7.45?'text-amber-600 dark:text-amber-400':'text-emerald-600 dark:text-emerald-400'}`}>{e.ph}</td>
                    <td className={`px-2 py-1.5 font-mono ${e.paco2>50?'text-rose-600 dark:text-rose-400':'text-slate-700 dark:text-slate-300'}`}>{e.paco2}</td>
                    <td className={`px-2 py-1.5 font-mono ${e.pao2<60?'text-rose-600 dark:text-rose-400':'text-slate-700 dark:text-slate-300'}`}>{e.pao2}</td>
                    <td className="px-2 py-1.5 font-mono text-slate-700 dark:text-slate-300">{e.hco3}</td>
                    <td className={`px-2 py-1.5 font-mono ${e.be<-3?'text-rose-600 dark:text-rose-400':'text-slate-700 dark:text-slate-300'}`}>{e.be>0?`+${e.be}`:e.be}</td>
                    <td className="px-2 py-1.5 font-mono text-slate-700 dark:text-slate-300">{Math.round(e.fio2*100)}%</td>
                    <td className={`px-2 py-1.5 font-mono font-bold ${e.pf<200?'text-rose-600 dark:text-rose-400':e.pf<300?'text-amber-600 dark:text-amber-400':'text-emerald-600 dark:text-emerald-400'}`}>{e.pf}</td>
                    <td className={`px-2 py-1.5 font-mono ${e.io&&e.io>8?'text-rose-600 dark:text-rose-400':'text-slate-700 dark:text-slate-300'}`}>{e.io??'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div>
        <SectionLabel icon="fa-plus-circle" text="Registrar Gasometria"/>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[{k:'data',label:'Data',type:'date'},{k:'hora',label:'Hora',type:'time'},{k:'ph',label:'pH',type:'number'},{k:'paco2',label:'PaCO₂',type:'number'},{k:'pao2',label:'PaO₂',type:'number'},{k:'hco3',label:'HCO₃',type:'number'},{k:'be',label:'BE',type:'number'},{k:'fio2',label:'FiO₂ (0.21–1.0)',type:'number'}].map(f=>(
            <div key={f.k}>
              <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">{f.label}</label>
              <input type={f.type} step="any" value={(form as any)[f.k]} onChange={e=>set(f.k,e.target.value)} className={inputCls}/>
            </div>
          ))}
        </div>
        {form.pao2&&form.fio2&&(
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            P/F calculado: <strong className={parseFloat(form.pao2)/parseFloat(form.fio2)<200?'text-rose-600 dark:text-rose-400':'text-emerald-600 dark:text-emerald-400'}>
              {+(parseFloat(form.pao2)/parseFloat(form.fio2)).toFixed(0)}
            </strong>
          </p>
        )}
        <button onClick={add} className="mt-3 w-full bg-clinical-500 hover:bg-clinical-600 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2">
          <i className="fa-solid fa-plus"></i> Registrar Gasometria
        </button>
      </div>
    </div>
  );
}

/* ─── DISPOSITIVOS PANEL ─────────────────────────────── */
function DispositivosPanel({patient}:{patient:Patient}) {
  const [entries,setEntries] = useState<DeviceEntry[]>(patient.dispositivos);
  const [nextId,setNextId]   = useState(patient.dispositivos.length+1);
  const [newDevice,setNewDevice] = useState('');
  const [newInicio,setNewInicio] = useState('');
  const [retiradaMap,setRetiradaMap] = useState<Record<number,string>>({});

  const addEntry = () => {
    if (!newDevice||!newInicio) return;
    setEntries(p=>[...p,{id:nextId,device:newDevice,inicio:fromInputDate(newInicio)}]);
    setNextId(n=>n+1); setNewDevice(''); setNewInicio('');
  };
  const markRetirada = (id:number) => {
    const date=retiradaMap[id]; if (!date) return;
    setEntries(p=>p.map(e=>e.id===id?{...e,retirada:fromInputDate(date)}:e));
    setRetiradaMap(m=>({...m,[id]:''}));
  };
  const ativos   = entries.filter(e=>!e.retirada);
  const inativos = entries.filter(e=> e.retirada).sort((a,b)=>b.id-a.id);

  return (
    <div className="space-y-5">
      {/* Em uso */}
      <div>
        <SectionLabel icon="fa-circle" text="Em Uso Atualmente" color="text-emerald-600 dark:text-emerald-400"/>
        {ativos.length===0
          ? <p className="text-xs text-slate-400 dark:text-slate-500 italic">Nenhum equipamento ativo.</p>
          : <div className="space-y-2">
              {ativos.map(e=>(
                <div key={e.id} className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-700/40 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{e.device}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Início: <strong className="text-slate-700 dark:text-slate-300">{e.inicio}</strong>
                        <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>
                        Em uso há <strong className="text-emerald-600 dark:text-emerald-400">{calcDuracao(e.inicio)}</strong>
                      </p>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/40 px-2 py-0.5 rounded-full shrink-0">ativo</span>
                  </div>
                  <div className="flex gap-2">
                    <input type="date" value={retiradaMap[e.id]||''} onChange={ev=>setRetiradaMap(m=>({...m,[e.id]:ev.target.value}))}
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs rounded-lg p-2 text-slate-800 dark:text-white focus:outline-none focus:border-clinical-500 transition-colors"/>
                    <button onClick={()=>markRetirada(e.id)} disabled={!retiradaMap[e.id]}
                      className="bg-rose-500 hover:bg-rose-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold px-3 py-2 rounded-lg transition flex items-center gap-1.5">
                      <i className="fa-solid fa-xmark"></i> Retirar
                    </button>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>

      {/* Histórico */}
      {inativos.length>0 && (
        <div>
          <SectionLabel icon="fa-clock-rotate-left" text="Histórico de Equipamentos"/>
          <div className="space-y-2">
            {inativos.map(e=>(
              <div key={e.id} className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center gap-3">
                <div className="w-1.5 h-10 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{e.device}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{e.inicio} → {e.retirada}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200 font-mono">{calcDuracao(e.inicio,e.retirada)}</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">permanência</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Total de equipamentos utilizados</span>
            <span className="text-lg font-extrabold text-clinical-600 dark:text-clinical-400 font-mono">{entries.length}</span>
          </div>
        </div>
      )}

      {/* Adicionar */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
        <SectionLabel icon="fa-plus" text="Adicionar Equipamento"/>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">Equipamento / Suporte</label>
            <select value={newDevice} onChange={e=>setNewDevice(e.target.value)} className={selectCls}>
              <option value="">Selecione...</option>
              {DEVICE_OPTIONS.map(d=><option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">Data de Início</label>
            <input type="date" value={newInicio} onChange={e=>setNewInicio(e.target.value)} className={inputCls}/>
          </div>
        </div>
        <button onClick={addEntry} disabled={!newDevice||!newInicio}
          className="w-full bg-clinical-500 hover:bg-clinical-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2">
          <i className="fa-solid fa-plus"></i> Registrar Equipamento
        </button>
      </div>
    </div>
  );
}

/* ─── SCORES PANEL ───────────────────────────────────── */
function ScoresPanel({patient}:{patient:Patient}) {
  const [activeCalc,setActiveCalc] = useState<string|null>(null);
  const [dfTotal,setDfTotal] = useState(0);
  const sf=+(patient.spO2/(patient.fio2*100)).toFixed(1), pf=+(patient.pao2/patient.fio2).toFixed(0);
  const oi=patient.vm?+(patient.fio2*100*7.5/patient.pao2).toFixed(1):null;
  const osi=+(patient.fio2*100*7.5/patient.spO2).toFixed(1), vcAlvo=+(5*patient.pesoKg).toFixed(0);

  const badge = () => {
    if (dfTotal===0) return {t:'Sem Alterações',c:'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/40'};
    if (dfTotal<=3)  return {t:'Quadro Leve',    c:'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-700/40'};
    if (dfTotal<=7)  return {t:'Quadro Moderado',c:'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/40'};
    return               {t:'Quadro Grave',      c:'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-700/40'};
  };

  if (!activeCalc) return (
    <div className="grid grid-cols-2 gap-3">
      {[
        {key:'conforto',  icon:'fa-child',     title:'Conforto Resp.',       sub:'Downes-Ferrés 0–12'},
        {key:'oxigenacao',icon:'fa-lungs',     title:'Oxigenação',           sub:`P/F=${pf} · S/F=${sf}${oi?` · IO=${oi}`:''}`},
        {key:'parametros',icon:'fa-wind',      title:'Parâm. Ventilatórios', sub:`VC alvo=${vcAlvo} mL`},
        {key:'mecanica',  icon:'fa-chart-line',title:'Mecânica Resp.',       sub:'ΔP, Complacência'},
      ].map(c=>(
        <button key={c.key} onClick={()=>setActiveCalc(c.key)}
          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-clinical-400 dark:hover:border-clinical-500/60 p-4 rounded-xl text-left group transition">
          <div className="w-10 h-10 bg-clinical-500 text-white rounded-xl flex items-center justify-center text-lg shadow-md mb-3 group-hover:scale-105 transition-transform">
            <i className={`fa-solid ${c.icon}`}></i>
          </div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-1">{c.title}</h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{c.sub}</p>
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <button onClick={()=>setActiveCalc(null)} className="flex items-center gap-2 text-xs text-slate-500 hover:text-clinical-500 transition-colors">
        <i className="fa-solid fa-arrow-left"></i> Voltar
      </button>
      {activeCalc==='conforto' && (
        <form onChange={e=>{const fd=new FormData(e.currentTarget as HTMLFormElement);setDfTotal([...fd.values()].reduce((s,v)=>s+(parseInt(v as string)||0),0));}} className="space-y-3">
          <div className="bg-clinical-50 dark:bg-slate-900 border border-clinical-200 dark:border-clinical-500/30 p-3 rounded-xl">
            <span className="text-[10px] font-bold text-clinical-600 dark:text-clinical-400 uppercase tracking-wider">Escala de Downes-Ferrés</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {['FR','Tiragem','Entrada de Ar','Sibilância','Cianose','Gemido'].map((label,i)=>(
              <div key={i}>
                <label className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-widest block mb-1">{label}</label>
                <select name={`q${i}`} className={selectCls}>
                  <option value="0">Normal [0]</option><option value="1">Leve/Mod [1]</option><option value="2">Grave [2]</option>
                </select>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <span className="text-3xl font-extrabold text-slate-800 dark:text-white font-mono">{dfTotal}<span className="text-slate-400 text-lg"> / 12</span></span>
            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${badge().c}`}>{badge().t}</span>
          </div>
        </form>
      )}
      {activeCalc==='oxigenacao' && (
        <div className="grid grid-cols-2 gap-3">
          {[{l:'P/F',v:pf,a:+pf<200,r:+pf<100?'Grave':+pf<200?'Moderado':+pf<300?'Leve':'Normal'},
            {l:'S/F',v:sf,a:+sf<200,r:'<264 → P/F<200'},
            {l:'OSI',v:osi,a:+osi>12,r:'>12 → SARA'},
            {l:'IO', v:oi??'—',a:oi!==null&&oi>8,r:'Apenas em VM'}].map(item=>(
            <div key={item.l} className={`p-4 rounded-xl border ${item.a?'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-700/40':'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
              <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-widest block mb-1">{item.l}</span>
              <span className={`text-2xl font-extrabold font-mono ${item.a?'text-rose-600 dark:text-rose-400':'text-slate-800 dark:text-white'}`}>{item.v}</span>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">{item.r}</p>
            </div>
          ))}
        </div>
      )}
      {activeCalc==='parametros' && (
        <div className="grid grid-cols-2 gap-3">
          {[{l:'VC alvo (5mL/kg)',v:`${vcAlvo} mL`,a:false,r:`5×${patient.pesoKg}kg`},
            {l:'VC máx (8mL/kg)', v:`${+(8*patient.pesoKg).toFixed(0)} mL`,a:false,r:`8×${patient.pesoKg}kg`},
            {l:'FiO₂ atual',       v:`${Math.round(patient.fio2*100)}%`,a:patient.fio2>0.6,r:'>60% — revisar'},
            {l:'SpO₂',            v:`${patient.spO2}%`,a:patient.spO2<94,r:'Alvo 94–98%'}].map(item=>(
            <div key={item.l} className={`p-4 rounded-xl border ${item.a?'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-700/40':'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
              <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-widest block mb-1">{item.l}</span>
              <span className={`text-2xl font-extrabold font-mono ${item.a?'text-rose-600 dark:text-rose-400':'text-slate-800 dark:text-white'}`}>{item.v}</span>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">{item.r}</p>
            </div>
          ))}
        </div>
      )}
      {activeCalc==='mecanica' && (
        <div className="text-center py-10">
          <i className="fa-solid fa-person-digging text-4xl text-slate-300 dark:text-slate-600 mb-3 block"></i>
          <p className="text-sm font-bold text-slate-400">Módulo em Desenvolvimento</p>
        </div>
      )}
    </div>
  );
}

/* ─── PATIENT DETAIL ─────────────────────────────────── */
function PatientDetail({patient,onBack}:{patient:Patient;onBack:()=>void}) {
  const [tab,setTab] = useState<'fisio'|'dispositivos'|'gas'|'scores'|'evolucao'>('fisio');
  const [equipProblema,setEquipProblema] = useState(false);
  const [nivel,setNivel] = useState(1);
  const s  = STATUS_STYLE[patient.status];
  const dias = calcDias(patient.data_internacao);

  const ALERTAS = ['Instabilidade hemodinâmica','Risco de extubação acidental','Agitação / sedação inadequada','Restrição de decúbito','Drenos / cateteres em uso','Precaução de contato','Broncoespasmo reativo','Hipertensão pulmonar','Pós-operatório imediato','Convulsões recentes'];
  const NIVEIS  = [{n:1,label:'Acamado passivo'},{n:2,label:'Mov. no leito (assistido)'},{n:3,label:'Sentado na beira do leito'},{n:4,label:'Em pé com suporte'},{n:5,label:'Deambula com auxílio'},{n:6,label:'Deambula independente'}];
  const TABS = [
    {key:'fisio',        icon:'fa-person-walking', label:'Fisioterapia'},
    {key:'dispositivos', icon:'fa-stethoscope',    label:'Equipamentos'},
    {key:'gas',          icon:'fa-flask',          label:'Gasometria'},
    {key:'scores',       icon:'fa-calculator',     label:'Scores'},
    {key:'evolucao',     icon:'fa-notes-medical',  label:'Evolução'},
  ] as const;

  const card = "bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-none";

  return (
    <div className="p-6 space-y-4 max-w-2xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-xs text-slate-500 hover:text-clinical-500 dark:text-slate-400 dark:hover:text-clinical-400 transition-colors">
        <i className="fa-solid fa-arrow-left"></i> Voltar à lista
      </button>

      {/* Card do paciente */}
      <div className={`${card} p-5`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-clinical-500 to-violet-600 text-white flex items-center justify-center text-base font-extrabold shadow-lg shrink-0">
              {patient.nome.charAt(0)}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800 dark:text-white tracking-tight">{patient.nome}</h2>
              <p className="text-xs mt-0.5">
                <span className="text-clinical-600 dark:text-clinical-400 font-bold">LEITO {patient.id}</span>
                <span className="text-slate-400 dark:text-slate-500"> · PRONT. {patient.prontuario}</span>
              </p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-clinical-500 transition-colors p-1"><i className="fa-solid fa-pen text-sm"></i></button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <FieldBox label="Idade" value={calcIdade(patient.nasc)}/>
          <FieldBox label="Sexo"  value={`${patient.sexo==='Masculino'?'♂':'♀'} ${patient.sexo}`}/>
          <FieldBox label="Mãe"   value={patient.mae} span2/>
          <FieldBox label="Peso"  value={`${patient.pesoKg} kg`}/>
          <FieldBox label="Altura" value={`${patient.altCm} cm`}/>
          <div className="col-span-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">Internação</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-white">
              {patient.data_internacao}
              <span className={`ml-2 font-bold ${dias===0?'text-clinical-600 dark:text-clinical-400':'text-slate-400 dark:text-slate-500'}`}>
                · {dias===0?'0 dias':`${dias} ${dias===1?'dia':'dias'}`}
              </span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>{patient.status}
          </span>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full font-medium">
            <i className="fa-solid fa-lungs mr-1 text-clinical-500 dark:text-clinical-400"></i>{patient.suporte}
          </span>
          {patient.contato && <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/40 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full"><i className="fa-solid fa-shield-virus mr-1"></i>Contato</span>}
          {patient.vm      && <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700/40 text-rose-700 dark:text-rose-400 px-2.5 py-1 rounded-full"><i className="fa-solid fa-wind mr-1"></i>VM Invasiva</span>}
        </div>
      </div>

      {/* Sinais Vitais */}
      <div className={`${card} p-5`}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-clinical-600 dark:text-clinical-400 flex items-center gap-2 mb-3">
          <i className="fa-solid fa-heart-pulse"></i> Sinais Vitais
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <VitalBox label="SpO₂" value={`${patient.spO2}%`}           alert={patient.spO2<94}/>
          <VitalBox label="FC"   value={`${patient.fc}`}               alert={patient.fc>170}/>
          <VitalBox label="FR"   value={patient.vm?'—':`${patient.fr}`} alert={!patient.vm&&patient.fr>50}/>
          <VitalBox label="PAS"  value={`${patient.pas}`}              alert={patient.pas<80}/>
          <VitalBox label="PAD"  value={`${patient.pad}`}/>
          <VitalBox label="Temp" value={`${patient.temp}°`}            alert={patient.temp>=38.0}/>
        </div>
      </div>

      {/* Diagnóstico */}
      <div className={`${card} p-4`}>
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">Diagnóstico</span>
        <p className="text-sm font-semibold text-slate-800 dark:text-white">{patient.diagnostico}</p>
      </div>

      {/* ABAS */}
      <div className={`${card} overflow-hidden`}>
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)}
              className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors ${tab===t.key?'text-clinical-600 dark:text-clinical-400 border-b-2 border-clinical-500':'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
              <i className={`fa-solid ${t.icon}`}></i>
              <span className="hidden sm:inline ml-1">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* FISIOTERAPIA */}
          {tab==='fisio' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {label:'Suporte Ventilatório',opts:DEVICE_OPTIONS,def:patient.suporte},
                  {label:'Posicionamento',opts:['Decúbito Dorsal 0°','Cabeceira 30°','Cabeceira 45°','Decúbito Lateral D','Decúbito Lateral E','Pronado','Sentado'],def:'Cabeceira 30°'},
                  {label:'Aspiração',opts:['Não realizada','Nasofaríngea','Orofaríngea','TQT/TOT','Hiperinsuflação + aspiração'],def:'Não realizada'},
                ].map(f=>(
                  <div key={f.label}>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">{f.label}</label>
                    <select className={selectCls}>
                      <option>{f.def}</option>
                      {f.opts.filter(o=>o!==f.def).map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-2">Técnicas Realizadas</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                  {['Drenagem postural','Vibro-compressão','Huffing','Espirometria de incentivo','Cinesioterapia Resp.','Mobilização passiva','Mobilização ativa','Estimulação diafragmática','Treino muscular resp.'].map(t=>(
                    <label key={t} className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer group">
                      <input type="checkbox" className="accent-clinical-500 rounded"/>
                      <span className="group-hover:text-clinical-600 dark:group-hover:text-clinical-400 transition-colors">{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Nível de Funcionalidade */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
                <SectionLabel icon="fa-person-walking" text="Nível de Funcionalidade" color="text-clinical-600 dark:text-clinical-400"/>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {NIVEIS.map(n=>(
                    <button key={n.n} onClick={()=>setNivel(n.n)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${nivel===n.n?'bg-clinical-50 dark:bg-clinical-500/20 border-clinical-300 dark:border-clinical-500 text-clinical-700 dark:text-clinical-300':'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${nivel===n.n?'bg-clinical-500 text-white':'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>{n.n}</span>
                      <span className="text-[10px] leading-tight">{n.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Alertas */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
                <SectionLabel icon="fa-triangle-exclamation" text="Alertas para Fisioterapia" color="text-amber-600 dark:text-amber-400"/>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                  {ALERTAS.map(a=>(
                    <label key={a} className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer group">
                      <input type="checkbox" className="accent-amber-500 rounded"/>
                      <span className="group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{a}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Equipamentos */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
                <SectionLabel icon="fa-screwdriver-wrench" text="Problemas com Equipamentos?"/>
                <select onChange={e=>setEquipProblema(e.target.value==='S')} className={`${selectCls} mb-2`}>
                  <option value="N">Não — todos os equipamentos normais</option>
                  <option value="S">Sim — relatar problema / pane</option>
                </select>
                {equipProblema && <textarea rows={3} placeholder="Descreva o equipamento e o defeito..." className={`${inputCls} resize-none`}/>}
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">Condutas / Observações</label>
                <textarea rows={3} placeholder="Descreva as condutas realizadas..." className={`${inputCls} resize-none`}/>
              </div>

              <button className="w-full bg-clinical-500 hover:bg-clinical-600 text-white font-bold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2">
                <i className="fa-solid fa-floppy-disk"></i> Salvar Ficha
              </button>
            </div>
          )}

          {tab==='dispositivos' && <DispositivosPanel patient={patient}/>}
          {tab==='gas'          && <GasometriaPanel   patient={patient}/>}
          {tab==='scores'       && <ScoresPanel        patient={patient}/>}

          {tab==='evolucao' && (
            <div className="space-y-3">
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{patient.evolucao}</p>
                <span className="text-[10px] text-slate-400 dark:text-slate-600 mt-2 block">— Fisioterapeuta · Hoje</span>
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">Nova Evolução</label>
                <textarea rows={4} placeholder="Registre a evolução clínica..." className={`${inputCls} resize-none`}/>
              </div>
              <button className="w-full bg-clinical-500 hover:bg-clinical-600 text-white font-bold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2">
                <i className="fa-solid fa-floppy-disk"></i> Registrar Evolução
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── LISTA DE LEITOS ─────────────────────────────────── */
export default function Bedside() {
  const [search,setSearch]     = useState('');
  const [selected,setSelected] = useState<Patient|null>(null);
  const filtered = PATIENTS.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) || String(p.id).includes(search)
  );
  if (selected) return <PatientDetail patient={selected} onBack={()=>setSelected(null)}/>;

  return (
    <section className="p-6 space-y-4">
      <div className="relative">
        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Buscar por nome ou número do leito..."
          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-clinical-500 transition shadow-sm"/>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs text-slate-400 dark:text-slate-500">{filtered.length} leito{filtered.length!==1?'s':''}</span>
        <div className="flex items-center gap-2 flex-wrap">
          {(['Estável','Instável','Crítico','Alta Prevista'] as Status[]).map(s=>{
            const st=STATUS_STYLE[s];
            return <span key={s} className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>{s}
            </span>;
          })}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length===0 && (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500">
            <i className="fa-solid fa-bed text-4xl mb-3 block"></i>
            <p className="text-sm">Nenhum leito encontrado</p>
          </div>
        )}
        {filtered.map(p=>{
          const s=STATUS_STYLE[p.status];
          const ativo=p.dispositivos.find(d=>!d.retirada);
          return (
            <button key={p.id} onClick={()=>setSelected(p)}
              className={`w-full text-left bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 border-l-4 ${BORDER_COLOR[p.status]} rounded-2xl px-5 py-4 hover:shadow-md dark:hover:bg-slate-900/60 transition-all flex items-center gap-4 group`}>
              <div className="w-10 h-10 rounded-xl bg-clinical-500 text-white flex items-center justify-center text-sm font-extrabold shrink-0 shadow-md shadow-clinical-500/30">{p.id}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">{p.nome}</span>
                  <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>{p.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {calcIdade(p.nasc)}
                  {ativo && <span className="hidden sm:inline"> · <i className="fa-solid fa-lungs text-clinical-500 dark:text-clinical-400 mx-0.5"></i>{ativo.device} <span className="text-slate-400 dark:text-slate-500">({calcDuracao(ativo.inicio)})</span></span>}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  {p.contato && <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/40 px-2 py-0.5 rounded-full"><i className="fa-solid fa-shield-virus mr-1"></i>Contato</span>}
                  {p.vm      && <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-700/40 px-2 py-0.5 rounded-full"><i className="fa-solid fa-wind mr-1"></i>VM</span>}
                  {p.status==='Crítico' && <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-700/40 px-2 py-0.5 rounded-full animate-pulse"><i className="fa-solid fa-triangle-exclamation mr-1"></i>Atenção</span>}
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-center shrink-0">
                <span className={`text-lg font-extrabold font-mono ${p.spO2<94?'text-rose-600 dark:text-rose-500':'text-emerald-600 dark:text-emerald-500'}`}>{p.spO2}%</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">SpO₂</span>
              </div>
              <i className="fa-solid fa-chevron-right text-slate-300 dark:text-slate-600 group-hover:text-clinical-500 group-hover:translate-x-0.5 transition-all text-sm shrink-0"></i>
            </button>
          );
        })}
      </div>
    </section>
  );
}
