import {
  ReportLayout,
  ReportHeader,
  ReportFooter,
  ReportMetaBlock,
  ReportSection,
  PrintTable,
  ReportTerms,
  ReportSummary,
  SignatureBlock,
} from '../components';
import { Sun, Battery, Zap } from 'lucide-react';
import { formatReportDate, generateReportRef, systemTypeLabels } from '../utils/reportHelpers';
import type { MetaColumn } from '../components/ReportMetaBlock';
import type { PrintTableColumn, PrintTableRow } from '../components/PrintTable';
import type { SummaryLine } from '../components/ReportSummary';

/* ─── Data contract ─── */
export interface ProjectReportData {
  projectName: string;
  customerName: string;
  customerPhone?: string;
  regionName?: string;
  systemType: string;
  systemVoltage: number;
  totalDailyKwh: string;
  peakLoadKw: string;
  autonomyHours: number;
  sunHours?: number;

  appliances: Array<{
    name: string;
    watts: number;
    quantity: number;
    hoursDaily: number;
    dailyWh: number;
  }>;

  panels: { model: string; count: number; total: number };
  batteries: { model: string; count: number; total: number };
  inverter: { model: string; total: number };
  accessoriesCost: number;
  installationCost: number;
  grandTotal: number;

  formatPrice: (v: number) => string;
}

interface ProjectReportProps {
  data: ProjectReportData;
  printOnly?: boolean;
}

/**
 * Project summary report.
 * Shows load profile, system design, BOM, and cost summary.
 * Includes a signature block for formal project handover.
 */
export default function ProjectReport({ data, printOnly }: ProjectReportProps) {
  const d = data;
  const refNumber = generateReportRef('PRJ');
  const date = formatReportDate();

  const metaColumns: MetaColumn[] = [
    {
      heading: 'معلومات المشروع',
      rows: [
        { label: 'اسم المشروع:', value: <span className="font-bold text-sm">{d.projectName}</span> },
        { label: 'العميل:', value: d.customerName },
        ...(d.customerPhone ? [{ label: 'الهاتف:', value: <span className="font-mono">{d.customerPhone}</span> }] : []),
      ],
    },
    {
      heading: 'تفاصيل النظام',
      rows: [
        { label: 'النوع:', value: systemTypeLabels[d.systemType] ?? d.systemType },
        { label: 'الجهد:', value: <span className="font-mono">{d.systemVoltage}V</span> },
        ...(d.regionName ? [{ label: 'الموقع:', value: d.regionName }] : []),
        ...(d.sunHours ? [{ label: 'ساعات الشمس:', value: <span className="font-mono">{d.sunHours} hrs</span> }] : []),
      ],
    },
    {
      heading: 'الأحمال المتوقعة',
      rows: [
        { label: 'استهلاك يومي:', value: <span className="font-mono">{d.totalDailyKwh} kWh</span> },
        { label: 'ذروة الحمل:', value: <span className="font-mono">{d.peakLoadKw} kW</span> },
        { label: 'الاستقلالية:', value: <span className="font-mono">{d.autonomyHours} hrs</span> },
      ],
    },
  ];

  /* ── Appliance load table ── */
  const loadColumns: PrintTableColumn[] = [
    { key: 'num', header: '#', width: 'w-8', align: 'text-center' },
    { key: 'name', header: 'الجهاز' },
    { key: 'watts', header: 'الاستطاعة (W)', width: 'w-24', align: 'text-center' },
    { key: 'qty', header: 'العدد', width: 'w-12', align: 'text-center' },
    { key: 'hours', header: 'ساعات/يوم', width: 'w-20', align: 'text-center' },
    { key: 'daily', header: 'يومي (Wh)', width: 'w-24', align: 'text-center' },
  ];

  const loadRows: PrintTableRow[] = d.appliances.map((a, i) => ({
    num: <span className="text-slate-400">{i + 1}</span>,
    name: <span className="font-bold text-slate-800">{a.name}</span>,
    watts: <span className="font-mono">{a.watts}</span>,
    qty: <span className="font-mono font-bold">{a.quantity}</span>,
    hours: <span className="font-mono">{a.hoursDaily}</span>,
    daily: <span className="font-mono font-bold">{a.dailyWh.toLocaleString()}</span>,
  }));

  /* ── BOM table ── */
  const bomColumns: PrintTableColumn[] = [
    { key: 'num', header: '#', width: 'w-8', align: 'text-center' },
    { key: 'category', header: 'الصنف', width: 'w-32' },
    { key: 'spec', header: 'المواصفات / الموديل' },
    { key: 'qty', header: 'العدد', width: 'w-12', align: 'text-center' },
    { key: 'total', header: 'الإجمالي', width: 'w-24' },
  ];

  const bomRows: PrintTableRow[] = [];
  let n = 1;

  if (d.panels.count > 0) {
    bomRows.push({
      num: <span className="text-slate-400">{n++}</span>,
      category: <span className="font-bold text-slate-800 flex items-center gap-1.5"><Sun className="w-3.5 h-3.5 text-amber-500" /> الواح</span>,
      spec: <span className="text-slate-600">{d.panels.model}</span>,
      qty: <span className="font-mono font-bold">{d.panels.count}</span>,
      total: <span className="font-mono font-bold text-slate-800">{d.formatPrice(d.panels.total)}</span>,
    });
  }
  if (d.batteries.count > 0) {
    bomRows.push({
      num: <span className="text-slate-400">{n++}</span>,
      category: <span className="font-bold text-slate-800 flex items-center gap-1.5"><Battery className="w-3.5 h-3.5 text-emerald-500" /> بطاريات</span>,
      spec: <span className="text-slate-600">{d.batteries.model}</span>,
      qty: <span className="font-mono font-bold">{d.batteries.count}</span>,
      total: <span className="font-mono font-bold text-slate-800">{d.formatPrice(d.batteries.total)}</span>,
    });
  }
  bomRows.push({
    num: <span className="text-slate-400">{n++}</span>,
    category: <span className="font-bold text-slate-800 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-blue-500" /> انفرتر</span>,
    spec: <span className="text-slate-600">{d.inverter.model}</span>,
    qty: <span className="font-mono font-bold">1</span>,
    total: <span className="font-mono font-bold text-slate-800">{d.formatPrice(d.inverter.total)}</span>,
  });

  const summaryLines: SummaryLine[] = [
    { label: 'ملحقات:', value: d.formatPrice(Math.round(d.accessoriesCost)) },
    { label: 'أجور تركيب:', value: d.formatPrice(Math.round(d.installationCost)) },
  ];

  return (
    <ReportLayout printOnly={printOnly}>
      <ReportHeader
        title="ملخص المشروع"
        refNumber={refNumber}
        date={date}
        refLabel="رقم التقرير"
      />

      <div className="px-8 py-5 flex-1 flex flex-col">
        <ReportMetaBlock columns={metaColumns} />

        {d.appliances.length > 0 && (
          <ReportSection title="جدول الأحمال الكهربائية" className="mb-5">
            <PrintTable columns={loadColumns} rows={loadRows} />
          </ReportSection>
        )}

        <ReportSection title="المعدات المحددة" className="mb-5">
          <PrintTable columns={bomColumns} rows={bomRows} />
        </ReportSection>

        <div className="flex gap-6 mt-auto shrink-0">
          <ReportTerms />
          <ReportSummary
            lines={summaryLines}
            totalValue={d.formatPrice(Math.round(d.grandTotal))}
          />
        </div>

        <SignatureBlock />
      </div>

      <ReportFooter />
    </ReportLayout>
  );
}
