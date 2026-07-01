import { useState } from 'react';
import {
  PieChart, Pie, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PATIENTS, TOTAL_BEDS, Patient } from '../patients';

/* ─── Cores por suporte ───────────────────────────────── */
const SUPORTE_FILL: Record<string, string> = {
  'Ar Ambiente':   '#38bdf8',
  'Cateter Nasal': '#0ea5e9',
  'Másc. Venturi': '#0369a1',
  'CNAF':          '#f97316',
  'VNI':           '#a78bfa',
  'TQT em O₂':    '#34d399',
  'TQT em VM':     '#fb7185',
  'TOT em VM':     '#fbbf24',
};

const SUPORTE_TO_VENT: Record<string, string> = {
  'Ar Ambiente':    'Ar Ambiente',
  'Cateter Nasal':  'Cateter Nasal (CN)',
  'Másc. Venturi':  'Máscara Venturi',
  'Máscara Comum':  'Máscara Comum',
  'CNAF':           'CNAF',
  'VNI':            'VNI',
  'TQT em Ar Amb.': 'TQT em Ar Amb.',
  'TQT em O₂':     'TQT em O₂',
  'TQT em VM':      'TQT em VM',
  'TOT em VM':      'TOT em VM',
};

function buildVentData(patients: Patient[]) {
  const counts: Record<string, number> = {};
  patients.forEach(p => { counts[p.suporte] = (counts[p.suporte] || 0) + 1; });
  return Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value, fill: SUPORTE_FILL[name] || '#94a3b8' }));
}

function buildInitVent(patients: Patient[]) {
  const counts: Record<string, number> = {};
  patients.forEach(p => {
    const label = SUPORTE_TO_VENT[p.suporte] || p.suporte;
    counts[label] = (counts[label] || 0) + 1;
  });
  return [
    { label: 'Ar Ambiente',        val: counts['Ar Ambiente'] || 0 },
    { label: 'Cateter Nasal (CN)', val: counts['Cateter Nasal (CN)'] || 0 },
    { label: 'Máscara Venturi',    val: counts['Máscara Venturi'] || 0 },
    { label: 'Máscara Comum',      val: counts['Máscara Comum'] || 0 },
    { label: 'CNAF',               val: counts['CNAF'] || 0 },
    { label: 'VNI',                val: counts['VNI'] || 0 },
    { label: 'TQT em Ar Amb.',     val: counts['TQT em Ar Amb.'] || 0 },
    { label: 'TQT em O₂',         val: counts['TQT em O₂'] || 0 },
    { label: 'TQT em VM',          val: counts['TQT em VM'] || 0, special: true },
    { label: 'TOT em VM',          val: counts['TOT em VM'] || 0, special: true },
    { label: 'Pronados',           val: 0 },
    { label: 'Em NOI',             val: 0 },
  ];
}

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

export default function Dashboard({ setCurrentView, turno, physioName }: any) {
  /* ── Dados derivados dos pacientes ── */
  const occupied      = PATIENTS.length;
  const vacant        = Math.max(0, TOTAL_BEDS - occupied);
  const occupancyPct  = Math.round((occupied / TOTAL_BEDS) * 100);
  const progExtub     = PATIENTS.filter(p => p.status === 'Alta Prevista').length;
  const atRisk        = PATIENTS.filter(p => p.status === 'Crítico' || p.status === 'Instável');
  const alertPatient  = atRisk[0] ?? null;

  const VENT_DATA = buildVentData(PATIENTS);
  const BED_DATA  = [
    { name: 'Ocupados', value: occupied,  fill: '#0ea5e9' },
    { name: 'Vagos',    value: vacant,    fill: '#10b981' },
  ];

  const [equipNoteVisible, setEquipNoteVisible] = useState(false);
  const [activeVent, setActiveVent] = useState<number | null>(null);
  const [activeBed, setActiveBed]   = useState<number | null>(null);
  const ventItems = buildInitVent(PATIENTS);

  const totalMapeados = ventItems.reduce((s, it) => s + it.val, 0);
  const totalVent     = VENT_DATA.reduce((s, d) => s + d.value, 0);

  const ventWithPct = VENT_DATA.map(d => ({ ...d, pct: Math.round((d.value / totalVent) * 100) }));
  const bedWithPct  = BED_DATA.map(d => ({ ...d, pct: Math.round((d.value / TOTAL_BEDS) * 100) }));

  const highlightVent = ventWithPct.map((d, i) => ({
    ...d, fill: activeVent === null || activeVent === i ? d.fill : d.fill + '55',
  }));
  const highlightBed = bedWithPct.map((d, i) => ({
    ...d, fill: activeBed === null || activeBed === i ? d.fill : d.fill + '44',
  }));

  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    await new Promise(r => setTimeout(r, 0)); // deixa o botão repintar antes do trabalho síncrono
    try {
      const CLINICAL_500: [number, number, number] = [38, 97, 129];
      const CLINICAL_700: [number, number, number] = [27, 65, 87];
      const CLINICAL_800: [number, number, number] = [26, 55, 73];
      const SLATE_100: [number, number, number] = [241, 245, 249];
      const SLATE_800: [number, number, number] = [30, 41, 59];
      const ROSE_50: [number, number, number] = [255, 241, 242];
      const ROSE_300: [number, number, number] = [253, 164, 175];
      const ROSE_700: [number, number, number] = [190, 18, 60];

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 40;
      const contentTop = 92;
      const contentBottom = 50;

      const dataHora = new Date().toLocaleString('pt-BR');
      const fileDate = new Date().toISOString().slice(0, 10);

      const drawHeader = () => {
        pdf.setFillColor(...CLINICAL_500);
        pdf.rect(0, 0, pageWidth, 70, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(15);
        pdf.text('Fisio Beira Leito', margin, 28);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9.5);
        pdf.text('Relatório de Cenário Atual — UTI PED', margin, 44);

        pdf.setFontSize(8);
        const rightX = pageWidth - margin;
        pdf.text(`Data/Hora: ${dataHora}`, rightX, 22, { align: 'right' });
        pdf.text(`Fisioterapeuta: ${physioName || '—'}`, rightX, 35, { align: 'right' });
        pdf.text(`Turno: ${turno || '—'}`, rightX, 48, { align: 'right' });
      };

      const drawFooter = (pageNum: number, totalPages: number) => {
        pdf.setDrawColor(...CLINICAL_500);
        pdf.setLineWidth(0.75);
        pdf.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);

        pdf.setTextColor(...CLINICAL_800);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.text('Documento gerado automaticamente pelo Fisio Beira Leito', margin, pageHeight - 16);
        pdf.text(`Página ${pageNum} de ${totalPages}`, pageWidth - margin, pageHeight - 16, { align: 'right' });
      };

      let cursorY = contentTop;

      const ensureSpace = (height: number) => {
        if (cursorY + height > pageHeight - contentBottom) {
          pdf.addPage();
          cursorY = contentTop;
        }
      };

      const sectionTitle = (title: string) => {
        ensureSpace(24);
        pdf.setTextColor(...CLINICAL_700);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text(title, margin, cursorY);
        cursorY += 10;
      };

      const baseTable = (head: string[][], body: (string | number)[][], opts: any = {}) => {
        autoTable(pdf, {
          startY: cursorY,
          margin: { left: margin, right: margin, top: contentTop, bottom: contentBottom },
          head,
          body: body as any,
          theme: 'striped',
          headStyles: { fillColor: CLINICAL_500, textColor: 255, fontSize: 8.5 },
          bodyStyles: { fontSize: 9, textColor: SLATE_800 },
          alternateRowStyles: { fillColor: SLATE_100 },
          ...opts,
        });
        cursorY = (pdf as any).lastAutoTable.finalY + 22;
      };

      // fontes padrão do PDF não têm glyph para dígitos subscritos (ex.: "O₂")
      const pdfSafe = (str: string) => str.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (c) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(c)));

      const hexToRgb = (hex: string): [number, number, number] => {
        const n = parseInt(hex.replace('#', ''), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      };

      const SLATE_200: [number, number, number] = [226, 232, 240];
      const SLATE_400: [number, number, number] = [148, 163, 184];
      const SLATE_50: [number, number, number] = [248, 250, 252];
      const CARD_PAD = 16;

      const drawCard = (height: number) => {
        pdf.setFillColor(...SLATE_50);
        pdf.setDrawColor(...SLATE_200);
        pdf.setLineWidth(0.75);
        pdf.roundedRect(margin, cursorY, pageWidth - margin * 2, height, 6, 6, 'FD');
        return cursorY + CARD_PAD;
      };

      const drawDonutWithLegend = (
        data: { name: string; value: number; fill: string; pct?: number }[],
        centerLabel: string,
      ) => {
        const total = data.reduce((s, d) => s + d.value, 0);
        const visible = data.filter(d => d.value > 0);
        const legendRowHeight = 16;
        const innerHeight = Math.max(120, visible.length * legendRowHeight + 6);
        const cardHeight = innerHeight + CARD_PAD * 2;
        ensureSpace(cardHeight + 14);

        const innerTop = drawCard(cardHeight);
        const cx = margin + CARD_PAD + 58;
        const cy = innerTop + innerHeight / 2;
        const radius = 54;
        const innerRadius = 30;
        const gapRad = visible.length > 1 ? 0.045 : 0;
        const ctx = (pdf as any).context2d;

        let angle = -Math.PI / 2;
        const availableAngle = Math.PI * 2 - gapRad * visible.length;
        visible.forEach(d => {
          const slice = (d.value / total) * availableAngle;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, radius, angle, angle + slice, false);
          ctx.closePath();
          ctx.fillStyle = d.fill;
          ctx.fill();
          angle += slice + gapRad;
        });
        ctx.beginPath();
        ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.fillStyle = '#f8fafc';
        ctx.fill();

        pdf.setTextColor(...SLATE_800);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.text(String(total), cx, cy - 1, { align: 'center' });
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6);
        pdf.setTextColor(...SLATE_400);
        pdf.text(pdfSafe(centerLabel).toUpperCase(), cx, cy + 10, { align: 'center' });

        const legendX = margin + CARD_PAD + 145;
        const legendRight = pageWidth - margin - CARD_PAD;
        let legendY = innerTop + (innerHeight - visible.length * legendRowHeight) / 2 + 10;
        visible.forEach(d => {
          pdf.setFillColor(...hexToRgb(d.fill));
          pdf.circle(legendX, legendY - 3, 3.2, 'F');
          pdf.setTextColor(...SLATE_800);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8.5);
          pdf.text(pdfSafe(d.name), legendX + 10, legendY);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${d.value}`, legendRight - 30, legendY, { align: 'right' });
          if (d.pct != null) {
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(...SLATE_400);
            pdf.setFontSize(7.5);
            pdf.text(`${d.pct}%`, legendRight, legendY, { align: 'right' });
          }
          legendY += legendRowHeight;
        });

        cursorY += cardHeight + 20;
      };

      const drawWeeklyBarChart = () => {
        const chartHeight = 100;
        const innerHeight = chartHeight + 50;
        const cardHeight = innerHeight + CARD_PAD * 2;
        ensureSpace(cardHeight + 14);

        const innerTop = drawCard(cardHeight);
        const chartX = margin + CARD_PAD;
        const chartTop = innerTop + 4;
        const chartWidth = pageWidth - margin * 2 - CARD_PAD * 2;
        const baseline = chartTop + chartHeight;
        const seriesColors: Record<'VM' | 'VNI' | 'CNAF', string> = { VM: '#f43f5e', VNI: '#0ea5e9', CNAF: '#f97316' };
        const keys: Array<'VM' | 'VNI' | 'CNAF'> = ['VM', 'VNI', 'CNAF'];
        const maxVal = Math.max(...WEEK_DATA.flatMap(w => keys.map(k => w[k])), 1);
        const groupWidth = chartWidth / WEEK_DATA.length;
        const barWidth = groupWidth / 6;

        // grade horizontal (0/25/50/75/100% do máximo)
        pdf.setDrawColor(...SLATE_200);
        pdf.setLineWidth(0.4);
        for (let g = 0; g <= 4; g++) {
          const y = baseline - (g / 4) * (chartHeight - 14);
          pdf.line(chartX, y, chartX + chartWidth, y);
        }

        WEEK_DATA.forEach((w, i) => {
          const groupX = chartX + i * groupWidth;
          const groupStart = groupX + groupWidth / 2 - (barWidth * 3 + 6) / 2;
          keys.forEach((key, si) => {
            const val = w[key];
            const h = (val / maxVal) * (chartHeight - 14);
            const barX = groupStart + si * (barWidth + 3);
            pdf.setFillColor(...hexToRgb(seriesColors[key]));
            pdf.roundedRect(barX, baseline - h, barWidth, h, 1, 1, 'F');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(6);
            pdf.setTextColor(...hexToRgb(seriesColors[key]));
            pdf.text(String(val), barX + barWidth / 2, baseline - h - 3, { align: 'center' });
          });
          pdf.setTextColor(...SLATE_800);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7.5);
          pdf.text(w.dia, groupX + groupWidth / 2, baseline + 14, { align: 'center' });
        });

        pdf.setDrawColor(...SLATE_400);
        pdf.setLineWidth(0.6);
        pdf.line(chartX, baseline, chartX + chartWidth, baseline);

        let legendX = chartX;
        const legendY = baseline + 34;
        keys.forEach(key => {
          pdf.setFillColor(...hexToRgb(seriesColors[key]));
          pdf.roundedRect(legendX, legendY - 7, 8, 8, 1, 1, 'F');
          pdf.setTextColor(...SLATE_800);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.text(key, legendX + 12, legendY);
          legendX += 55;
        });

        cursorY += cardHeight + 20;
      };

      drawHeader();

      // 1. Resumo geral
      sectionTitle('Resumo Geral da UTI PED');
      baseTable(
        [['Total de Leitos', 'Ocupados', 'Vagos', 'Em VM', 'Alta Prevista']],
        [[TOTAL_BEDS, `${occupied} (${occupancyPct}%)`, vacant, PATIENTS.filter(p => p.vm).length, progExtub]],
        { bodyStyles: { fontSize: 10, halign: 'center', fontStyle: 'bold', textColor: SLATE_800 } },
      );

      if (alertPatient) {
        ensureSpace(40);
        pdf.setFillColor(...ROSE_50);
        pdf.setDrawColor(...ROSE_300);
        pdf.roundedRect(margin, cursorY, pageWidth - margin * 2, 36, 4, 4, 'FD');
        pdf.setTextColor(...ROSE_700);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.text('ALERTA VENTILATÓRIO ATIVO', margin + 10, cursorY + 15);
        pdf.setFont('helvetica', 'normal');
        pdf.text(
          `Leito ${alertPatient.id}: ${alertPatient.diagnostico}. ${alertPatient.status === 'Crítico' ? 'Paciente em estado crítico.' : 'Requer atenção.'}`,
          margin + 10, cursorY + 27,
        );
        cursorY += 36 + 22;
      }

      // 2. Cenário ventilatório geral
      sectionTitle('Cenário Ventilatório Geral');
      baseTable(
        [['Modalidade', 'Nº Pacientes']],
        ventItems.map(it => [pdfSafe(it.label), it.val]),
        {
          columnStyles: { 1: { halign: 'center', cellWidth: 90 } },
          foot: [['Total Mapeados', totalMapeados]],
          footStyles: { fillColor: SLATE_100, textColor: SLATE_800, fontStyle: 'bold', fontSize: 9 },
        },
      );

      // 3. Suporte ventilatório (distribuição) — gráfico de rosca
      sectionTitle('Suporte Ventilatório — Distribuição por Modalidade');
      drawDonutWithLegend(ventWithPct, 'pacientes');

      // 4. Ocupação de leitos — gráfico de rosca
      sectionTitle('Ocupação de Leitos');
      drawDonutWithLegend(bedWithPct.map(d => ({ ...d, pct: d.pct })), 'leitos');

      // 5. Tendência semanal — gráfico de barras
      sectionTitle('Tendência Semanal — Últimos 7 Dias');
      drawWeeklyBarChart();

      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        if (i > 1) drawHeader();
        drawFooter(i, totalPages);
      }

      pdf.save(`relatorio-uti-ped_${fileDate}_${turno || 'turno'}.pdf`);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <section className="p-4 sm:p-6 space-y-6">

      {/* ── Topo ── */}
      <div className="flex justify-end">
        <button
          onClick={handleExportPdf}
          disabled={exportingPdf}
          className="flex items-center gap-2 text-xs font-semibold bg-clinical-500 hover:bg-clinical-600 disabled:opacity-60 text-white px-3 py-2 rounded-xl shadow-sm transition"
        >
          <FileDown size={14} /> {exportingPdf ? 'Gerando PDF...' : 'Exportar PDF'}
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Cenário Atual */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm dark:shadow-none transition-colors duration-300">
          <h2 className="text-xs font-bold uppercase tracking-wider text-clinical-600 dark:text-clinical-400 flex items-center gap-2 mb-4">
            <i className="fa-solid fa-chart-pie"></i> Cenário Atual da UTI PED
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center transition-colors">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Total de Leitos</span>
              <span className="text-4xl font-extrabold text-slate-800 dark:text-white font-mono">{TOTAL_BEDS}</span>
            </div>
            <div
              onClick={() => setCurrentView('bedside')}
              className="bg-clinical-50 dark:bg-clinical-950/40 hover:bg-clinical-100 dark:hover:bg-clinical-950/80 border border-clinical-200 dark:border-clinical-500/40 p-4 rounded-xl text-center cursor-pointer transition relative group"
            >
              <span className="text-[11px] text-clinical-600 dark:text-clinical-300 block mb-1">
                Leitos Ocupados <i className="fa-solid fa-magnifying-glass text-[9px] ml-1"></i>
              </span>
              <span className="text-4xl font-extrabold text-clinical-600 dark:text-clinical-400 font-mono">{occupied}</span>
              <div className="mt-2 w-full h-1 bg-clinical-100 dark:bg-clinical-900/40 rounded-full overflow-hidden">
                <div className="h-full bg-clinical-500 rounded-full transition-all" style={{ width: `${occupancyPct}%` }}></div>
              </div>
              <span className="text-[9px] text-clinical-500 dark:text-clinical-400 mt-0.5 block">{occupancyPct}% ocupação</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 p-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Vagos</span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{vacant}</span>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 p-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Em VM</span>
              <span className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono">{PATIENTS.filter(p => p.vm).length}</span>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Prog. Alta</span>
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">{progExtub}</span>
            </div>
          </div>

          {alertPatient && (
            <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/30 p-3 rounded-xl flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm shrink-0">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                </span>
                <div>
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Alerta Ventilatório Ativo</span>
                  <p className="text-xs text-slate-600 dark:text-slate-200 mt-0.5">
                    Leito {alertPatient.id}: {alertPatient.diagnostico}. {alertPatient.status === 'Crítico' ? 'Paciente em estado crítico.' : 'Requer atenção.'}
                  </p>
                </div>
              </div>
            </div>
          )}
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
                  <span className={`text-2xl font-extrabold font-mono block text-center ${isSpecial
                    ? 'text-clinical-700 dark:text-clinical-300'
                    : item.val === 0 ? 'text-slate-300 dark:text-slate-700' : 'text-clinical-700 dark:text-clinical-400'
                  }`}>{item.val}</span>
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
          <p className="text-[10px] text-slate-400 mb-3">Status dos {TOTAL_BEDS} leitos da UTI PED</p>

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
            <DonutCenter value={TOTAL_BEDS} title="leitos" sub={`${occupancyPct}% ocupação`} />
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
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{d.value}/{TOTAL_BEDS}</span>
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
              <input type="text" placeholder="Ex: Leito 02 e 07" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-xl p-3 text-slate-800 dark:text-white font-semibold focus:outline-none focus:border-clinical-500 transition-colors" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1">Registro O₂</label>
              <input type="text" placeholder="Ex: 2002" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-xl p-3 text-slate-800 dark:text-white font-mono font-bold focus:outline-none focus:border-clinical-500 transition-colors" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-none transition-colors duration-300">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">Pacientes em Risco Ventilatório?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">Critérios: ↑ IO | ↓ PF | Necessidade de ↑ PV | ↑ trabalho resp.</p>
          </div>
          {atRisk.length > 0 ? (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 p-3 rounded-xl flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm shrink-0">
                <i className="fa-solid fa-gauge-high"></i>
              </span>
              <div>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">
                  {atRisk.length} Paciente{atRisk.length !== 1 ? 's' : ''} no Radar
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                  {atRisk.map(p => `Leito ${p.id} (${p.status})`).join(' · ')}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 p-3 rounded-xl flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm shrink-0">
                <i className="fa-solid fa-circle-check"></i>
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Nenhum paciente em risco</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
