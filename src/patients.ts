import { supabase } from './supabaseClient';

export type Status = 'Estável' | 'Instável' | 'Crítico' | 'Alta Prevista';
export type Sexo   = 'Masculino' | 'Feminino';

export interface GasEntry {
  data: string; hora: string; ph: number; paco2: number; pao2: number;
  hco3: number; be: number; fio2: number; map?: number | null; pf: number; io: number | null;
}
export interface DeviceEntry {
  id: number; device: string; inicio: string; retirada?: string;
}
export interface Patient {
  id: number; prontuario: string; nome: string; nasc: string; sexo: Sexo; mae: string;
  rowId?: string; // uuid da linha em patients (ausente no modo offline)
  precaucoes?: string[]; // tipos ativos da tabela precautions (ex.: 'contato', 'goticula')
  diagnosticos?: string[]; // diagnósticos PRINCIPAIS ativos do Round
  diagSecundarios?: string[]; // diagnósticos secundários ativos do Round
  alertaResp?: boolean; // possui diagnóstico respiratório ativo
  suporteDetalhe?: SuporteVentilatorio; // vem da tabela fisio_suporte_ventilatorio
  fisioResponsavel: string;
  status: Status; contato: boolean; diagnostico: string; suporte: string; vm: boolean;
  data_internacao: string; pesoKg: number; altCm: number;
  spO2: number; fc: number; fr: number; pas: number; pad: number; temp: number;
  fio2: number; pao2: number; evolucao: string;
  satAlvoMin: number; satAlvoMax: number; volCorrenteAlvo: number;
  gas: GasEntry[];
  dispositivos: DeviceEntry[];
}

// IO = MAP × FiO₂ × 100 / PaO₂ — só calculado quando a MAP foi registrada
export interface SuporteVentilatorio {
  suporte: string;
  situacao?: string;
  modo?: string;
  modalidade?: string;
  progExtubacao?: boolean;
  progExtubacaoData?: string; // yyyy-mm-dd
  parametros: Record<string, string>;
}

export const mkGas = (entries: Omit<GasEntry,'pf'|'io'>[]): GasEntry[] =>
  entries.map(e => ({
    ...e,
    pf: +(e.pao2 / e.fio2).toFixed(0),
    io: e.map != null ? +(e.map * e.fio2 * 100 / e.pao2).toFixed(1) : null,
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

export const TOTAL_BEDS = 22; // leitos da UTI PED

// suporte que caracteriza ventilação mecânica invasiva
export const suporteEhVM = (s?: string | null) => s === 'TOT em VM' || s === 'TQT em VM';

/* ─── Persistência no Supabase — tabela "patients" ────────
   A MESMA tabela alimentada pelo fluxo n8n (censo PDF) e usada
   pelo RoundKids. Segue a lógica do n8n:
   · paciente ativo  = archived_at nulo
   · alta / arquivar = preencher archived_at + motivo_arquivamento
   A ficha da fisioterapia fica na coluna fisio_dados (JSONB).
   Sem conexão (ou sem a policy criada), o app segue funcionando
   com os dados de demonstração em memória.                    */
let dbOnline = false;
export const isDbOnline = () => dbOnline;

/* rótulos dos tipos da tabela precautions */
export const PRECAUCAO_LABEL: Record<string,string> = {
  padrao: 'Padrão',
  contato: 'Contato',
  goticula: 'Gotícula',
  aerossois: 'Aerossóis',
  contato_goticula: 'Contato + Gotícula',
  contato_aerossois: 'Contato + Aerossóis',
  contato_goticula_aerossois: 'Contato + Gotícula + Aerossóis',
};
export const precaucoesDe = (p: Patient): string[] =>
  p.precaucoes?.length ? p.precaucoes : (p.contato ? ['contato'] : []);

/* detecção de doença respiratória (sistema/categoria do Round ou nome do diagnóstico) */
const normTexto = (s?: string | null) =>
  (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const RESP_TERMOS = [
  /respirat/, /bronquiolite/, /pneumonia/, /\basma\b/, /\bsara\b/, /\bsdra\b/,
  /bronco/, /laring/, /coqueluche/, /pneumot/, /atelectasia/, /pleural/, /\bvsr\b/, /tuberculose/,
];
export const isRespiratorio = (texto?: string | null) => {
  const t = normTexto(texto);
  return t !== '' && RESP_TERMOS.some(re => re.test(t));
};

const semRowId = (p: Patient) => { const { rowId, ...dados } = p; return dados; };
const isoParaBr = (iso?: string | null) => {
  if (!iso) return '';
  const [a,m,d] = String(iso).slice(0,10).split('-');
  return d && m && a ? `${d}/${m}/${a}` : '';
};
const brParaIso = (br?: string) => {
  const [d,m,a] = (br ?? '').split('/');
  return d && m && a ? `${a}-${m}-${d}` : null;
};

// ficha em branco: paciente vindo do censo (n8n) ou admitido manualmente
export const fichaInicial = (nome: string, leito: number, nasc: string, internacao: string): Patient => {
  const hoje = new Date().toLocaleDateString('pt-BR');
  return {
    id: leito, prontuario: '—', nome, nasc: nasc || hoje, sexo: 'Masculino', mae: '',
    fisioResponsavel: '—', status: 'Estável', contato: false, diagnostico: '—',
    suporte: 'Ar Ambiente', vm: false,
    data_internacao: internacao || hoje,
    pesoKg: 0, altCm: 0, spO2: 97, fc: 120, fr: 30, pas: 90, pad: 50, temp: 36.5,
    fio2: 0.21, pao2: 90, evolucao: 'Paciente importado do censo (PDF via n8n).',
    satAlvoMin: 94, satAlvoMax: 98, volCorrenteAlvo: 0,
    gas: [], dispositivos: [{ id: 1, device: 'Ar Ambiente', inicio: internacao || hoje }],
  };
};

export async function loadPatients(): Promise<'online' | 'offline'> {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('id, name, bed_number, dob, dt_internacao, mother_name, sexo, peso, prontuario, diagnosis, fisio_dados')
      .is('archived_at', null)
      .order('bed_number');
    if (error) throw error;
    // RLS sem policy devolve lista vazia sem erro — e o censo nunca está vazio.
    if (!data || data.length === 0) throw new Error('Nenhum paciente visível — rode o SETUP_FISIO_SUPABASE.sql no Supabase.');
    dbOnline = true;
    const carregados: Patient[] = (data ?? []).map((r: any) => {
      const leito = Number(r.bed_number) || 0;
      const nome = String(r.name ?? '').toUpperCase();
      const base: Patient = r.fisio_dados
        ? { ...(r.fisio_dados as Patient) }
        : fichaInicial(nome, leito, isoParaBr(r.dob), isoParaBr(r.dt_internacao));
      // as colunas oficiais da tabela (que o n8n/RoundKids atualizam) têm prioridade
      return {
        ...base,
        id: leito,
        nome: nome || base.nome,
        nasc: isoParaBr(r.dob) || base.nasc,
        data_internacao: isoParaBr(r.dt_internacao) || base.data_internacao,
        mae: r.mother_name != null ? String(r.mother_name).toUpperCase() : base.mae,
        sexo: (r.sexo as Sexo) ?? base.sexo,
        pesoKg: r.peso != null ? Number(r.peso) : base.pesoKg,
        prontuario: r.prontuario ?? base.prontuario,
        diagnostico: r.diagnosis ?? base.diagnostico,
        rowId: r.id,
      };
    });
    carregados.sort((a,b) => a.id - b.id);

    // precauções ativas (archived_at nulo e dentro da vigência)
    try {
      const hoje = new Date().toISOString().slice(0,10);
      const { data: precs } = await supabase
        .from('precautions')
        .select('patient_id, tipo_precaucao')
        .is('archived_at', null)
        .or(`data_fim.is.null,data_fim.gte.${hoje}`);
      if (precs) {
        const porPaciente = new Map<string, string[]>();
        precs.forEach((pr: any) => {
          const arr = porPaciente.get(pr.patient_id) ?? [];
          if (!arr.includes(pr.tipo_precaucao)) arr.push(pr.tipo_precaucao);
          porPaciente.set(pr.patient_id, arr);
        });
        carregados.forEach(p => {
          const tipos = p.rowId ? (porPaciente.get(p.rowId) ?? []) : [];
          p.precaucoes = tipos;
          p.contato = tipos.length > 0;
        });
      }
    } catch (e) {
      console.warn('Precauções indisponíveis — mantendo o que está na ficha.', e);
    }

    // diagnósticos ativos do Round — a pergunta de origem define se o
    // diagnóstico é principal ou secundário (perguntas_diagnistico.tipo)
    try {
      const { data: diags } = await supabase
        .from('paciente_diagnosticos')
        .select('patient_id, status, sistema, texto_digitado, opcao:pergunta_opcoes_diagnostico(label, categoria, pergunta:perguntas_diagnistico(tipo))')
        .eq('arquivado', false);
      if (diags) {
        const principais  = new Map<string, string[]>();
        const secundarios = new Map<string, string[]>();
        const respiratorio = new Set<string>();
        diags.forEach((d: any) => {
          if (d.status === 'resolvido') return;
          const op   = Array.isArray(d.opcao) ? d.opcao[0] : d.opcao;
          const perg = Array.isArray(op?.pergunta) ? op.pergunta[0] : op?.pergunta;
          const nome = [op?.label, d.texto_digitado].filter(Boolean).join(': ').trim();
          if (!nome) return;
          if (isRespiratorio(d.sistema) || isRespiratorio(op?.categoria) || isRespiratorio(nome)) {
            respiratorio.add(d.patient_id);
          }
          const alvo = (perg?.tipo ?? 'principal') === 'principal' ? principais : secundarios;
          const arr = alvo.get(d.patient_id) ?? [];
          if (!arr.includes(nome)) arr.push(nome);
          alvo.set(d.patient_id, arr);
        });
        carregados.forEach(p => {
          if (!p.rowId) return;
          const prin = principais.get(p.rowId) ?? [];
          const sec  = secundarios.get(p.rowId) ?? [];
          if (prin.length || sec.length) {
            p.diagnosticos = prin.length ? prin : sec;
            p.diagSecundarios = prin.length ? sec : [];
            p.diagnostico = p.diagnosticos.join(' · ');
          }
          p.alertaResp = respiratorio.has(p.rowId);
        });
      }
    } catch (e) {
      console.warn('Diagnósticos indisponíveis — mantendo o que está na ficha.', e);
    }

    // dispositivos respiratórios ativos → alimentam a aba Equipamentos e
    // sugerem o "Suporte Ventilatório Atual" de cada paciente
    try {
      const rowIds = carregados.map(p => p.rowId).filter(Boolean) as string[];
      if (rowIds.length) {
        const { data: disp } = await supabase
          .from('dispositivos_pacientes')
          .select('id, paciente_id, tipo_dispositivo, localizacao, data_insercao, data_remocao')
          .in('paciente_id', rowIds)
          .not('is_archived', 'is', true)
          .order('data_insercao', { ascending: true });
        if (disp) {
          const porPac = new Map<string, DeviceEntry[]>();
          disp.filter((r: any) => isDispositivoRespiratorio(r.tipo_dispositivo)).forEach((r: any) => {
            const arr = porPac.get(r.paciente_id) ?? [];
            arr.push({
              id: Number(r.id),
              device: r.localizacao ? `${r.tipo_dispositivo} (${r.localizacao})` : r.tipo_dispositivo,
              inicio: isoParaBr(r.data_insercao),
              retirada: r.data_remocao ? isoParaBr(r.data_remocao) : undefined,
            });
            porPac.set(r.paciente_id, arr);
          });
          carregados.forEach(p => {
            const devs = p.rowId ? porPac.get(p.rowId) : null;
            if (devs?.length) {
              p.dispositivos = devs;
              const ativo = devs.find(d => !d.retirada);
              const sug = ativo && equipamentoParaSuporte(ativo.device);
              if (sug) { p.suporte = sug; p.vm = suporteEhVM(sug); } // sugestão pelo equipamento em uso
            }
          });
        }
      }
    } catch (e) {
      console.warn('Dispositivos (login) indisponíveis:', e);
    }

    // suporte ventilatório atual (tabela separada) — sobrepõe a sugestão se já houver config salva
    await anexarSuporteVentilatorio(carregados);

    PATIENTS.splice(0, PATIENTS.length, ...carregados);
    return 'online';
  } catch (e) {
    console.warn('Supabase indisponível — usando dados de demonstração em memória.', e);
    dbOnline = false;
    return 'offline';
  }
}

export async function persistPatient(p: Patient) {
  if (!dbOnline || !p.rowId) return; // pacientes novos entram por admitPatient
  try {
    const { error } = await supabase.from('patients')
      .update({
        name: p.nome,
        bed_number: p.id,
        mother_name: p.mae?.trim() || null,
        peso: p.pesoKg || null,
        fisio_dados: semRowId(p),
      })
      .eq('id', p.rowId);
    if (error) throw error;
  } catch (e) {
    console.error('Erro ao salvar paciente no Supabase:', e);
  }
}

/* ─── Sinais vitais por data/turno (tabela fisio_sinais_vitais) ── */
export interface RegistroSinais {
  spO2: string; fc: string; fr: string; pas: string; pad: string; temp: string;
  instabilidades: string[];
}
export type TurnoSinais = 'M' | 'T' | 'N';

export async function loadSinaisVitais(patientRowId: string, dataIso: string) {
  if (!dbOnline) return null;
  try {
    const { data, error } = await supabase
      .from('fisio_sinais_vitais')
      .select('turno, spo2, fc, fr, pas, pad, temp, instabilidades')
      .eq('patient_id', patientRowId)
      .eq('data', dataIso);
    if (error) throw error;
    const out: Partial<Record<TurnoSinais, RegistroSinais>> = {};
    (data ?? []).forEach((r: any) => {
      out[r.turno as TurnoSinais] = {
        spO2: r.spo2?.toString() ?? '', fc: r.fc?.toString() ?? '', fr: r.fr?.toString() ?? '',
        pas: r.pas?.toString() ?? '', pad: r.pad?.toString() ?? '', temp: r.temp?.toString() ?? '',
        instabilidades: r.instabilidades ?? [],
      };
    });
    return out;
  } catch (e) {
    console.warn('Sinais vitais indisponíveis no banco:', e);
    return null;
  }
}

export async function saveSinaisVitais(patientRowId: string, dataIso: string, turno: TurnoSinais, reg: RegistroSinais) {
  if (!dbOnline) return false;
  try {
    const num = (v: string) => v.trim() === '' ? null : parseFloat(v.replace(',', '.'));
    const { error } = await supabase.from('fisio_sinais_vitais').upsert({
      patient_id: patientRowId, data: dataIso, turno,
      spo2: num(reg.spO2), fc: num(reg.fc), fr: num(reg.fr),
      pas: num(reg.pas), pad: num(reg.pad), temp: num(reg.temp),
      instabilidades: reg.instabilidades,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'patient_id,data,turno' });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Erro ao salvar sinais vitais:', e);
    return false;
  }
}

/* ─── Suporte Ventilatório Atual (tabela fisio_suporte_ventilatorio) ── */
export async function saveSuporteVentilatorio(patientRowId: string, sv: SuporteVentilatorio) {
  if (!dbOnline) return false;
  try {
    const { error } = await supabase.from('fisio_suporte_ventilatorio').upsert({
      patient_id: patientRowId,
      suporte: sv.suporte,
      situacao: sv.situacao ?? null,
      modo: sv.modo || null,
      modalidade: sv.modalidade || null,
      prog_extubacao: !!sv.progExtubacao,
      prog_extubacao_data: sv.progExtubacaoData || null,
      parametros: sv.parametros ?? {},
      updated_at: new Date().toISOString(),
    }, { onConflict: 'patient_id' });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Erro ao salvar suporte ventilatório:', e);
    return false;
  }
}

// carrega o suporte de todos os pacientes já carregados e anexa em cada um
async function anexarSuporteVentilatorio(lista: Patient[]) {
  try {
    const ids = lista.map(p => p.rowId).filter(Boolean);
    if (ids.length === 0) return;
    const { data, error } = await supabase
      .from('fisio_suporte_ventilatorio')
      .select('patient_id, suporte, situacao, modo, modalidade, prog_extubacao, prog_extubacao_data, parametros');
    if (error) throw error;
    const porPaciente = new Map<string, any>();
    (data ?? []).forEach((r: any) => porPaciente.set(r.patient_id, r));
    lista.forEach(p => {
      const r = p.rowId ? porPaciente.get(p.rowId) : null;
      if (!r) return;
      p.suporteDetalhe = {
        suporte: r.suporte,
        situacao: r.situacao ?? undefined,
        modo: r.modo ?? undefined,
        modalidade: r.modalidade ?? undefined,
        progExtubacao: r.prog_extubacao ?? false,
        progExtubacaoData: r.prog_extubacao_data ?? undefined,
        parametros: r.parametros ?? {},
      };
      p.suporte = r.suporte; // o suporte da tabela é a fonte da verdade
      p.vm = suporteEhVM(r.suporte);
    });
  } catch (e) {
    console.warn('Suporte ventilatório indisponível no banco:', e);
  }
}

/* ─── Gasometria da fisioterapia (tabela própria fisio_gasometria) ── */
export async function loadGasometria(patientRowId: string): Promise<GasEntry[] | null> {
  if (!dbOnline) return null;
  try {
    const { data, error } = await supabase
      .from('fisio_gasometria')
      .select('data, hora, ph, paco2, pao2, hco3, be, fio2, map, pf, io')
      .eq('patient_id', patientRowId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      data: r.data ?? '', hora: r.hora ?? '',
      ph: Number(r.ph) || 0, paco2: Number(r.paco2) || 0, pao2: Number(r.pao2) || 0,
      hco3: Number(r.hco3) || 0, be: Number(r.be) || 0, fio2: Number(r.fio2) || 0,
      map: r.map != null ? Number(r.map) : null,
      pf: Number(r.pf) || 0, io: r.io != null ? Number(r.io) : null,
    }));
  } catch (e) {
    console.warn('Gasometria indisponível no banco:', e);
    return null;
  }
}

export async function saveGasometria(patientRowId: string, e: GasEntry): Promise<boolean> {
  if (!dbOnline) return false;
  try {
    const { error } = await supabase.from('fisio_gasometria').insert({
      patient_id: patientRowId,
      data: e.data, hora: e.hora, ph: e.ph, paco2: e.paco2, pao2: e.pao2,
      hco3: e.hco3, be: e.be, fio2: e.fio2, map: e.map ?? null, pf: e.pf, io: e.io,
    });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Erro ao salvar gasometria:', err);
    return false;
  }
}

/* ─── Scores / escalas (tabela scale_scores do Round) ── */
export interface ScoreRegistro { scale_name: string; score: number; interpretation: string; date: string; }

export async function saveScore(patientRowId: string, scaleName: string, score: number, interpretation: string): Promise<boolean> {
  if (!dbOnline) return false;
  try {
    const { error } = await supabase.from('scale_scores').insert({
      patient_id: patientRowId, scale_name: scaleName, score, interpretation,
      date: new Date().toISOString(),
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Erro ao gravar score:', e);
    return false;
  }
}

export async function loadScores(patientRowId: string, scaleName?: string): Promise<ScoreRegistro[] | null> {
  if (!dbOnline) return null;
  try {
    let q = supabase.from('scale_scores')
      .select('scale_name, score, interpretation, date')
      .eq('patient_id', patientRowId)
      .is('archived_at', null)
      .order('date', { ascending: false })
      .limit(20);
    if (scaleName) q = q.eq('scale_name', scaleName);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as ScoreRegistro[];
  } catch (e) {
    console.warn('Histórico de scores indisponível:', e);
    return null;
  }
}

/* ─── Equipamentos / dispositivos (tabela dispositivos_pacientes do Round) ──
   A fisioterapia só gerencia dispositivos RESPIRATÓRIOS. Os demais
   (CVC, AVP, SVD, SNE, GTT, PICC, drenos, PAI...) são da equipe
   médica/enfermagem — o app nem exibe nem deixa mexer neles.        */
const RESP_DISPOSITIVO = [
  /cnaf/i, /\bvni\b/i, /cpap|bipap|bilevel/i, /\btot\b/i, /\btqt\b/i, /traqueost/i,
  /ventur/i, /cateter nasal|cat[eé]ter nasal/i, /m[aá]scara/i, /ar ambiente/i,
  /nasal de o|nasal de oxig/i, /prona/i, /[oó]xido n[ií]trico|\bnoi\b/i,
];
export const isDispositivoRespiratorio = (tipo?: string | null) => {
  const t = tipo ?? '';
  return t !== '' && RESP_DISPOSITIVO.some(re => re.test(t));
};

// traduz o dispositivo (aba Equipamentos) para a opção do "Suporte Ventilatório Atual"
export const equipamentoParaSuporte = (tipo?: string | null): string | null => {
  const t = (tipo ?? '').toLowerCase();
  if (/cnaf/.test(t)) return 'CNAF';
  if (/\bvni\b|cpap|bipap|bilevel/.test(t)) return 'VNI';
  if (/\btot\b/.test(t)) return 'TOT em VM';
  if (/\btqt\b|traqueost/.test(t)) return 'TQT em VM';
  if (/ventur/.test(t)) return 'Máscara Venturi';
  if (/concentr|m[aá]scara comum/.test(t)) return 'Máscara Comum';
  if (/cateter nasal|cat[eé]ter nasal|nasal de o|nasal de oxig/.test(t)) return 'Cateter Nasal';
  if (/ar ambiente/.test(t)) return 'Ar Ambiente';
  return null;
};

export async function loadDispositivos(patientRowId: string): Promise<DeviceEntry[] | null> {
  if (!dbOnline) return null;
  try {
    const { data, error } = await supabase
      .from('dispositivos_pacientes')
      .select('id, tipo_dispositivo, localizacao, data_insercao, data_remocao')
      .eq('paciente_id', patientRowId)
      .not('is_archived', 'is', true)
      .order('data_insercao', { ascending: true });
    if (error) throw error;
    return (data ?? [])
      .filter((r: any) => isDispositivoRespiratorio(r.tipo_dispositivo)) // só respiratórios
      .map((r: any) => ({
        id: Number(r.id),
        device: r.localizacao ? `${r.tipo_dispositivo} (${r.localizacao})` : r.tipo_dispositivo,
        inicio: isoParaBr(r.data_insercao),
        retirada: r.data_remocao ? isoParaBr(r.data_remocao) : undefined,
      }));
  } catch (e) {
    console.warn('Dispositivos indisponíveis no banco:', e);
    return null;
  }
}

export async function addDispositivo(patientRowId: string, tipo: string, localizacao: string, dataInsercaoIso: string): Promise<number | null> {
  if (!dbOnline) return null;
  try {
    const { data, error } = await supabase.from('dispositivos_pacientes')
      .insert({ paciente_id: patientRowId, tipo_dispositivo: tipo, localizacao, data_insercao: dataInsercaoIso, is_archived: false })
      .select('id')
      .single();
    if (error) throw error;
    return Number(data.id);
  } catch (e) {
    console.error('Erro ao registrar dispositivo:', e);
    return null;
  }
}

export async function removeDispositivo(deviceId: number, dataRemocaoIso: string): Promise<boolean> {
  if (!dbOnline) return false;
  try {
    const { error } = await supabase.from('dispositivos_pacientes')
      .update({ data_remocao: dataRemocaoIso })
      .eq('id', deviceId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Erro ao retirar dispositivo:', e);
    return false;
  }
}

/* ─── Admissão / alta manual (mesma lógica do fluxo n8n) ── */
export function admitPatient(p: Patient) {
  PATIENTS.push(p);
  PATIENTS.sort((a,b) => a.id - b.id);
  if (!dbOnline) return;
  void (async () => {
    try {
      // mesmos campos do nó "Criar Novos" do n8n + a ficha da fisio
      const { data, error } = await supabase.from('patients')
        .insert({
          name: p.nome,
          bed_number: p.id,
          dob: brParaIso(p.nasc),
          dt_internacao: brParaIso(p.data_internacao),
          fisio_dados: semRowId(p),
        })
        .select('id')
        .single();
      if (error) throw error;
      p.rowId = data.id;
    } catch (e) {
      console.error('Erro ao cadastrar paciente no Supabase:', e);
    }
  })();
}
export function dischargePatient(id: number) {
  const i = PATIENTS.findIndex(p => p.id === id);
  if (i < 0) return;
  const [p] = PATIENTS.splice(i, 1);
  if (!dbOnline || !p.rowId) return;
  // igual ao nó "Arquivar Antigos" do n8n
  supabase.from('patients')
    .update({ archived_at: new Date().toISOString(), motivo_arquivamento: 'Alta manual (Fisio Beira Leito)' })
    .eq('id', p.rowId)
    .then(({ error }) => { if (error) console.error('Erro ao arquivar paciente:', error); });
}
export function nextFreeBed(): number {
  for (let leito = 1; leito <= TOTAL_BEDS; leito++) {
    if (!PATIENTS.some(p => p.id === leito)) return leito;
  }
  return PATIENTS.length + 1;
}

export const PATIENTS: Patient[] = [
  { id:1, prontuario:'815319', nome:'YKARO MATHEUS SOARES TADEU', nasc:'16/12/2025', sexo:'Masculino', mae:'PAOLA LIZANDRA SOARES',
    fisioResponsavel:'Dra. Mariana S.',
    status:'Estável', contato:true, diagnostico:'Bronquiolite Viral Aguda', suporte:'CNAF', vm:false,
    data_internacao:'10/06/2026', pesoKg:5.58, altCm:64, spO2:97, fc:128, fr:38, pas:92, pad:54, temp:36.8, fio2:0.35, pao2:88,
    evolucao:'Desmame gradual de CNAF. Padrão respiratório melhorado.',
    satAlvoMin:94, satAlvoMax:98, volCorrenteAlvo:39,
    gas: mkGas([{data:'10/06',hora:'08h',ph:7.32,paco2:48,pao2:62,hco3:20,be:-4,fio2:0.50},{data:'11/06',hora:'08h',ph:7.34,paco2:45,pao2:72,hco3:22,be:-2,fio2:0.45},{data:'12/06',hora:'08h',ph:7.36,paco2:42,pao2:80,hco3:23,be:-1,fio2:0.40},{data:'13/06',hora:'08h',ph:7.37,paco2:41,pao2:88,hco3:24,be:0,fio2:0.35}]),
    dispositivos:[{id:1,device:'Cateter Nasal',inicio:'10/06/2026',retirada:'11/06/2026'},{id:2,device:'CNAF',inicio:'11/06/2026'}] },
  { id:2, prontuario:'821047', nome:'MARIA HELOISA ALMEIDA NASCIMENTO', nasc:'20/04/2026', sexo:'Feminino', mae:'FERNANDA ALMEIDA NASCIMENTO',
    fisioResponsavel:'Dra. Mariana S.',
    status:'Estável', contato:true, diagnostico:'Pneumonia Bacteriana', suporte:'Cateter Nasal', vm:false,
    data_internacao:'21/06/2026', pesoKg:6.10, altCm:64, spO2:96, fc:144, fr:42, pas:88, pad:52, temp:37.4, fio2:0.30, pao2:82,
    evolucao:'Boa resposta ao antibiótico. Saturação estável.',
    satAlvoMin:94, satAlvoMax:98, volCorrenteAlvo:43,
    gas: mkGas([{data:'21/06',hora:'10h',ph:7.33,paco2:44,pao2:70,hco3:21,be:-3,fio2:0.40},{data:'22/06',hora:'10h',ph:7.35,paco2:42,pao2:78,hco3:22,be:-1,fio2:0.35},{data:'23/06',hora:'10h',ph:7.37,paco2:40,pao2:82,hco3:23,be:0,fio2:0.30}]),
    dispositivos:[{id:1,device:'Cateter Nasal',inicio:'21/06/2026'}] },
  { id:3, prontuario:'809332', nome:'PEDRO LUCAS GUIMARAES', nasc:'18/05/2025', sexo:'Masculino', mae:'CARLA GUIMARAES SILVA',
    fisioResponsavel:'Dr. Carlos M.',
    status:'Estável', contato:true, diagnostico:'Sepse Pulmonar', suporte:'VNI', vm:false,
    data_internacao:'16/06/2026', pesoKg:7.50, altCm:68, spO2:95, fc:156, fr:46, pas:82, pad:48, temp:38.1, fio2:0.50, pao2:74,
    evolucao:'VNI intermitente. Gasometria com melhora.',
    satAlvoMin:94, satAlvoMax:98, volCorrenteAlvo:53,
    gas: mkGas([{data:'16/06',hora:'08h',ph:7.28,paco2:54,pao2:55,hco3:19,be:-6,fio2:0.70},{data:'18/06',hora:'08h',ph:7.31,paco2:50,pao2:62,hco3:20,be:-4,fio2:0.60},{data:'20/06',hora:'08h',ph:7.34,paco2:46,pao2:68,hco3:22,be:-2,fio2:0.55},{data:'22/06',hora:'08h',ph:7.36,paco2:43,pao2:74,hco3:23,be:-1,fio2:0.50}]),
    dispositivos:[{id:1,device:'Máscara Venturi',inicio:'16/06/2026',retirada:'18/06/2026'},{id:2,device:'VNI',inicio:'18/06/2026'}] },
  { id:4, prontuario:'834561', nome:'DHERICK CALEBE MACIEL CARDOSO', nasc:'30/10/2025', sexo:'Masculino', mae:'SIMONE MACIEL CARDOSO',
    fisioResponsavel:'Dr. Carlos M.',
    status:'Estável', contato:false, diagnostico:'Displasia Broncopulmonar', suporte:'Ar Ambiente', vm:false,
    data_internacao:'12/06/2026', pesoKg:5.80, altCm:61, spO2:94, fc:138, fr:40, pas:90, pad:56, temp:36.6, fio2:0.21, pao2:68,
    evolucao:'Desmame completo. Aguardando critérios de alta.',
    satAlvoMin:94, satAlvoMax:98, volCorrenteAlvo:41,
    gas: mkGas([{data:'12/06',hora:'09h',ph:7.35,paco2:42,pao2:62,hco3:22,be:-2,fio2:0.35},{data:'16/06',hora:'09h',ph:7.37,paco2:40,pao2:68,hco3:23,be:0,fio2:0.28}]),
    dispositivos:[{id:1,device:'CNAF',inicio:'12/06/2026',retirada:'15/06/2026'},{id:2,device:'Cateter Nasal',inicio:'15/06/2026',retirada:'20/06/2026'},{id:3,device:'Ar Ambiente',inicio:'20/06/2026'}] },
  { id:5, prontuario:'798214', nome:'GREGÓRIO FERREIRA DE SOUZA DIAS', nasc:'29/08/2025', sexo:'Masculino', mae:'ADRIANA FERREIRA DE SOUZA',
    fisioResponsavel:'Dra. Mariana S.',
    status:'Instável', contato:true, diagnostico:'Bronquiolite Grave', suporte:'TOT em VM', vm:true,
    data_internacao:'22/06/2026', pesoKg:9.00, altCm:74, spO2:91, fc:172, fr:0, pas:76, pad:44, temp:38.9, fio2:0.80, pao2:52,
    evolucao:'Intubado ontem por falência respiratória. Parâmetros elevados.',
    satAlvoMin:92, satAlvoMax:97, volCorrenteAlvo:63,
    gas: mkGas([{data:'22/06',hora:'14h',ph:7.22,paco2:62,pao2:42,hco3:17,be:-9,fio2:1.00,map:16},{data:'22/06',hora:'20h',ph:7.26,paco2:56,pao2:48,hco3:19,be:-7,fio2:0.90,map:15},{data:'23/06',hora:'08h',ph:7.29,paco2:52,pao2:52,hco3:20,be:-5,fio2:0.85,map:14}]),
    dispositivos:[{id:1,device:'CNAF',inicio:'22/06/2026',retirada:'22/06/2026'},{id:2,device:'TOT em VM',inicio:'22/06/2026'}] },
  { id:6, prontuario:'845903', nome:'JOSÉ LEVY ARAÚJO DOS SANTOS', nasc:'06/05/2026', sexo:'Masculino', mae:'TALITA ARAÚJO DOS SANTOS',
    fisioResponsavel:'Dra. Paula R.',
    status:'Estável', contato:true, diagnostico:'Coqueluche', suporte:'Cateter Nasal', vm:false,
    data_internacao:'18/06/2026', pesoKg:5.50, altCm:60, spO2:96, fc:148, fr:44, pas:86, pad:50, temp:36.9, fio2:0.28, pao2:80,
    evolucao:'Paroxismos de tosse diminuindo. Oxigenioterapia em desmame.',
    satAlvoMin:94, satAlvoMax:98, volCorrenteAlvo:39,
    gas: mkGas([]), dispositivos:[{id:1,device:'Cateter Nasal',inicio:'18/06/2026'}] },
  { id:7, prontuario:'762108', nome:'LARISSA MANUELLA DA SILVA', nasc:'19/11/2016', sexo:'Feminino', mae:'ROSANA MANUELLA DA SILVA',
    fisioResponsavel:'Dra. Paula R.',
    status:'Alta Prevista', contato:false, diagnostico:'Asma Grave', suporte:'Ar Ambiente', vm:false,
    data_internacao:'20/06/2026', pesoKg:28.00, altCm:130, spO2:98, fc:102, fr:24, pas:104, pad:62, temp:36.4, fio2:0.21, pao2:98,
    evolucao:'Critérios de alta atingidos. Alta prevista para amanhã.',
    satAlvoMin:94, satAlvoMax:98, volCorrenteAlvo:196,
    gas: mkGas([]), dispositivos:[{id:1,device:'Máscara Venturi',inicio:'20/06/2026',retirada:'22/06/2026'},{id:2,device:'Ar Ambiente',inicio:'22/06/2026'}] },
  { id:8, prontuario:'851729', nome:'LUNNA DANDARA MACHADO CARDOSO', nasc:'15/02/2026', sexo:'Feminino', mae:'VANESSA MACHADO CARDOSO',
    fisioResponsavel:'Dr. Carlos M.',
    status:'Estável', contato:true, diagnostico:'Laringotraqueíte Grave', suporte:'Másc. Venturi', vm:false,
    data_internacao:'24/06/2026', pesoKg:4.80, altCm:56, spO2:95, fc:160, fr:48, pas:84, pad:46, temp:37.7, fio2:0.40, pao2:72,
    evolucao:'Admitida hoje. Estridor melhorado após adrenalina nebulizada.',
    satAlvoMin:94, satAlvoMax:98, volCorrenteAlvo:34,
    gas: mkGas([]), dispositivos:[{id:1,device:'Máscara Venturi',inicio:'24/06/2026'}] },
  { id:9, prontuario:'774456', nome:'SAMUEL RODRIGUES ALVES PINTO', nasc:'03/07/2025', sexo:'Masculino', mae:'CRISTIANE RODRIGUES ALVES',
    fisioResponsavel:'Dra. Mariana S.',
    status:'Crítico', contato:true, diagnostico:'SARA Grave', suporte:'TQT em VM', vm:true,
    data_internacao:'09/06/2026', pesoKg:10.40, altCm:76, spO2:88, fc:180, fr:0, pas:68, pad:38, temp:39.2, fio2:1.00, pao2:48,
    evolucao:'Pronado desde ontem. IO=24. Sedação profunda.',
    satAlvoMin:92, satAlvoMax:97, volCorrenteAlvo:73,
    gas: mkGas([{data:'09/06',hora:'08h',ph:7.18,paco2:68,pao2:38,hco3:15,be:-12,fio2:1.00,map:18},{data:'11/06',hora:'08h',ph:7.22,paco2:62,pao2:42,hco3:17,be:-9,fio2:1.00,map:17},{data:'13/06',hora:'08h',ph:7.26,paco2:58,pao2:46,hco3:19,be:-1,fio2:1.00,map:16},{data:'15/06',hora:'08h',ph:7.29,paco2:54,pao2:50,hco3:21,be:-5,fio2:0.95,map:15},{data:'17/06',hora:'08h',ph:7.31,paco2:50,pao2:52,hco3:22,be:-3,fio2:0.90,map:14}]),
    dispositivos:[{id:1,device:'TOT em VM',inicio:'09/06/2026',retirada:'14/06/2026'},{id:2,device:'TQT em VM',inicio:'14/06/2026'}] },
  { id:10, prontuario:'863041', nome:'AURORA BEATRIZ LIMA FERREIRA', nasc:'11/09/2024', sexo:'Feminino', mae:'PATRICIA LIMA FERREIRA',
    fisioResponsavel:'Dra. Paula R.',
    status:'Instável', contato:false, diagnostico:'Insuf. Respiratória Aguda', suporte:'VNI', vm:false,
    data_internacao:'21/06/2026', pesoKg:12.60, altCm:82, spO2:93, fc:164, fr:52, pas:78, pad:42, temp:38.3, fio2:0.60, pao2:62,
    evolucao:'VNI contínua. PF=148. Avaliar intubação se piora.',
    satAlvoMin:94, satAlvoMax:98, volCorrenteAlvo:88,
    gas: mkGas([]), dispositivos:[{id:1,device:'VNI',inicio:'21/06/2026'}] },
];
PATIENTS.sort((a,b) => a.id - b.id);
