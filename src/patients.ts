export type Status = 'Estável' | 'Instável' | 'Crítico' | 'Alta Prevista';
export type Sexo   = 'Masculino' | 'Feminino';

export interface GasEntry {
  data: string; hora: string; ph: number; paco2: number; pao2: number;
  hco3: number; be: number; fio2: number; pf: number; io: number | null;
}
export interface DeviceEntry {
  id: number; device: string; inicio: string; retirada?: string;
}
export interface Patient {
  id: number; prontuario: string; nome: string; nasc: string; sexo: Sexo; mae: string;
  status: Status; contato: boolean; diagnostico: string; suporte: string; vm: boolean;
  data_internacao: string; pesoKg: number; altCm: number;
  spO2: number; fc: number; fr: number; pas: number; pad: number; temp: number;
  fio2: number; pao2: number; evolucao: string;
  gas: GasEntry[];
  dispositivos: DeviceEntry[];
}

export const mkGas = (entries: Omit<GasEntry,'pf'|'io'>[]): GasEntry[] =>
  entries.map(e => ({
    ...e,
    pf: +(e.pao2 / e.fio2).toFixed(0),
    io: e.fio2 > 0.3 ? +(e.fio2 * 100 * 7.5 / e.pao2).toFixed(1) : null,
  }));

export function calcIdade(nasc: string) {
  const [d,m,a] = nasc.split('/').map(Number);
  const hoje = new Date();
  let anos = hoje.getFullYear() - a;
  const ok = hoje.getMonth()+1 > m || (hoje.getMonth()+1 === m && hoje.getDate() >= d);
  if (!ok) anos--;
  if (anos < 1) {
    const diff = new Date(hoje.getTime() - new Date(a,m-1,d).getTime());
    const meses = diff.getUTCMonth() + (diff.getUTCFullYear()-1970)*12;
    return meses < 1 ? `${diff.getUTCDate()} dias` : `${meses}m`;
  }
  return `${anos}a`;
}
export function calcDias(data: string) {
  const [d,m,a] = data.split('/').map(Number);
  return Math.floor((Date.now() - new Date(a,m-1,d).getTime()) / 86400000);
}
export function calcDuracao(inicio: string, retirada?: string): string {
  const parse = (s: string) => { const [d,m,a] = s.split('/').map(Number); return new Date(a,m-1,d).getTime(); };
  const dias = Math.floor(((retirada ? parse(retirada) : Date.now()) - parse(inicio)) / 86400000);
  if (dias <= 0) return 'Hoje';
  return `${dias} dia${dias !== 1 ? 's' : ''}`;
}
export function fromInputDate(yyyy_mm_dd: string) {
  const [a,m,d] = yyyy_mm_dd.split('-');
  return `${d}/${m}/${a}`;
}

export const TOTAL_BEDS = 12;

export const PATIENTS: Patient[] = [
  { id:1, prontuario:'815319', nome:'YKARO MATHEUS SOARES TADEU', nasc:'16/12/2025', sexo:'Masculino', mae:'PAOLA LIZANDRA SOARES',
    status:'Estável', contato:true, diagnostico:'Bronquiolite Viral Aguda', suporte:'CNAF', vm:false,
    data_internacao:'10/06/2026', pesoKg:5.58, altCm:64, spO2:97, fc:128, fr:38, pas:92, pad:54, temp:36.8, fio2:0.35, pao2:88,
    evolucao:'Desmame gradual de CNAF. Padrão respiratório melhorado.',
    gas: mkGas([{data:'10/06',hora:'08h',ph:7.32,paco2:48,pao2:62,hco3:20,be:-4,fio2:0.50},{data:'11/06',hora:'08h',ph:7.34,paco2:45,pao2:72,hco3:22,be:-2,fio2:0.45},{data:'12/06',hora:'08h',ph:7.36,paco2:42,pao2:80,hco3:23,be:-1,fio2:0.40},{data:'13/06',hora:'08h',ph:7.37,paco2:41,pao2:88,hco3:24,be:0,fio2:0.35}]),
    dispositivos:[{id:1,device:'Cateter Nasal',inicio:'10/06/2026',retirada:'11/06/2026'},{id:2,device:'CNAF',inicio:'11/06/2026'}] },
  { id:2, prontuario:'821047', nome:'MARIA HELOISA ALMEIDA NASCIMENTO', nasc:'20/04/2026', sexo:'Feminino', mae:'FERNANDA ALMEIDA NASCIMENTO',
    status:'Estável', contato:true, diagnostico:'Pneumonia Bacteriana', suporte:'Cateter Nasal', vm:false,
    data_internacao:'21/06/2026', pesoKg:6.10, altCm:64, spO2:96, fc:144, fr:42, pas:88, pad:52, temp:37.4, fio2:0.30, pao2:82,
    evolucao:'Boa resposta ao antibiótico. Saturação estável.',
    gas: mkGas([{data:'21/06',hora:'10h',ph:7.33,paco2:44,pao2:70,hco3:21,be:-3,fio2:0.40},{data:'22/06',hora:'10h',ph:7.35,paco2:42,pao2:78,hco3:22,be:-1,fio2:0.35},{data:'23/06',hora:'10h',ph:7.37,paco2:40,pao2:82,hco3:23,be:0,fio2:0.30}]),
    dispositivos:[{id:1,device:'Cateter Nasal',inicio:'21/06/2026'}] },
  { id:3, prontuario:'809332', nome:'PEDRO LUCAS GUIMARAES', nasc:'18/05/2025', sexo:'Masculino', mae:'CARLA GUIMARAES SILVA',
    status:'Estável', contato:true, diagnostico:'Sepse Pulmonar', suporte:'VNI', vm:false,
    data_internacao:'16/06/2026', pesoKg:7.50, altCm:68, spO2:95, fc:156, fr:46, pas:82, pad:48, temp:38.1, fio2:0.50, pao2:74,
    evolucao:'VNI intermitente. Gasometria com melhora.',
    gas: mkGas([{data:'16/06',hora:'08h',ph:7.28,paco2:54,pao2:55,hco3:19,be:-6,fio2:0.70},{data:'18/06',hora:'08h',ph:7.31,paco2:50,pao2:62,hco3:20,be:-4,fio2:0.60},{data:'20/06',hora:'08h',ph:7.34,paco2:46,pao2:68,hco3:22,be:-2,fio2:0.55},{data:'22/06',hora:'08h',ph:7.36,paco2:43,pao2:74,hco3:23,be:-1,fio2:0.50}]),
    dispositivos:[{id:1,device:'Máscara Venturi',inicio:'16/06/2026',retirada:'18/06/2026'},{id:2,device:'VNI',inicio:'18/06/2026'}] },
  { id:4, prontuario:'834561', nome:'DHERICK CALEBE MACIEL CARDOSO', nasc:'30/10/2025', sexo:'Masculino', mae:'SIMONE MACIEL CARDOSO',
    status:'Estável', contato:false, diagnostico:'Displasia Broncopulmonar', suporte:'Ar Ambiente', vm:false,
    data_internacao:'12/06/2026', pesoKg:5.80, altCm:61, spO2:94, fc:138, fr:40, pas:90, pad:56, temp:36.6, fio2:0.21, pao2:68,
    evolucao:'Desmame completo. Aguardando critérios de alta.',
    gas: mkGas([{data:'12/06',hora:'09h',ph:7.35,paco2:42,pao2:62,hco3:22,be:-2,fio2:0.35},{data:'16/06',hora:'09h',ph:7.37,paco2:40,pao2:68,hco3:23,be:0,fio2:0.28}]),
    dispositivos:[{id:1,device:'CNAF',inicio:'12/06/2026',retirada:'15/06/2026'},{id:2,device:'Cateter Nasal',inicio:'15/06/2026',retirada:'20/06/2026'},{id:3,device:'Ar Ambiente',inicio:'20/06/2026'}] },
  { id:5, prontuario:'798214', nome:'GREGÓRIO FERREIRA DE SOUZA DIAS', nasc:'29/08/2025', sexo:'Masculino', mae:'ADRIANA FERREIRA DE SOUZA',
    status:'Instável', contato:true, diagnostico:'Bronquiolite Grave', suporte:'TOT em VM', vm:true,
    data_internacao:'22/06/2026', pesoKg:9.00, altCm:74, spO2:91, fc:172, fr:0, pas:76, pad:44, temp:38.9, fio2:0.80, pao2:52,
    evolucao:'Intubado ontem por falência respiratória. Parâmetros elevados.',
    gas: mkGas([{data:'22/06',hora:'14h',ph:7.22,paco2:62,pao2:42,hco3:17,be:-9,fio2:1.00},{data:'22/06',hora:'20h',ph:7.26,paco2:56,pao2:48,hco3:19,be:-7,fio2:0.90},{data:'23/06',hora:'08h',ph:7.29,paco2:52,pao2:52,hco3:20,be:-5,fio2:0.85}]),
    dispositivos:[{id:1,device:'CNAF',inicio:'22/06/2026',retirada:'22/06/2026'},{id:2,device:'TOT em VM',inicio:'22/06/2026'}] },
  { id:6, prontuario:'845903', nome:'JOSÉ LEVY ARAÚJO DOS SANTOS', nasc:'06/05/2026', sexo:'Masculino', mae:'TALITA ARAÚJO DOS SANTOS',
    status:'Estável', contato:true, diagnostico:'Coqueluche', suporte:'Cateter Nasal', vm:false,
    data_internacao:'18/06/2026', pesoKg:5.50, altCm:60, spO2:96, fc:148, fr:44, pas:86, pad:50, temp:36.9, fio2:0.28, pao2:80,
    evolucao:'Paroxismos de tosse diminuindo. Oxigenioterapia em desmame.',
    gas: mkGas([]), dispositivos:[{id:1,device:'Cateter Nasal',inicio:'18/06/2026'}] },
  { id:7, prontuario:'762108', nome:'LARISSA MANUELLA DA SILVA', nasc:'19/11/2016', sexo:'Feminino', mae:'ROSANA MANUELLA DA SILVA',
    status:'Alta Prevista', contato:false, diagnostico:'Asma Grave', suporte:'Ar Ambiente', vm:false,
    data_internacao:'20/06/2026', pesoKg:28.00, altCm:130, spO2:98, fc:102, fr:24, pas:104, pad:62, temp:36.4, fio2:0.21, pao2:98,
    evolucao:'Critérios de alta atingidos. Alta prevista para amanhã.',
    gas: mkGas([]), dispositivos:[{id:1,device:'Máscara Venturi',inicio:'20/06/2026',retirada:'22/06/2026'},{id:2,device:'Ar Ambiente',inicio:'22/06/2026'}] },
  { id:8, prontuario:'851729', nome:'LUNNA DANDARA MACHADO CARDOSO', nasc:'15/02/2026', sexo:'Feminino', mae:'VANESSA MACHADO CARDOSO',
    status:'Estável', contato:true, diagnostico:'Laringotraqueíte Grave', suporte:'Másc. Venturi', vm:false,
    data_internacao:'24/06/2026', pesoKg:4.80, altCm:56, spO2:95, fc:160, fr:48, pas:84, pad:46, temp:37.7, fio2:0.40, pao2:72,
    evolucao:'Admitida hoje. Estridor melhorado após adrenalina nebulizada.',
    gas: mkGas([]), dispositivos:[{id:1,device:'Máscara Venturi',inicio:'24/06/2026'}] },
  { id:9, prontuario:'774456', nome:'SAMUEL RODRIGUES ALVES PINTO', nasc:'03/07/2025', sexo:'Masculino', mae:'CRISTIANE RODRIGUES ALVES',
    status:'Crítico', contato:true, diagnostico:'SARA Grave', suporte:'TQT em VM', vm:true,
    data_internacao:'09/06/2026', pesoKg:10.40, altCm:76, spO2:88, fc:180, fr:0, pas:68, pad:38, temp:39.2, fio2:1.00, pao2:48,
    evolucao:'Pronado desde ontem. IO=24. Sedação profunda.',
    gas: mkGas([{data:'09/06',hora:'08h',ph:7.18,paco2:68,pao2:38,hco3:15,be:-12,fio2:1.00},{data:'11/06',hora:'08h',ph:7.22,paco2:62,pao2:42,hco3:17,be:-9,fio2:1.00},{data:'13/06',hora:'08h',ph:7.26,paco2:58,pao2:46,hco3:19,be:-1,fio2:1.00},{data:'15/06',hora:'08h',ph:7.29,paco2:54,pao2:50,hco3:21,be:-5,fio2:0.95},{data:'17/06',hora:'08h',ph:7.31,paco2:50,pao2:52,hco3:22,be:-3,fio2:0.90}]),
    dispositivos:[{id:1,device:'TOT em VM',inicio:'09/06/2026',retirada:'14/06/2026'},{id:2,device:'TQT em VM',inicio:'14/06/2026'}] },
  { id:10, prontuario:'863041', nome:'AURORA BEATRIZ LIMA FERREIRA', nasc:'11/09/2024', sexo:'Feminino', mae:'PATRICIA LIMA FERREIRA',
    status:'Instável', contato:false, diagnostico:'Insuf. Respiratória Aguda', suporte:'VNI', vm:false,
    data_internacao:'21/06/2026', pesoKg:12.60, altCm:82, spO2:93, fc:164, fr:52, pas:78, pad:42, temp:38.3, fio2:0.60, pao2:62,
    evolucao:'VNI contínua. PF=148. Avaliar intubação se piora.',
    gas: mkGas([]), dispositivos:[{id:1,device:'VNI',inicio:'21/06/2026'}] },
];
PATIENTS.sort((a,b) => a.id - b.id);
