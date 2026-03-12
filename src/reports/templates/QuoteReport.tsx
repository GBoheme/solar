import { Sun, Battery, Zap } from 'lucide-react';
import {
  ReportLayout,
  ReportHeader,
  ReportFooter,
  ReportMetaBlock,
  ReportSection,
  PrintTable,
  ReportTerms,
  ReportSummary,
} from '../components';
import { formatReportDate, generateReportRef, systemTypeLabels } from '../utils/reportHelpers';
import type { MetaColumn } from '../components/ReportMetaBlock';
import type { PrintTableColumn, PrintTableRow } from '../components/PrintTable';
import type { WarrantyEntry } from '../components/ReportTerms';
import type { SummaryLine } from '../components/ReportSummary';

/* ─── Data contract ─── */
export interface QuoteReportData {
  customerName: string;
  customerPhone?: string;
  systemType: string;
  systemVoltage: number;
  regionName?: string;
  totalDailyKwh: string;
  peakLoadKw: string;
  autonomyHours: number;

  panels: { model: string; count: number; unitPrice: number; total: number };
  batteries: { model: string; count: number; unitPrice: number; total: number };
  inverter: { model: string; unitPrice: number; total: number };

  accessoriesCost: number;
  installationCost: number;
  hardwareTotal: number;
  discount: number;
  grandTotal: number;

  warranty: WarrantyEntry[];

  /** Currency formatter from useCurrencyStore */
  formatPrice: (v: number) => string;

  /** Optional overrides */
  quoteRef?: string;
  date?: string;
}

interface QuoteReportProps {
  data: QuoteReportData;
  /** When true, component is hidden on screen and shown only for print */
  printOnly?: boolean;
}

/**
 * Reusable A4 quote / offer report template.
 * Composed entirely from shared report primitives.
 */
export default function QuoteReport({ data, printOnly }: QuoteReportProps) {
  const d = data;
  const refNumber = d.quoteRef ?? generateReportRef('QT');
  const date = d.date ?? formatReportDate();

  /* ── Meta columns ── */
  const metaColumns: MetaColumn[] = [
    {
      heading: 'معلومات العميل',
      rows: [
        { label: '', value: <span className="font-bold text-sm">{d.customerName}</span> },
        ...(d.customerPhone ? [{ label: '', value: <span className="text-slate-500 text-xs font-mono dir-ltr text-right">{d.customerPhone}</span> }] : []),
      ],
    },
    {
      heading: 'تفاصيل النظام',
      rows: [
        { label: 'النوع:', value: systemTypeLabels[d.systemType] ?? d.systemType },
        { label: 'الجهد:', value: <span className="font-mono">{d.systemVoltage}V</span> },
        ...(d.regionName ? [{ label: 'الموقع:', value: d.regionName }] : []),
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

  /* ── BOM table ── */
  const bomColumns: PrintTableColumn[] = [
    { key: 'num', header: '#', width: 'w-8', align: 'text-center' },
    { key: 'category', header: 'الصنف', width: 'w-32' },
    { key: 'spec', header: 'المواصفات / الموديل' },
    { key: 'qty', header: 'العدد', width: 'w-12', align: 'text-center' },
    { key: 'unit', header: 'ع.مفرد', width: 'w-20' },
    { key: 'total', header: 'الإجمالي', width: 'w-24' },
  ];

  const bomRows: PrintTableRow[] = [];
  let rowNum = 1;

  if (d.panels.count > 0) {
    bomRows.push({
      num: <span className="text-slate-400">{rowNum++}</span>,
      category: <span className="font-bold text-slate-800 flex items-center gap-1.5"><Sun className="w-3.5 h-3.5 text-amber-500" /> الواح</span>,
      spec: <span className="text-slate-600 truncate max-w-[150px] block">{d.panels.model}</span>,
      qty: <span className="font-mono font-bold">{d.panels.count}</span>,
      unit: <span className="font-mono">{d.formatPrice(d.panels.unitPrice)}</span>,
      total: <span className="font-mono font-bold text-slate-800">{d.formatPrice(d.panels.total)}</span>,
    });
  }

  if (d.batteries.count > 0) {
    bomRows.push({
      num: <span className="text-slate-400">{rowNum++}</span>,
      category: <span className="font-bold text-slate-800 flex items-center gap-1.5"><Battery className="w-3.5 h-3.5 text-emerald-500" /> بطاريات</span>,
      spec: <span className="text-slate-600 truncate max-w-[150px] block">{d.batteries.model}</span>,
      qty: <span className="font-mono font-bold">{d.batteries.count}</span>,
      unit: <span className="font-mono">{d.formatPrice(d.batteries.unitPrice)}</span>,
      total: <span className="font-mono font-bold text-slate-800">{d.formatPrice(d.batteries.total)}</span>,
    });
  }

  bomRows.push({
    num: <span className="text-slate-400">{rowNum++}</span>,
    category: <span className="font-bold text-slate-800 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-blue-500" /> انفرتر</span>,
    spec: <span className="text-slate-600 truncate max-w-[150px] block">{d.inverter.model}</span>,
    qty: <span className="font-mono font-bold">1</span>,
    unit: <span className="font-mono">{d.formatPrice(d.inverter.unitPrice)}</span>,
    total: <span className="font-mono font-bold text-slate-800">{d.formatPrice(d.inverter.total)}</span>,
  });

  bomRows.push({
    num: <span className="text-slate-400">{rowNum++}</span>,
    category: <span className="font-bold text-slate-800">ملحقات</span>,
    spec: <span className="text-slate-500 text-[10px]">قواطع حماية، كابلات، هياكل تثبيت، مؤرض</span>,
    qty: <span className="font-mono">—</span>,
    unit: <span className="font-mono text-slate-400">-</span>,
    total: <span className="font-mono font-bold text-slate-800">{d.formatPrice(Math.round(d.accessoriesCost))}</span>,
  });

  bomRows.push({
    num: <span className="text-slate-400">{rowNum++}</span>,
    category: <span className="font-bold text-slate-800">أجور عمل</span>,
    spec: <span className="text-slate-500 text-[10px]">نقل، تركيب، تشغيل وبرمجة النظام</span>,
    qty: <span className="font-mono">—</span>,
    unit: <span className="font-mono text-slate-400">-</span>,
    total: <span className="font-mono font-bold text-slate-800">{d.formatPrice(Math.round(d.installationCost))}</span>,
  });

  /* ── Summary lines ── */
  const summaryLines: SummaryLine[] = [
    { label: 'مجموع المعدات:', value: d.formatPrice(Math.round(d.hardwareTotal)) },
    { label: 'ملحقات وتركيب:', value: d.formatPrice(Math.round(d.accessoriesCost + d.installationCost)) },
  ];

  if (d.discount > 0) {
    summaryLines.push({
      label: 'خصم خاص:',
      value: `-${d.formatPrice(d.discount)}`,
      bold: true,
      colorClass: 'text-emerald-600',
      separator: true,
    });
  }

  return (
    <ReportLayout printOnly={printOnly}>
      <ReportHeader
        title="عرض سعر فني"
        refNumber={refNumber}
        date={date}
        refLabel="رقم العرض"
      />

      <div className="px-8 py-5 flex-1 flex flex-col">
        <ReportMetaBlock columns={metaColumns} />

        <ReportSection title="قائمة المعدات الفنية" className="flex-1">
          <PrintTable columns={bomColumns} rows={bomRows} />
        </ReportSection>

        {/* Bottom: Terms + Totals */}
        <div className="flex gap-6 mt-6 shrink-0">
          <ReportTerms warranties={d.warranty} />
          <ReportSummary
            lines={summaryLines}
            totalValue={d.formatPrice(Math.round(d.grandTotal))}
          />
        </div>
      </div>

      <ReportFooter />
    </ReportLayout>
  );
}
