import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  Status, GasEntry, DeviceEntry, Patient,
  calcIdade, calcDias, calcDuracao, fromInputDate,
  PATIENTS, admitPatient, dischargePatient, nextFreeBed, persistPatient, fichaInicial,
  PRECAUCAO_LABEL, precaucoesDe, isRespiratorio, loadSinaisVitais, saveSinaisVitais,
  saveSuporteVentilatorio, isDbOnline, loadDispositivos, addDispositivo, removeDispositivo,
  ScoreRegistro, saveScore, loadScores, loadGasometria, saveGasometria, equipamentoParaSuporte,
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

// Aba Equipamentos: só dispositivos RESPIRATÓRIOS que a fisioterapia gerencia
// (os demais — CVC, AVP, SVD, SNE, drenos... — são da equipe médica/enfermagem).
const EQUIP_RESPIRATORIOS = [
  'Cateter Nasal de O₂','Máscara Comum','Máscara Concentradora','Máscara de Venturi',
  'CNAF','VNI','TOT','TQT',
];

/* ─── SUPORTE VENTILATÓRIO ATUAL — parâmetros obrigatórios por suporte ── */
interface ParamField { key:string; label:string; type?:'select'; opts?:string[]; optional?:boolean }
const F = (key:string,label:string,optional=false):ParamField => ({key,label,optional});

const VM_MODO_OPTS       = ['Assistido/Controlado','Espontâneo (PSV)'];
const VM_MODALIDADE_OPTS = ['Pressão Controlada','Volume Controlado','PRVC'];
const VM_PARAMS: Record<string,ParamField[]> = {
  'Pressão Controlada': [F('fio2','FiO₂ (%)'),F('peep','PEEP'),F('pip','PIP'),F('fr','FR'),F('ti','Ti'),F('sens','Sensibilidade'),F('ie','Relação I:E'),F('rampa','Rampa')],
  'Volume Controlado':  [F('fio2','FiO₂ (%)'),F('vc','VC'),F('fr','FR'),F('peep','PEEP'),F('fluxo','Fluxo Insp.'),F('pausa','Pausa Insp.'),F('ie','Relação I:E'),F('sens','Sensibilidade')],
  'PRVC':               [F('fio2','FiO₂ (%)'),F('vca','VC Alvo'),F('fr','FR'),F('peep','PEEP'),F('ti','Ti'),F('sens','Sensibilidade'),F('rampa','Rampa'),F('pip','PIP máx')],
  'Espontâneo (PSV)':   [F('fio2','FiO₂ (%)'),F('ps','P. Suporte'),F('peep','PEEP'),F('sens','Sensibilidade'),F('bkpi','Backup: Pi'),F('bkfr','Backup: FR'),F('bkti','Backup: Ti')],
};
// monitorização comum a todos os modos de VM — MAP obrigatória (entra no cálculo do IO)
const VM_COMUNS: ParamField[] = [F('map','MAP'),F('drive','Drive Pressure',true),F('volmin','Vol. Minuto',true),F('vce','VC Expirado',true)];
// via aérea artificial (VM por TOT ou TQT): nº do tubo/cânula e pressão de cuff obrigatórios
const VIA_AEREA: ParamField[] = [F('numTot','Nº TOT / Cânula'),F('cl','CL (cm)',true),F('cuff','Pressão de Cuff')];

const SUPORTE_PARAMS: Record<string,ParamField[]> = {
  'Ar Ambiente': [],
  'Cateter Nasal': [F('litros','Litros (L/min)')],
  'Máscara Comum': [F('fluxo','Fluxo (L/min)')],
  'Máscara Venturi': [F('fluxo','Fluxo (L/min)'),F('fio2','FiO₂ (%)')],
  'CNAF': [F('fluxo','Fluxo (L/min)'),F('fio2','FiO₂ (%)'),F('temp','Temperatura (°C)')],
  'VNI': [{key:'modalidade',label:'Modalidade',type:'select',opts:['CPAP','Bilevel']},F('interface','Interface'),F('fio2','FiO₂ (%)'),F('epap','EPAP'),F('ipap','IPAP',true)],
  'TQT em Ar Amb.': [],
  'TQT em O₂': [F('litros','Litros (L/min)')],
  'TOT em VM': [],
  'TQT em VM': [],
  'Pronação': [{key:'protocolo',label:'Protocolo',type:'select',opts:['18×6','20×4']}],
  'NOI (Óxido Nítrico)': [F('dose','Dose (ppm)')],
};
const isVM = (s:string) => s === 'TOT em VM' || s === 'TQT em VM';

const SUPORTE_STATUS_OPTS = ['Mantido','Em desmame','Suspenso'];
const INSTABILIDADES = ['Taquipneia','Bradipneia','Apneia','Bradicardia','Hipotermia mantida'];

/* ─── FIELD BOX (reutilizável) ───────────────────────── */
function FieldBox({label,value,span2}:{label:string;value:string;span2?:boolean}) {
  return (
    <div className={`bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 ${span2?'col-span-2':''}`}>
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">{label}</span>
      <span className="text-sm font-semibold text-slate-800 dark:text-white">{value}</span>
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
  const [form,setForm] = useState({data:'',hora:'',ph:'',paco2:'',pao2:'',hco3:'',be:'',fio2:'',map:''});
  const set = (k:string,v:string) => setForm(f=>({...f,[k]:v}));
  const online = isDbOnline() && !!patient.rowId;

  // carrega o histórico de gasometria da tabela fisio_gasometria
  useEffect(() => {
    if (!online || !patient.rowId) return;
    let ativo = true;
    loadGasometria(patient.rowId).then(regs => {
      if (ativo && regs) { setEntries(regs); patient.gas = regs; }
    });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = async () => {
    const pao2=parseFloat(form.pao2), fio2=parseFloat(form.fio2);
    const map = form.map ? parseFloat(form.map) : null;
    if (!form.data||!pao2||!fio2) return;
    // IO = MAP × FiO₂ × 100 / PaO₂ — calculado apenas quando a MAP é registrada
    const e: GasEntry = {data:form.data,hora:form.hora,ph:parseFloat(form.ph)||0,paco2:parseFloat(form.paco2)||0,pao2,hco3:parseFloat(form.hco3)||0,be:parseFloat(form.be)||0,fio2,map,pf:+(pao2/fio2).toFixed(0),io:map!=null?+(map*fio2*100/pao2).toFixed(1):null};
    const atualizadas = [...entries, e];
    setEntries(atualizadas);
    patient.gas = atualizadas;
    if (online && patient.rowId) await saveGasometria(patient.rowId, e);
    else void persistPatient(patient);
    setForm({data:'',hora:'',ph:'',paco2:'',pao2:'',hco3:'',be:'',fio2:'',map:''});
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
                <tr>{['Data','Hora','pH','PaCO₂','PaO₂','HCO₃','BE','FiO₂','MAP','P/F','IO'].map(h=>(
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
                    <td className="px-2 py-1.5 font-mono text-slate-700 dark:text-slate-300">{e.map??'—'}</td>
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
          {[{k:'data',label:'Data',type:'date'},{k:'hora',label:'Hora',type:'time'},{k:'ph',label:'pH',type:'number'},{k:'paco2',label:'PaCO₂',type:'number'},{k:'pao2',label:'PaO₂',type:'number'},{k:'hco3',label:'HCO₃',type:'number'},{k:'be',label:'BE',type:'number'},{k:'fio2',label:'FiO₂ (0.21–1.0)',type:'number'},{k:'map',label:'MAP (cmH₂O)',type:'number'}].map(f=>(
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
function DispositivosPanel({patient,onSuporteSugerido}:{patient:Patient;onSuporteSugerido?:(s:string)=>void}) {
  const [entries,setEntries] = useState<DeviceEntry[]>(patient.dispositivos);
  const [nextId,setNextId]   = useState(patient.dispositivos.length+1);
  const [newDevice,setNewDevice] = useState('');
  const [newLocal,setNewLocal] = useState('');
  const [newInicio,setNewInicio] = useState('');
  const [retiradaMap,setRetiradaMap] = useState<Record<number,string>>({});
  const online = isDbOnline() && !!patient.rowId;

  // carrega os dispositivos reais da tabela do Round (dispositivos_pacientes)
  useEffect(() => {
    if (!online || !patient.rowId) return;
    let ativo = true;
    loadDispositivos(patient.rowId).then(regs => {
      if (ativo && regs) { setEntries(regs); patient.dispositivos = regs; }
    });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addEntry = async () => {
    if (!newDevice||!newInicio) return;
    if (online && patient.rowId) {
      const id = await addDispositivo(patient.rowId, newDevice, newLocal.trim(), newInicio);
      if (id != null) {
        const nova = {id, device: newLocal.trim() ? `${newDevice} (${newLocal.trim()})` : newDevice, inicio: fromInputDate(newInicio)};
        const atualizados = [...entries, nova];
        setEntries(atualizados); patient.dispositivos = atualizados;
      }
    } else {
      const atualizados = [...entries, {id:nextId,device: newLocal.trim() ? `${newDevice} (${newLocal.trim()})` : newDevice, inicio:fromInputDate(newInicio)}];
      setEntries(atualizados); patient.dispositivos = atualizados;
      void persistPatient(patient); setNextId(n=>n+1);
    }
    // liga com o Suporte Ventilatório Atual: o equipamento criado vira o suporte vigente
    const sug = equipamentoParaSuporte(newDevice);
    if (sug) onSuporteSugerido?.(sug);
    setNewDevice(''); setNewLocal(''); setNewInicio('');
  };
  const markRetirada = async (id:number) => {
    const date=retiradaMap[id]; if (!date) return;
    if (online) await removeDispositivo(id, date);
    const atualizados = entries.map(e=>e.id===id?{...e,retirada:fromInputDate(date)}:e);
    setEntries(atualizados);
    patient.dispositivos = atualizados;
    if (!online) void persistPatient(patient);
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
              {EQUIP_RESPIRATORIOS.map(d=><option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">Localização{online && ' *'}</label>
            <input type="text" value={newLocal} onChange={e=>setNewLocal(e.target.value)} placeholder="Ex.: narina D, subclávia D, MSE" className={inputCls}/>
          </div>
          <div>
            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">Data de Início</label>
            <input type="date" value={newInicio} onChange={e=>setNewInicio(e.target.value)} className={inputCls}/>
          </div>
        </div>
        <button onClick={addEntry} disabled={!newDevice||!newInicio||(online&&!newLocal.trim())}
          className="w-full bg-clinical-500 hover:bg-clinical-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2">
          <i className="fa-solid fa-plus"></i> Registrar Equipamento
        </button>
        {online && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2"><i className="fa-solid fa-circle-info mr-1"></i>Salvo na tabela dispositivos_pacientes (compartilhada com o Round).</p>}
      </div>
    </div>
  );
}

/* ─── SCORES PANEL — escalas portadas do app Round ───── */
interface EscalaOpcao { valor: number; texto: string }
interface EscalaItem  { id: string; label: string; opcoes: EscalaOpcao[] }
interface EscalaResultado { texto: string; conduta: string; tom: 'ok'|'info'|'mod'|'grave' }

const TOM_CLASSES: Record<EscalaResultado['tom'],string> = {
  ok:    'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/40',
  info:  'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700/40',
  mod:   'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/40',
  grave: 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-700/40',
};

const mkOpts = (...textos: string[]): EscalaOpcao[] => textos.map((texto,valor)=>({valor,texto}));

/* Boletim Silverman-Anderson — RN (0–28 dias) — /10 */
const SILVERMAN_ITENS: EscalaItem[] = [
  { id:'movimento',  label:'Mov. Tóraco-Abdominal',   opcoes: mkOpts('Sincrônico','Leve assincronia','Paradoxal') },
  { id:'intercostal',label:'Retração Intercostal',    opcoes: mkOpts('Ausente','Leve','Marcada') },
  { id:'xifoide',    label:'Retração Xifoide',        opcoes: mkOpts('Ausente','Leve','Marcada') },
  { id:'asaNasal',   label:'Batimento de Asa Nasal',  opcoes: mkOpts('Ausente','Discreto','Marcado') },
  { id:'gemido',     label:'Gemido Expiratório',      opcoes: mkOpts('Ausente','Audível com estetoscópio','Audível sem estetoscópio') },
];
const interpretaSilverman = (t:number): EscalaResultado =>
  t===0 ? { texto:'Sem desconforto respiratório', conduta:'Observação / O₂ se necessário', tom:'ok' }
  : t<=3 ? { texto:'Desconforto Leve', conduta:'Observação / O₂ se necessário', tom:'ok' }
  : t<=6 ? { texto:'Desconforto Moderado', conduta:'CPAP nasal ou CNAF', tom:'mod' }
  : { texto:'Desconforto Grave', conduta:'Forte possibilidade de VMPI', tom:'grave' };

/* Wood-Downes modificada por Ferrés — Lactentes (30 dias a 2 anos) — /14 */
const WDF_ITENS: EscalaItem[] = [
  { id:'sibilos',   label:'Sibilos',            opcoes: mkOpts('Ausente','Expiratório','Contínuos','Inspiratório + Expiratório') },
  { id:'tiragem',   label:'Tiragem',            opcoes: mkOpts('Ausente','Subcostal','Supraclavicular','Generalizada') },
  { id:'ventilacao',label:'Ventilação',         opcoes: mkOpts('Boa','Regular','Diminuída','Silenciosa') },
  { id:'fr',        label:'FR (irpm)',          opcoes: mkOpts('< 30 irpm','31 a 45 irpm','46 a 60 irpm','> 60 irpm') },
  { id:'fc',        label:'FC (bpm)',           opcoes: mkOpts('< 120 bpm','≥ 120 bpm') },
  { id:'cianose',   label:'Cianose',            opcoes: mkOpts('Ausente','Presente') },
];
const interpretaWDF = (t:number): EscalaResultado =>
  t===0 ? { texto:'Sem alterações', conduta:'Manter observação', tom:'ok' }
  : t<=3 ? { texto:'Desconforto Leve', conduta:'CN ou CNAF', tom:'ok' }
  : t<=7 ? { texto:'Desconforto Moderado', conduta:'CNAF ou VNI', tom:'mod' }
  : { texto:'Desconforto Grave', conduta:'VMPI', tom:'grave' };

/* Avaliação de Insuficiência Respiratória — Pré-escolar/Escolar/Adolescente — /12 */
const INSUF_ITENS: EscalaItem[] = [
  { id:'fr',        label:'Frequência Respiratória',       opcoes: mkOpts('Normal para a idade','Moderadamente aumentada','Taquipneia intensa') },
  { id:'musculatura',label:'Musculatura Acessória',        opcoes: mkOpts('Ausente','Leve (asa nasal, retração intercostal)','Intensa (tiragem subcostal ou esternocleidomastoideo)') },
  { id:'ausculta',  label:'Ausculta Pulmonar',             opcoes: mkOpts('Som pulmonar preservado','Redução do som pulmonar','Redução acentuada / sibilos silenciosos') },
  { id:'cianose',   label:'Cianose',                       opcoes: mkOpts('Ausente','Perioral (com esforço)','Generalizada ou em repouso') },
  { id:'mental',    label:'Estado Mental',                 opcoes: mkOpts('Alerta','Irritado, ansioso','Sonolento, confuso, obnubilado') },
  { id:'saturacao', label:'Saturação de O₂ (Ar Ambiente)', opcoes: mkOpts('≥ 94%','90 a 93%','< 90%') },
];
const interpretaInsuf = (t:number): EscalaResultado =>
  t<=3 ? { texto:'Insuficiência Respiratória Leve', conduta:'Observação — sem sinais de alerta', tom:'ok' }
  : t<=6 ? { texto:'Insuficiência Respiratória Moderada', conduta:'Considerar oxigenoterapia', tom:'mod' }
  : { texto:'Insuficiência Respiratória Grave', conduta:'Avaliar escalonamento do suporte ventilatório', tom:'grave' };

/* Glasgow por faixa etária — /15 */
const GLASGOW_OCULAR: EscalaOpcao[] = [
  { valor:1, texto:'Nenhuma' }, { valor:2, texto:'À dor' }, { valor:3, texto:'Ao som' }, { valor:4, texto:'Espontânea' },
];
const GLASGOW_FAIXAS: Record<string,{titulo:string; verbal:EscalaOpcao[]; motora:EscalaOpcao[]}> = {
  adulto: {
    titulo:'Adulto / Criança (≥ 5 anos)',
    verbal: [
      { valor:1, texto:'Nenhuma' }, { valor:2, texto:'Sons incompreensíveis' }, { valor:3, texto:'Palavras inadequadas' },
      { valor:4, texto:'Confuso' }, { valor:5, texto:'Orientado' },
    ],
    motora: [
      { valor:1, texto:'Nenhuma' }, { valor:2, texto:'Extensão anormal (descerebração)' }, { valor:3, texto:'Flexão anormal (decorticação)' },
      { valor:4, texto:'Retirada inespecífica' }, { valor:5, texto:'Localiza dor' }, { valor:6, texto:'Obedece comandos' },
    ],
  },
  crianca: {
    titulo:'Pediátrica (1 a 4 anos)',
    verbal: [
      { valor:1, texto:'Nenhuma vocalização' }, { valor:2, texto:'Gemidos de dor' }, { valor:3, texto:'Choro persistente / irritado' },
      { valor:4, texto:'Choro consolável' }, { valor:5, texto:'Balbucia / vocaliza adequadamente' },
    ],
    motora: [
      { valor:1, texto:'Nenhuma resposta motora' }, { valor:2, texto:'Extensão anormal (descerebração)' }, { valor:3, texto:'Flexão anormal (decorticação)' },
      { valor:4, texto:'Retirada inespecífica' }, { valor:5, texto:'Retirada ao toque/dor' }, { valor:6, texto:'Mov. espontâneos / obedece comandos simples' },
    ],
  },
  lactente: {
    titulo:'Pediátrica (< 1 ano)',
    verbal: [
      { valor:1, texto:'Ausência de sons' }, { valor:2, texto:'Gemido à dor' }, { valor:3, texto:'Choro inconsolável' },
      { valor:4, texto:'Chora mas é consolável' }, { valor:5, texto:'Sons normais / balbucia' },
    ],
    motora: [
      { valor:1, texto:'Nenhuma resposta' }, { valor:2, texto:'Extensão anormal (descerebração)' }, { valor:3, texto:'Flexão anormal (decorticação)' },
      { valor:4, texto:'Retirada inespecífica' }, { valor:5, texto:'Retirada ao estímulo doloroso' }, { valor:6, texto:'Movimentos espontâneos / retira ao toque' },
    ],
  },
};
const interpretaGlasgow = (t:number): EscalaResultado =>
  t>=13 ? { texto:'Alteração Leve', conduta:'Consciência preservada', tom:'ok' }
  : t>=9 ? { texto:'Alteração Moderada', conduta:'Rebaixamento moderado', tom:'mod' }
  : t>=6 ? { texto:'Coma Grave', conduta:'Indicação de via aérea definitiva', tom:'grave' }
  : { texto:'Extremamente Grave', conduta:'Risco de dano neurológico extenso', tom:'grave' };

/* COMFORT-B — /30 (domínio 3 muda conforme intubado) */
const mkOpts1 = (...textos: string[]): EscalaOpcao[] => textos.map((texto,i)=>({valor:i+1,texto}));
const COMFORT_BASE = {
  alerta:    { id:'alerta',   label:'1 – Alerta',            opcoes: mkOpts1('Sonolento','Acordado, mas não totalmente alerta','Alerta','Muito alerta / hipervigilante','Agitado') },
  calma:     { id:'calma',    label:'2 – Calma / Agitação',  opcoes: mkOpts1('Calmo','Leve inquietação','Moderadamente inquieto','Agitado','Muito agitado / inconsolável') },
  choro:     { id:'choro',    label:'3 – Choro (não intubado)', opcoes: mkOpts1('Não chora','Geme / choraminga','Choro moderado','Choro forte','Choro intenso / contínuo') },
  respiracao:{ id:'respiracao',label:'3 – Respiração (intubado)', opcoes: mkOpts1('Sem esforço respiratório','Leve desconforto respiratório','Moderado desconforto respiratório','Respiração irregular / agitada','Grande esforço respiratório') },
  movimento: { id:'movimento',label:'4 – Movimentos Físicos', opcoes: mkOpts1('Sem movimento','Movimentos mínimos','Movimentos moderados','Movimentos frequentes','Movimentos intensos / desorganizados') },
  tonus:     { id:'tonus',    label:'5 – Tônus Corporal',     opcoes: mkOpts1('Relaxado','Levemente aumentado','Aumentado','Muito aumentado','Extremamente rígido') },
  tensao:    { id:'tensao',   label:'6 – Tensão Facial',      opcoes: mkOpts1('Sem tensão','Leve tensão','Moderada tensão','Tensão evidente','Tensão extrema / expressão de dor') },
};
const interpretaComfort = (t:number): EscalaResultado =>
  t<=10 ? { texto:'Sedação Excessiva', conduta:'Paciente muito sedado — avaliar reduzir medicação', tom:'info' }
  : t<=22 ? { texto:'Conforto Adequado', conduta:'Nível ideal de analgesia e sedação', tom:'ok' }
  : { texto:'Dor / Desconforto', conduta:'Paciente em sofrimento — reavaliar conduta imediatamente', tom:'grave' };

/* Escore de Resposta a VNI/CNAF — /14 */
const VNICNAF_ITENS: EscalaItem[] = [
  { id:'fr',          label:'1. Frequência Respiratória (FR)', opcoes: mkOpts('Redução > 20%','Redução < 20% persistente','Sem mudança ou aumento') },
  { id:'musculatura', label:'2. Uso de Musculatura Acessória', opcoes: mkOpts('Reduzido','Persistente','Aumenta ou permanece intenso') },
  { id:'consciencia', label:'3. Nível de Consciência',         opcoes: mkOpts('Alerta, melhora clínica','Mantém irritabilidade leve','Sonolência, rebaixamento, letargia') },
  { id:'saturacao',   label:'4. Saturação com VNI/CNAF',       opcoes: mkOpts('≥ 94% com FiO₂ ≤ 40%','90–93% com FiO₂ ≤ 50%','< 90% com FiO₂ ≤ 60%') },
  { id:'gasometria',  label:'5. Gasometria Arterial (se disponível)', opcoes: mkOpts('pH > 7,3 · PaCO₂ menor ou estável','pH 7,25 a 7,3 · PaCO₂ maior ou leve','pH < 7,25 · PaCO₂ subindo progressivamente') },
  { id:'conforto',    label:'6. Conforto Respiratório',        opcoes: mkOpts('Confortável','Leve desconforto persistente','Piora do desconforto') },
  { id:'ausculta',    label:'7. Ausculta Pulmonar',            opcoes: mkOpts('Melhora de entrada de ar','Sem mudança significativa','Redução acentuada, sinais de esgotamento') },
];
const interpretaVniCnaf = (t:number): EscalaResultado =>
  t<=4 ? { texto:'Boa Resposta à VNI/CNAF', conduta:'Manter estratégia atual e monitorar', tom:'ok' }
  : t<=8 ? { texto:'Resposta Parcial / Vigilância', conduta:'Vigilância intensa — reavaliar parâmetros (IPAP, EPAP, FiO₂, interface)', tom:'mod' }
  : { texto:'Sinais de Falência', conduta:'Possível indicação de IOT — RNC, hipoxemia refratária, hipercapnia progressiva', tom:'grave' };

/* Formulário genérico de escala (padrão do Round) */
function EscalaRoundForm({itens,max,interpreta,scaleName,patientRowId}:{itens:EscalaItem[]; max:number; interpreta:(t:number)=>EscalaResultado; scaleName:string; patientRowId?:string}) {
  const [resp,setResp] = useState<Record<string,number>>({});
  const [historico,setHistorico] = useState<ScoreRegistro[]>([]);
  const [gravando,setGravando] = useState(false);
  const [gravado,setGravado] = useState(false);
  const respondidos = Object.keys(resp).length;
  const total = (Object.values(resp) as number[]).reduce((s,v)=>s+v,0);
  const completo = respondidos === itens.length;
  const res = completo ? interpreta(total) : null;
  const online = isDbOnline() && !!patientRowId;

  useEffect(() => {
    if (!online || !patientRowId) return;
    let ativo = true;
    loadScores(patientRowId, scaleName).then(regs => { if (ativo && regs) setHistorico(regs); });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scaleName]);

  const gravar = async () => {
    if (!res || !patientRowId) return;
    setGravando(true);
    const ok = await saveScore(patientRowId, scaleName, total, `${res.texto} — ${res.conduta}`);
    setGravando(false);
    if (ok) {
      setGravado(true);
      setTimeout(()=>setGravado(false), 3000);
      const regs = await loadScores(patientRowId, scaleName);
      if (regs) setHistorico(regs);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {itens.map(item=>(
          <div key={item.id}>
            <label className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-widest block mb-1">{item.label}</label>
            <select value={resp[item.id] ?? ''} onChange={e=>setResp(p=>({...p,[item.id]:parseInt(e.target.value)}))} className={selectCls}>
              <option value="" disabled>Selecione...</option>
              {item.opcoes.map(o=><option key={o.valor} value={o.valor}>{o.valor} — {o.texto}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-clinical-500 transition-all duration-500" style={{width:`${respondidos/itens.length*100}%`}}/>
      </div>
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between gap-3 flex-wrap">
        <span className="text-3xl font-extrabold text-slate-800 dark:text-white font-mono">{total}<span className="text-slate-400 text-lg"> / {max}</span></span>
        {res
          ? <div className={`px-3 py-2 rounded-xl text-xs font-bold border text-right ${TOM_CLASSES[res.tom]}`}>
              <div>{res.texto}</div>
              <div className="font-normal opacity-90 mt-0.5">{res.conduta}</div>
            </div>
          : <span className="text-[10px] text-slate-400 dark:text-slate-500">Responda os itens ({respondidos}/{itens.length})</span>}
      </div>

      {/* Gravar no prontuário (tabela scale_scores, compartilhada com o Round) */}
      <div className="flex items-center justify-end gap-3 flex-wrap">
        {gravado && <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"><i className="fa-solid fa-circle-check mr-1"></i>Gravado no prontuário</span>}
        <button onClick={gravar} disabled={!res || !online || gravando}
          className="bg-clinical-500 hover:bg-clinical-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-2">
          <i className="fa-solid fa-floppy-disk"></i> {gravando ? 'Gravando...' : 'Gravar no Prontuário'}
        </button>
      </div>
      {!online && <p className="text-[10px] text-amber-600 dark:text-amber-400 text-right"><i className="fa-solid fa-triangle-exclamation mr-1"></i>Modo demonstração — não grava no prontuário</p>}

      {/* Histórico do score (scale_scores) */}
      {historico.length>0 && (
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
          <SectionLabel icon="fa-clock-rotate-left" text="Histórico registrado"/>
          <div className="space-y-1.5">
            {historico.map((h,i)=>(
              <div key={i} className="flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5">
                <span className="text-slate-500 dark:text-slate-400">{new Date(h.date).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{h.score} <span className="font-normal text-slate-400">· {h.interpretation}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FaixaChips<T extends string>({opcoes,valor,onChange}:{opcoes:{key:T;label:string}[]; valor:T; onChange:(v:T)=>void}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {opcoes.map(o=>(
        <button key={o.key} onClick={()=>onChange(o.key)}
          className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full border transition ${valor===o.key
            ?'bg-clinical-500 text-white border-clinical-500 shadow-sm'
            :'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-clinical-400'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ScoresPanel({patient}:{patient:Patient}) {
  const [activeCalc,setActiveCalc] = useState<string|null>(null);

  // sugere a faixa etária a partir do nascimento
  const idadeDias = (() => {
    const [d,m,a] = patient.nasc.split('/').map(Number);
    return Math.floor((Date.now() - new Date(a,m-1,d).getTime()) / 86400000);
  })();
  const [confortoFaixa,setConfortoFaixa] = useState<'rn'|'lactente'|'crianca'>(idadeDias<=28?'rn':idadeDias<=730?'lactente':'crianca');
  const [glasgowFaixa,setGlasgowFaixa]   = useState<'lactente'|'crianca'|'adulto'>(idadeDias<365?'lactente':idadeDias<5*365?'crianca':'adulto');
  const [intubado,setIntubado]           = useState(patient.vm);

  // histórico de TODOS os scores registrados (scale_scores), para ver por data
  const [historicoGeral,setHistoricoGeral] = useState<ScoreRegistro[]>([]);
  useEffect(() => {
    if (!isDbOnline() || !patient.rowId) return;
    let ativo = true;
    loadScores(patient.rowId).then(regs => { if (ativo && regs) setHistoricoGeral(regs); });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCalc]);

  // agrupa por dia (dd/mm/yyyy) para exibir "por data"
  const historicoPorData = (() => {
    const grupos = new Map<string, ScoreRegistro[]>();
    historicoGeral.forEach(h => {
      const dia = new Date(h.date).toLocaleDateString('pt-BR');
      const arr = grupos.get(dia) ?? [];
      arr.push(h); grupos.set(dia, arr);
    });
    return [...grupos.entries()];
  })();

  if (!activeCalc) return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {[
          {key:'conforto', icon:'fa-child', title:'Conforto Respiratório', sub:'Silverman (RN) · Wood-Downes-Ferrés · Insuf. Resp.'},
          {key:'glasgow',  icon:'fa-brain', title:'Glasgow',               sub:'Por faixa etária · 3–15'},
          {key:'comfort',  icon:'fa-bed',   title:'COMFORT-B',             sub:'Dor e desconforto · 6–30'},
          {key:'vnicnaf',  icon:'fa-wind',  title:'Resposta VNI/CNAF',     sub:'Escore de resposta · 0–14'},
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

      {/* Scores cadastrados, organizados por data */}
      {historicoPorData.length > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
          <SectionLabel icon="fa-clock-rotate-left" text="Scores Cadastrados — por Data"/>
          <div className="space-y-3">
            {historicoPorData.map(([dia,itens])=>(
              <div key={dia}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold text-clinical-600 dark:text-clinical-400 bg-clinical-50 dark:bg-clinical-500/10 border border-clinical-200 dark:border-clinical-500/30 px-2 py-0.5 rounded-full">
                    <i className="fa-regular fa-calendar mr-1"></i>{dia}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{itens.length} registro{itens.length!==1?'s':''}</span>
                </div>
                <div className="space-y-1.5">
                  {itens.map((h,i)=>(
                    <div key={i} className="flex items-center justify-between gap-2 text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5">
                      <div className="min-w-0">
                        <span className="font-bold text-slate-700 dark:text-slate-200">{h.scale_name}</span>
                        <span className="text-slate-400 dark:text-slate-500 ml-2">{new Date(h.date).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                      <span className="shrink-0 text-slate-600 dark:text-slate-300 font-semibold">{h.score} <span className="font-normal text-slate-400">· {h.interpretation}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const glasgowItens: EscalaItem[] = [
    { id:'ocular', label:'Abertura Ocular', opcoes: GLASGOW_OCULAR },
    { id:'verbal', label:'Resposta Verbal', opcoes: GLASGOW_FAIXAS[glasgowFaixa].verbal },
    { id:'motora', label:'Resposta Motora', opcoes: GLASGOW_FAIXAS[glasgowFaixa].motora },
  ];
  const comfortItens: EscalaItem[] = [
    COMFORT_BASE.alerta, COMFORT_BASE.calma,
    intubado ? COMFORT_BASE.respiracao : COMFORT_BASE.choro,
    COMFORT_BASE.movimento, COMFORT_BASE.tonus, COMFORT_BASE.tensao,
  ];

  return (
    <div className="space-y-4">
      <button onClick={()=>setActiveCalc(null)} className="flex items-center gap-2 text-xs text-slate-500 hover:text-clinical-500 transition-colors">
        <i className="fa-solid fa-arrow-left"></i> Voltar
      </button>

      {activeCalc==='conforto' && (
        <div className="space-y-3">
          <div className="bg-clinical-50 dark:bg-slate-900 border border-clinical-200 dark:border-clinical-500/30 p-3 rounded-xl">
            <span className="text-[10px] font-bold text-clinical-600 dark:text-clinical-400 uppercase tracking-wider block mb-2">Conforto Respiratório — Faixa Etária</span>
            <FaixaChips<'rn'|'lactente'|'crianca'>
              opcoes={[
                {key:'rn',label:'RN (0–28d) · Silverman'},
                {key:'lactente',label:'Lactente (até 2a) · Wood-Downes-Ferrés'},
                {key:'crianca',label:'Pré-escolar+ · Insuf. Resp.'},
              ]}
              valor={confortoFaixa} onChange={setConfortoFaixa}
            />
          </div>
          {confortoFaixa==='rn'       && <EscalaRoundForm key="rn"  scaleName="Silverman-Anderson"    patientRowId={patient.rowId} itens={SILVERMAN_ITENS} max={10} interpreta={interpretaSilverman}/>}
          {confortoFaixa==='lactente' && <EscalaRoundForm key="wdf" scaleName="Wood-Downes-Ferrés"     patientRowId={patient.rowId} itens={WDF_ITENS}       max={14} interpreta={interpretaWDF}/>}
          {confortoFaixa==='crianca'  && <EscalaRoundForm key="ins" scaleName="Ins. Resp. Pediátrica"  patientRowId={patient.rowId} itens={INSUF_ITENS}     max={12} interpreta={interpretaInsuf}/>}
        </div>
      )}

      {activeCalc==='glasgow' && (
        <div className="space-y-3">
          <div className="bg-clinical-50 dark:bg-slate-900 border border-clinical-200 dark:border-clinical-500/30 p-3 rounded-xl">
            <span className="text-[10px] font-bold text-clinical-600 dark:text-clinical-400 uppercase tracking-wider block mb-2">Escala de Glasgow — Versão</span>
            <FaixaChips<'lactente'|'crianca'|'adulto'>
              opcoes={[
                {key:'lactente',label:'< 1 ano'},
                {key:'crianca',label:'1 a 4 anos'},
                {key:'adulto',label:'≥ 5 anos'},
              ]}
              valor={glasgowFaixa} onChange={setGlasgowFaixa}
            />
          </div>
          <EscalaRoundForm key={glasgowFaixa} scaleName="Escala de Glasgow" patientRowId={patient.rowId} itens={glasgowItens} max={15} interpreta={interpretaGlasgow}/>
        </div>
      )}

      {activeCalc==='comfort' && (
        <div className="space-y-3">
          <div className="bg-clinical-50 dark:bg-slate-900 border border-clinical-200 dark:border-clinical-500/30 p-3 rounded-xl">
            <span className="text-[10px] font-bold text-clinical-600 dark:text-clinical-400 uppercase tracking-wider block mb-2">Escala COMFORT-B — Domínio 3</span>
            <FaixaChips
              opcoes={[
                {key:'nao' as const,label:'Não intubado (Choro)'},
                {key:'sim' as const,label:'Intubado (Respiração)'},
              ]}
              valor={intubado?'sim':'nao'} onChange={v=>setIntubado(v==='sim')}
            />
          </div>
          <EscalaRoundForm key={intubado?'int':'ni'} scaleName="COMFORT-B" patientRowId={patient.rowId} itens={comfortItens} max={30} interpreta={interpretaComfort}/>
        </div>
      )}

      {activeCalc==='vnicnaf' && (
        <div className="space-y-3">
          <div className="bg-clinical-50 dark:bg-slate-900 border border-clinical-200 dark:border-clinical-500/30 p-3 rounded-xl">
            <span className="text-[10px] font-bold text-clinical-600 dark:text-clinical-400 uppercase tracking-wider">Escore de Resposta a VNI/CNAF em Pediatria</span>
          </div>
          <EscalaRoundForm scaleName="Escore VNI/CNAF" patientRowId={patient.rowId} itens={VNICNAF_ITENS} max={14} interpreta={interpretaVniCnaf}/>
        </div>
      )}
    </div>
  );
}

/* ─── PATIENT DETAIL ─────────────────────────────────── */
type TurnoKey = 'M'|'T'|'N';
const VITAL_VAZIO = {spO2:'',fc:'',fr:'',pas:'',pad:'',temp:''};

function PatientDetail({patient,onBack,onDischarge}:{patient:Patient;onBack:()=>void;onDischarge:()=>void}) {
  const [tab,setTab] = useState<'fisio'|'dispositivos'|'gas'|'scores'|'evolucao'>('fisio');
  const [equipProblema,setEquipProblema] = useState(false);
  const [nivel,setNivel] = useState(1);
  const [,refresh] = useState(0);
  const s  = STATUS_STYLE[patient.status];
  const dias = calcDias(patient.data_internacao);
  const alertaResp = patient.alertaResp ?? isRespiratorio(patient.diagnostico);

  /* ── Cabeçalho editável ── */
  const [editHeader,setEditHeader] = useState(false);
  const [hdr,setHdr] = useState({
    nome:patient.nome, mae:patient.mae, pesoKg:String(patient.pesoKg), altCm:String(patient.altCm),
    satAlvoMin:String(patient.satAlvoMin), satAlvoMax:String(patient.satAlvoMax),
    volCorrenteAlvo:String(patient.volCorrenteAlvo), fisioResponsavel:patient.fisioResponsavel,
  });
  const setH = (k:string,v:string) => setHdr(h=>({...h,[k]:v}));
  const salvarHeader = () => {
    Object.assign(patient, {
      nome: hdr.nome.trim().toUpperCase() || patient.nome,
      mae: hdr.mae.trim().toUpperCase(),
      pesoKg: parseFloat(hdr.pesoKg) || patient.pesoKg,
      altCm: parseFloat(hdr.altCm) || patient.altCm,
      satAlvoMin: parseInt(hdr.satAlvoMin) || patient.satAlvoMin,
      satAlvoMax: parseInt(hdr.satAlvoMax) || patient.satAlvoMax,
      volCorrenteAlvo: parseInt(hdr.volCorrenteAlvo) || patient.volCorrenteAlvo,
      fisioResponsavel: hdr.fisioResponsavel.trim() || patient.fisioResponsavel,
    });
    void persistPatient(patient);
    setEditHeader(false); refresh(n=>n+1);
  };

  /* ── Sinais vitais por data e turno (M/T/N) — tabela fisio_sinais_vitais ── */
  const hojeInput = new Date().toISOString().slice(0,10);
  const vitaisIniciais = (): Record<TurnoKey,typeof VITAL_VAZIO> => ({
    M:{spO2:String(patient.spO2),fc:String(patient.fc),fr:patient.vm?'':String(patient.fr),pas:String(patient.pas),pad:String(patient.pad),temp:String(patient.temp)},
    T:{...VITAL_VAZIO}, N:{...VITAL_VAZIO},
  });
  const [turnoVital,setTurnoVital] = useState<TurnoKey>('M');
  const [svData,setSvData] = useState(hojeInput);
  const [svStatus,setSvStatus] = useState<string|null>(null);
  const [vitais,setVitais] = useState<Record<TurnoKey,typeof VITAL_VAZIO>>(vitaisIniciais);
  const [instab,setInstab] = useState<Record<TurnoKey,string[]>>({M:[],T:[],N:[]});

  // ao abrir a ficha (ou trocar a data), busca os registros salvos daquele dia
  useEffect(() => {
    setSvStatus(null);
    setVitais(svData === hojeInput ? vitaisIniciais() : {M:{...VITAL_VAZIO},T:{...VITAL_VAZIO},N:{...VITAL_VAZIO}});
    setInstab({M:[],T:[],N:[]});
    if (!patient.rowId) return;
    let ativo = true;
    loadSinaisVitais(patient.rowId, svData).then(regs => {
      if (!ativo || !regs) return;
      setVitais(prev => {
        const nv = {...prev};
        (['M','T','N'] as TurnoKey[]).forEach(t => {
          const r = regs[t];
          if (r) nv[t] = { spO2:r.spO2, fc:r.fc, fr:r.fr, pas:r.pas, pad:r.pad, temp:r.temp };
        });
        return nv;
      });
      setInstab(prev => {
        const ni = {...prev};
        (['M','T','N'] as TurnoKey[]).forEach(t => { const r = regs[t]; if (r) ni[t] = r.instabilidades; });
        return ni;
      });
    });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svData]);

  const salvarSinais = async () => {
    if (!patient.rowId) { setSvStatus('demo'); return; }
    const ok = await saveSinaisVitais(patient.rowId, svData, turnoVital, {
      ...vitais[turnoVital], instabilidades: instab[turnoVital],
    });
    setSvStatus(ok ? `salvo:${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}` : 'erro');
  };
  const setVital = (k:string,v:string) => setVitais(vs=>({...vs,[turnoVital]:{...vs[turnoVital],[k]:v}}));
  const toggleInstab = (a:string) => setInstab(m=>({
    ...m,[turnoVital]: m[turnoVital].includes(a) ? m[turnoVital].filter(x=>x!==a) : [...m[turnoVital],a],
  }));

  /* cronômetro de 60s — o campo FR só libera junto com a contagem */
  const [frSeg,setFrSeg] = useState<number|null>(null);
  const [frLiberado,setFrLiberado] = useState<Record<TurnoKey,boolean>>({M:false,T:false,N:false});
  useEffect(() => {
    if (frSeg === null || frSeg <= 0) return;
    const t = setTimeout(() => setFrSeg(sg => (sg ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [frSeg]);
  const iniciarFR = () => { setFrLiberado(l=>({...l,[turnoVital]:true})); setFrSeg(60); };

  /* ── Suporte Ventilatório Atual (tabela fisio_suporte_ventilatorio) ── */
  const sd = patient.suporteDetalhe;
  const [suporte,setSuporte] = useState(sd?.suporte ?? patient.suporte);
  const [vmModo,setVmModo] = useState(sd?.modo ?? '');
  const [vmModalidade,setVmModalidade] = useState(sd?.modalidade ?? '');
  const [ventParams,setVentParams] = useState<Record<string,string>>(sd?.parametros ?? {});
  const [suporteStatus,setSuporteStatus] = useState(sd?.situacao ?? 'Mantido');
  const [progExtub,setProgExtub] = useState(sd?.progExtubacao ?? false);
  const [progExtubData,setProgExtubData] = useState(sd?.progExtubacaoData ?? '');
  const [suporteSalvo,setSuporteSalvo] = useState(false);
  const trocarSuporte = (v:string) => { setSuporte(v); setVmModo(''); setVmModalidade(''); setVentParams({}); };
  const setParam = (k:string,v:string) => setVentParams(p=>({...p,[k]:v}));
  const modalidadeAtiva = vmModo==='Espontâneo (PSV)' ? 'Espontâneo (PSV)' : vmModalidade;

  /* ── Alertas + restrição de decúbito ── */
  const [alertasSel,setAlertasSel] = useState<string[]>([]);
  const [decubLado,setDecubLado] = useState('');
  const [decubJust,setDecubJust] = useState('');
  const toggleAlerta = (a:string) => setAlertasSel(sel=>sel.includes(a)?sel.filter(x=>x!==a):[...sel,a]);
  const restricaoDecub = alertasSel.includes('Restrição de decúbito');

  /* ── Validação da ficha ── */
  const [erros,setErros] = useState<string[]>([]);
  const [salvo,setSalvo] = useState(false);
  const validarFicha = (): string[] => {
    const faltas: string[] = [];
    const exigir = (fields: ParamField[]) => fields.forEach(f=>{
      if (!f.optional && !ventParams[f.key]?.trim()) faltas.push(f.label);
    });
    if (isVM(suporte)) {
      if (!vmModo) faltas.push('Modo (Assistido/Controlado ou Espontâneo)');
      if (vmModo==='Assistido/Controlado' && !vmModalidade) faltas.push('Modalidade (PC / VC / PRVC)');
      if (modalidadeAtiva) exigir(VM_PARAMS[modalidadeAtiva] ?? []);
      exigir(VM_COMUNS);
      exigir(VIA_AEREA);
    } else {
      exigir(SUPORTE_PARAMS[suporte] ?? []);
      if (suporte==='VNI' && ventParams['modalidade']==='Bilevel' && !ventParams['ipap']?.trim()) faltas.push('IPAP (obrigatório no Bilevel)');
    }
    if (progExtub && !progExtubData) faltas.push('Data programada da extubação');
    if (restricaoDecub && (!decubLado || !decubJust.trim())) faltas.push('Restrição de decúbito: lado e justificativa');
    return faltas;
  };
  const salvarFicha = async () => {
    const faltas = validarFicha();
    setErros(faltas);
    if (faltas.length) { setSalvo(false); return; }
    patient.suporte = suporte;
    patient.vm = isVM(suporte);
    // suporte ventilatório vai para a tabela separada fisio_suporte_ventilatorio
    const detalhe = {
      suporte, situacao: suporteStatus, modo: vmModo, modalidade: vmModalidade,
      progExtubacao: progExtub, progExtubacaoData: progExtubData, parametros: ventParams,
    };
    patient.suporteDetalhe = detalhe;
    void persistPatient(patient);
    if (patient.rowId) {
      const ok = await saveSuporteVentilatorio(patient.rowId, detalhe);
      setSuporteSalvo(ok);
    }
    setSalvo(true);
    setTimeout(()=>{ setSalvo(false); setSuporteSalvo(false); }, 4000);
  };

  /* ── Resumo das últimas 24h ── */
  const parseBr = (str:string) => { const [d,m,a]=str.split('/').map(Number); return new Date(a,m-1,d).getTime(); };
  const marco24h = Date.now() - 86400000;
  const dispositivoAtivo = patient.dispositivos.find(d=>!d.retirada);
  const mudancas24h = patient.dispositivos.filter(d => parseBr(d.inicio) >= marco24h || (d.retirada && parseBr(d.retirada) >= marco24h));
  const ultimaGas = patient.gas[patient.gas.length-1];

  const ALERTAS = ['Instabilidade ventilatória','Instabilidade hemodinâmica','Dreno de tórax','Neuroproteção','Risco de extubação acidental','Agitação / sedação inadequada','Restrição de decúbito','Broncoespasmo reativo','Hipertensão pulmonar','Pós-operatório imediato','Convulsões recentes'];
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
      <div className="flex items-center justify-between gap-2">
        <button onClick={onBack} className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-clinical-600 dark:hover:text-clinical-400 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-clinical-300 dark:hover:border-clinical-500/40 px-3 py-2 rounded-xl shadow-sm transition-colors">
          <i className="fa-solid fa-arrow-left"></i> Voltar à lista
        </button>
        <button
          onClick={()=>{ if (window.confirm(`Confirmar alta de ${patient.nome}? O paciente será removido do painel.`)) onDischarge(); }}
          className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-950 border border-rose-200 dark:border-rose-700/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-3 py-2 rounded-xl shadow-sm transition-colors">
          <i className="fa-solid fa-person-walking-arrow-right"></i> Dar Alta / Arquivar
        </button>
      </div>

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
          <button onClick={()=>setEditHeader(e=>!e)} title={editHeader?'Cancelar edição':'Editar cabeçalho'}
            className={`transition-colors p-1 ${editHeader?'text-clinical-500':'text-slate-400 hover:text-clinical-500'}`}>
            <i className={`fa-solid ${editHeader?'fa-xmark':'fa-pen'} text-sm`}></i>
          </button>
        </div>

        {editHeader ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {[
                {k:'nome',label:'Nome Completo',span2:true},
                {k:'mae',label:'Mãe',span2:true},
                {k:'pesoKg',label:'Peso (kg)'},
                {k:'altCm',label:'Altura (cm)'},
                {k:'satAlvoMin',label:'Sat. Alvo Mín (%)'},
                {k:'satAlvoMax',label:'Sat. Alvo Máx (%)'},
                {k:'volCorrenteAlvo',label:'Vol. Corrente Alvo (mL)'},
                {k:'fisioResponsavel',label:'Fisioterapeuta Responsável'},
              ].map(f=>(
                <div key={f.k} className={f.span2?'col-span-2':''}>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">{f.label}</label>
                  <input type="text" value={(hdr as any)[f.k]} onChange={e=>setH(f.k,e.target.value)} className={inputCls}/>
                </div>
              ))}
            </div>
            <button onClick={salvarHeader} className="w-full bg-clinical-500 hover:bg-clinical-600 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2">
              <i className="fa-solid fa-check"></i> Salvar Cabeçalho
            </button>
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-2">
          <FieldBox label="Idade" value={calcIdade(patient.nasc)}/>
          <FieldBox label="Sexo"  value={`${patient.sexo==='Masculino'?'♂':'♀'} ${patient.sexo}`}/>
          <FieldBox label="Mãe"   value={patient.mae} span2/>
          <FieldBox label="Peso"  value={`${patient.pesoKg} kg`}/>
          <FieldBox label="Altura" value={`${patient.altCm} cm`}/>
          <FieldBox label="Saturação Alvo" value={`${patient.satAlvoMin}–${patient.satAlvoMax}%`}/>
          <FieldBox label="Volume Corrente Alvo" value={`${patient.volCorrenteAlvo} mL`}/>
          <FieldBox label="Fisioterapeuta Responsável" value={patient.fisioResponsavel} span2/>
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
        )}

        <div className="flex flex-wrap gap-2 mt-3">
          <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>{patient.status}
          </span>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full font-medium">
            <i className="fa-solid fa-lungs mr-1 text-clinical-500 dark:text-clinical-400"></i>{patient.suporte}
          </span>
          {precaucoesDe(patient).map(t=>(
            <span key={t} className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/40 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full"><i className="fa-solid fa-shield-virus mr-1"></i>{PRECAUCAO_LABEL[t] ?? t}</span>
          ))}
          {patient.vm      && <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700/40 text-rose-700 dark:text-rose-400 px-2.5 py-1 rounded-full"><i className="fa-solid fa-wind mr-1"></i>VM Invasiva</span>}
        </div>
      </div>

      {/* Alerta de doença respiratória — abaixo dos dados do paciente */}
      {alertaResp && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-700/40 rounded-2xl p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/30 animate-pulse">
            <i className="fa-solid fa-lungs text-lg"></i>
          </span>
          <div>
            <p className="text-xs font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Alerta: Doença Respiratória</p>
            <p className="text-[11px] text-rose-500/90 dark:text-rose-400/80 mt-0.5">Paciente com diagnóstico respiratório ativo — priorizar avaliação da fisioterapia respiratória.</p>
          </div>
        </div>
      )}

      {/* Sinais Vitais — editáveis por turno M/T/N */}
      <div className={`${card} p-5`}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-clinical-600 dark:text-clinical-400 flex items-center gap-2">
            <i className="fa-solid fa-heart-pulse"></i> Sinais Vitais
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={svData} onChange={e=>setSvData(e.target.value)}
              title="Data dos sinais vitais"
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg px-2 py-1.5 text-slate-700 dark:text-white focus:outline-none focus:border-clinical-500 transition-colors"/>
            <div className="flex gap-1">
              {(['M','T','N'] as TurnoKey[]).map(t=>(
                <button key={t} onClick={()=>{setTurnoVital(t);setSvStatus(null);}}
                  className={`w-9 h-8 rounded-lg text-xs font-bold transition ${turnoVital===t
                    ?'bg-clinical-500 text-white shadow-md shadow-clinical-500/30'
                    :'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-clinical-400'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            {k:'spO2',label:'SpO₂ (%)', alerta:(v:number)=>v>0&&v<94},
            {k:'fc',  label:'FC',        alerta:(v:number)=>v>170},
            {k:'fr',  label:'FR',        alerta:(v:number)=>v>50},
            {k:'pas', label:'PAS',       alerta:(v:number)=>v>0&&v<80},
            {k:'pad', label:'PAD',       alerta:()=>false},
            {k:'temp',label:'Temp (°C)', alerta:(v:number)=>v>=38},
          ].map(f=>{
            const val = (vitais[turnoVital] as any)[f.k] as string;
            const emAlerta = val!=='' && f.alerta(parseFloat(val));
            const isFR = f.k==='fr';
            const frBloqueado = isFR && !frLiberado[turnoVital];
            return (
              <div key={f.k} className={`flex flex-col p-2.5 rounded-xl border ${emAlerta
                ?'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-700/40'
                :'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 text-center">{f.label}</span>
                <input
                  type="number" step="any" value={val}
                  onChange={e=>setVital(f.k,e.target.value)}
                  onFocus={isFR&&frBloqueado?iniciarFR:undefined}
                  readOnly={frBloqueado}
                  placeholder={frBloqueado?'60s':'—'}
                  title={frBloqueado?'Clique para iniciar o cronômetro de 60s e contar a FR':undefined}
                  className={`w-full text-center text-base font-extrabold font-mono bg-transparent focus:outline-none ${emAlerta?'text-rose-600 dark:text-rose-400':'text-slate-800 dark:text-white'} ${frBloqueado?'cursor-pointer':''}`}
                />
                {isFR && frSeg!==null && (
                  <span className={`text-[9px] font-bold text-center mt-0.5 ${frSeg>0?'text-clinical-600 dark:text-clinical-400 animate-pulse':'text-emerald-600 dark:text-emerald-400'}`}>
                    {frSeg>0?`⏱ ${frSeg}s`:'✓ 60s concluídos'}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Alerta manual de instabilidade */}
        <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
          <SectionLabel icon="fa-triangle-exclamation" text={`Sinalizar Instabilidade — Turno ${turnoVital}`} color="text-rose-500 dark:text-rose-400"/>
          <div className="flex flex-wrap gap-1.5">
            {INSTABILIDADES.map(a=>{
              const on = instab[turnoVital].includes(a);
              return (
                <button key={a} onClick={()=>toggleInstab(a)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition ${on
                    ?'bg-rose-500 text-white border-rose-500 shadow-sm'
                    :'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-rose-300'}`}>
                  {a}
                </button>
              );
            })}
          </div>
          {instab[turnoVital].length>0 && (
            <div className="mt-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-700/40 rounded-xl p-2.5 flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-rose-500 text-sm"></i>
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                Instabilidade sinalizada ({turnoVital}): {instab[turnoVital].join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Salvar os sinais vitais da data/turno no banco */}
        <div className="mt-3 flex items-center justify-end gap-3 flex-wrap">
          {svStatus==='demo' && (
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              <i className="fa-solid fa-triangle-exclamation mr-1"></i>Modo demonstração — registro não vai para o banco
            </span>
          )}
          {svStatus==='erro' && (
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              <i className="fa-solid fa-circle-exclamation mr-1"></i>Sem conexão com o banco — tente novamente
            </span>
          )}
          {svStatus?.startsWith('salvo:') && (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <i className="fa-solid fa-circle-check mr-1"></i>Salvo às {svStatus.slice(6)}
            </span>
          )}
          <button onClick={salvarSinais}
            className="bg-clinical-500 hover:bg-clinical-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-2">
            <i className="fa-solid fa-floppy-disk"></i> Salvar Sinais Vitais — Turno {turnoVital}
          </button>
        </div>
      </div>

      {/* Diagnóstico principal — vem dos diagnósticos ativos do Round */}
      <div className={`${card} p-4`}>
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">Diagnóstico Principal</span>
        {patient.diagnosticos?.length ? (
          <ul className="space-y-1">
            {patient.diagnosticos.map(d=>(
              <li key={d} className="text-sm font-semibold text-slate-800 dark:text-white flex items-start gap-2">
                <i className="fa-solid fa-circle text-[5px] text-clinical-500 mt-2 shrink-0"></i>{d}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm font-semibold text-slate-800 dark:text-white">{patient.diagnostico}</p>
        )}
        {patient.diagSecundarios && patient.diagSecundarios.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">Secundários</span>
            <p className="text-xs text-slate-500 dark:text-slate-400">{patient.diagSecundarios.join(' · ')}</p>
          </div>
        )}
      </div>

      {/* Resumo das últimas 24h de intervenção ventilatória */}
      <div className={`${card} p-4`}>
        <SectionLabel icon="fa-clock-rotate-left" text="Últimas 24h — Intervenção Ventilatória" color="text-clinical-600 dark:text-clinical-400"/>
        <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
          {dispositivoAtivo && (
            <li className="flex items-start gap-2">
              <i className="fa-solid fa-lungs text-clinical-500 mt-0.5"></i>
              <span>Suporte atual: <strong>{dispositivoAtivo.device}</strong> — em uso há <strong>{calcDuracao(dispositivoAtivo.inicio)}</strong> (desde {dispositivoAtivo.inicio})</span>
            </li>
          )}
          {mudancas24h.length>0 ? mudancas24h.map(d=>(
            <li key={d.id} className="flex items-start gap-2">
              <i className="fa-solid fa-arrows-rotate text-amber-500 mt-0.5"></i>
              <span>{d.retirada
                ? <>Retirado <strong>{d.device}</strong> em {d.retirada}</>
                : <>Iniciado <strong>{d.device}</strong> em {d.inicio}</>}
              </span>
            </li>
          )) : (
            <li className="flex items-start gap-2">
              <i className="fa-solid fa-circle-check text-emerald-500 mt-0.5"></i>
              <span>Sem mudança de suporte nas últimas 24 horas.</span>
            </li>
          )}
          {ultimaGas && (
            <li className="flex items-start gap-2">
              <i className="fa-solid fa-flask text-violet-500 mt-0.5"></i>
              <span>Última gasometria ({ultimaGas.data} {ultimaGas.hora}): P/F <strong>{ultimaGas.pf}</strong>{ultimaGas.io!=null && <> · IO <strong>{ultimaGas.io}</strong></>} · FiO₂ <strong>{Math.round(ultimaGas.fio2*100)}%</strong></span>
            </li>
          )}
        </ul>
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
              {/* SUPORTE VENTILATÓRIO ATUAL */}
              <div className="bg-clinical-50/60 dark:bg-clinical-950/20 border border-clinical-200 dark:border-clinical-500/30 rounded-2xl p-4">
                <SectionLabel icon="fa-lungs" text="Suporte Ventilatório Atual" color="text-clinical-600 dark:text-clinical-400"/>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">Suporte</label>
                    <select value={suporte} onChange={e=>trocarSuporte(e.target.value)} className={selectCls}>
                      {DEVICE_OPTIONS.map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">Situação do Suporte</label>
                    <select value={suporteStatus} onChange={e=>setSuporteStatus(e.target.value)} className={selectCls}>
                      {SUPORTE_STATUS_OPTS.map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                {/* Programação de extubação (VM invasiva) */}
                {isVM(suporte) && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={progExtub} onChange={e=>setProgExtub(e.target.checked)} className="accent-clinical-500 rounded"/>
                      <span className="font-semibold">Programado para extubação?</span>
                    </label>
                    {progExtub && (
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">Data prevista</label>
                        <input type="date" value={progExtubData} onChange={e=>setProgExtubData(e.target.value)} className={inputCls}/>
                      </div>
                    )}
                  </div>
                )}

                {/* Modo + Modalidade (VM invasiva) */}
                {isVM(suporte) && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">Modo *</label>
                      <select value={vmModo} onChange={e=>{setVmModo(e.target.value);setVmModalidade('');}} className={selectCls}>
                        <option value="">Selecione...</option>
                        {VM_MODO_OPTS.map(o=><option key={o}>{o}</option>)}
                      </select>
                    </div>
                    {vmModo==='Assistido/Controlado' && (
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">Modalidade *</label>
                        <select value={vmModalidade} onChange={e=>setVmModalidade(e.target.value)} className={selectCls}>
                          <option value="">Selecione...</option>
                          {VM_MODALIDADE_OPTS.map(o=><option key={o}>{o}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Via aérea artificial (TOT/TQT em VM) */}
                {isVM(suporte) && (
                  <div className="mt-3">
                    <SectionLabel icon="fa-circle-nodes" text="Via Aérea Artificial"/>
                    <div className="grid grid-cols-3 gap-2">
                      {VIA_AEREA.map(f=>(
                        <div key={f.key}>
                          <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">{f.label}{!f.optional&&' *'}</label>
                          <input type="text" value={ventParams[f.key]||''} onChange={e=>setParam(f.key,e.target.value)} className={inputCls}/>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Parâmetros do suporte escolhido */}
                {(isVM(suporte) ? modalidadeAtiva!=='' : (SUPORTE_PARAMS[suporte]??[]).length>0) && (
                  <div className="mt-3">
                    <SectionLabel icon="fa-sliders" text={isVM(suporte)?`Parâmetros — ${modalidadeAtiva}`:'Parâmetros (obrigatórios)'}/>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(isVM(suporte) ? (VM_PARAMS[modalidadeAtiva]??[]) : (SUPORTE_PARAMS[suporte]??[])).map(f=>(
                        <div key={f.key}>
                          <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">{f.label}{!f.optional&&' *'}</label>
                          {f.type==='select'
                            ? <select value={ventParams[f.key]||''} onChange={e=>setParam(f.key,e.target.value)} className={selectCls}>
                                <option value="">—</option>
                                {(f.opts||[]).map(o=><option key={o}>{o}</option>)}
                              </select>
                            : <input type="text" value={ventParams[f.key]||''} onChange={e=>setParam(f.key,e.target.value)} className={inputCls}/>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Monitorização comum de VM (MAP, drive, volumes) */}
                {isVM(suporte) && modalidadeAtiva!=='' && (
                  <div className="mt-3">
                    <SectionLabel icon="fa-wave-square" text="Monitorização (todos os modos)"/>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {VM_COMUNS.map(f=>(
                        <div key={f.key}>
                          <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">{f.label}{!f.optional&&' *'}</label>
                          <input type="text" value={ventParams[f.key]||''} onChange={e=>setParam(f.key,e.target.value)} className={inputCls}/>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
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
                      <input type="checkbox" checked={alertasSel.includes(a)} onChange={()=>toggleAlerta(a)} className="accent-amber-500 rounded"/>
                      <span className="group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{a}</span>
                    </label>
                  ))}
                </div>

                {/* Restrição de decúbito — lado + justificativa */}
                {restricaoDecub && (
                  <div className="mt-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-700/40 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 block mb-1">Lado *</label>
                      <select value={decubLado} onChange={e=>setDecubLado(e.target.value)} className={selectCls}>
                        <option value="">Selecione...</option>
                        <option>Direito</option>
                        <option>Esquerdo</option>
                        <option>Ambos</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 block mb-1">Justificativa *</label>
                      <input type="text" value={decubJust} onChange={e=>setDecubJust(e.target.value)} placeholder="Ex.: dreno de tórax à direita" className={inputCls}/>
                    </div>
                  </div>
                )}
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

              {erros.length>0 && (
                <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-700/40 rounded-xl p-3">
                  <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mb-1">
                    <i className="fa-solid fa-circle-exclamation mr-1"></i> Preencha os campos obrigatórios:
                  </p>
                  <ul className="text-[11px] text-rose-500 dark:text-rose-400 list-disc list-inside space-y-0.5">
                    {erros.map(e=><li key={e}>{e}</li>)}
                  </ul>
                </div>
              )}
              {salvo && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-700/40 rounded-xl p-3 flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-500"></i>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    Ficha salva com sucesso.{suporteSalvo && ' Suporte ventilatório gravado na tabela fisio_suporte_ventilatorio.'}
                  </span>
                </div>
              )}
              <button onClick={salvarFicha} className="w-full bg-clinical-500 hover:bg-clinical-600 text-white font-bold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2">
                <i className="fa-solid fa-floppy-disk"></i> Salvar Ficha
              </button>
            </div>
          )}

          {tab==='dispositivos' && <DispositivosPanel patient={patient} onSuporteSugerido={trocarSuporte}/>}
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

/* ─── ADMISSÃO MANUAL — mesmos campos do cadastro do n8n ──
   (nó "Criar Novos": name, bed_number, dob, dt_internacao)  */
function AdmitModal({onClose,onAdmit}:{onClose:()=>void;onAdmit:()=>void}) {
  const hojeInput = new Date().toISOString().slice(0,10);
  const [f,setF] = useState({ nome:'', nasc:'', leito:String(nextFreeBed()), internacao: hojeInput });
  const [erro,setErro] = useState('');
  const set = (k:string,v:string)=>setF(x=>({...x,[k]:v}));
  const confirmar = () => {
    const leito = parseInt(f.leito);
    if (!f.nome.trim() || !f.nasc || !leito) { setErro('Preencha nome, nascimento e leito.'); return; }
    if (PATIENTS.some(p=>p.id===leito)) { setErro(`O leito ${leito} já está ocupado.`); return; }
    const base = fichaInicial(
      f.nome.trim().toUpperCase(), leito,
      fromInputDate(f.nasc), fromInputDate(f.internacao || hojeInput),
    );
    admitPatient({ ...base, evolucao: 'Paciente admitido manualmente.' });
    onAdmit();
  };
  const campos: {k:string;label:string;type?:string;span2?:boolean}[] = [
    {k:'nome',label:'Nome Completo *',span2:true},
    {k:'nasc',label:'Nascimento *',type:'date'},
    {k:'internacao',label:'Data de Internação',type:'date'},
    {k:'leito',label:'Leito *',type:'number'},
  ];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-lg p-5 my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-extrabold text-clinical-800 dark:text-white flex items-center gap-2">
            <span className="w-8 h-8 bg-clinical-500 text-white rounded-xl flex items-center justify-center"><i className="fa-solid fa-bed-pulse text-sm"></i></span>
            Admitir Paciente
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition p-1"><i className="fa-solid fa-xmark"></i></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {campos.map(c=>(
            <div key={c.k} className={c.span2?'col-span-2':''}>
              <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">{c.label}</label>
              <input type={c.type||'text'} value={(f as any)[c.k]}
                onChange={e=>set(c.k, c.k==='nome' ? e.target.value.toUpperCase() : e.target.value)}
                className={inputCls}/>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
          <i className="fa-solid fa-circle-info mr-1"></i>
          Os demais dados (sexo, mãe, peso, alvos, suporte ventilatório...) são preenchidos depois, na ficha do paciente.
        </p>
        {erro && (
          <p className="mt-3 text-[11px] font-bold text-rose-600 dark:text-rose-400">
            <i className="fa-solid fa-circle-exclamation mr-1"></i>{erro}
          </p>
        )}
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-2.5 rounded-xl text-xs transition">Cancelar</button>
          <button onClick={confirmar} className="flex-1 bg-clinical-500 hover:bg-clinical-600 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2">
            <i className="fa-solid fa-check"></i> Admitir
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── LISTA DE LEITOS ─────────────────────────────────── */
export default function Bedside({dbStatus}:{dbStatus?:string}) {
  const [search,setSearch]     = useState('');
  const [selected,setSelected] = useState<Patient|null>(null);
  const [showAdmit,setShowAdmit] = useState(false);
  const [,refresh] = useState(0);
  // enquanto os pacientes reais não chegam do Supabase, não mostra os de demonstração
  if (dbStatus === 'carregando') return (
    <section className="p-6 flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 gap-3">
      <i className="fa-solid fa-circle-notch fa-spin text-3xl text-clinical-500"></i>
      <p className="text-sm font-semibold">Carregando pacientes do banco...</p>
    </section>
  );
  const filtered = PATIENTS.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) || String(p.id).includes(search)
  );
  if (selected) return (
    <PatientDetail
      patient={selected}
      onBack={()=>setSelected(null)}
      onDischarge={()=>{ dischargePatient(selected.id); setSelected(null); }}
    />
  );

  return (
    <section className="p-6 space-y-4">
      {showAdmit && <AdmitModal onClose={()=>setShowAdmit(false)} onAdmit={()=>{setShowAdmit(false); refresh(n=>n+1);}}/>}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar por nome ou número do leito..."
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-clinical-500 transition shadow-sm"/>
        </div>
        <button onClick={()=>setShowAdmit(true)}
          className="shrink-0 flex items-center gap-2 text-xs font-bold bg-clinical-500 hover:bg-clinical-600 text-white px-4 rounded-2xl shadow-sm transition">
          <i className="fa-solid fa-plus"></i> <span className="hidden sm:inline">Admitir Paciente</span>
        </button>
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
                  <span className="hidden md:inline text-slate-400 dark:text-slate-500"> · Alvo SpO₂ {p.satAlvoMin}–{p.satAlvoMax}% · VC {p.volCorrenteAlvo}mL</span>
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  {precaucoesDe(p).map(t=>(
                    <span key={t} className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/40 px-2 py-0.5 rounded-full"><i className="fa-solid fa-shield-virus mr-1"></i>{PRECAUCAO_LABEL[t] ?? t}</span>
                  ))}
                  {(p.alertaResp ?? isRespiratorio(p.diagnostico)) && <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-700/40 px-2 py-0.5 rounded-full"><i className="fa-solid fa-lungs mr-1"></i>Alerta Resp.</span>}
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
