import {
  ReportLayout,
  ReportHeader,
  ReportFooter,
  ReportSection,
  PrintTable,
} from '../components';
import { formatReportDate, generateReportRef } from '../utils/reportHelpers';
import type { PrintTableColumn, PrintTableRow } from '../components/PrintTable';

/* ─── Data contract ─── */
export interface AnalyticsReportData {
  kpis: Array<{ label: string; value: string }>;
  monthlyRevenue: Array<{ month: string; revenue: number; profit: number; count: number }>;
  quotesByStatus: Array<{ status: string; count: number }>;
  formatPrice: (v: number) => string;
}

interface AnalyticsReportProps {
  data: AnalyticsReportData;
  printOnly?: boolean;
}

/**
 * Analytics summary report.
 * KPIs + monthly revenue table + quote status breakdown.
 * Charts are NOT printed (SVG rendering is unreliable in print);
 * instead, data is presented in clean tabular form.
 */
export default function AnalyticsReport({ data, printOnly }: AnalyticsReportProps) {
  const { kpis, monthlyRevenue, quotesByStatus, formatPrice } = data;
  const refNumber = generateReportRef('AN');
  const date = formatReportDate();

  /* ── KPI grid ── */
  const kpiSection = (
    <div className="report-section-bg bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 grid grid-cols-4 gap-4 shrink-0 print-avoid-break">
      {kpis.map((kpi, i) => (
        <div key={i} className="text-center">
          <p className="text-xs text-slate-400 mb-1">{kpi.label}</p>
          <p className="text-lg font-black text-slate-800 font-mono" dir="ltr">{kpi.value}</p>
        </div>
      ))}
    </div>
  );

  /* ── Monthly revenue table ── */
  const revenueColumns: PrintTableColumn[] = [
    { key: 'month', header: 'الشهر', width: 'w-28' },
    { key: 'revenue', header: 'الإيرادات', width: 'w-28' },
    { key: 'profit', header: 'الأرباح', width: 'w-28' },
    { key: 'count', header: 'عدد العروض', width: 'w-20', align: 'text-center' },
  ];

  const revenueRows: PrintTableRow[] = monthlyRevenue.map(m => ({
    month: <span className="font-bold text-slate-800">{m.month}</span>,
    revenue: <span className="font-mono">{formatPrice(m.revenue)}</span>,
    profit: <span className="font-mono text-emerald-700">{formatPrice(m.profit)}</span>,
    count: <span className="font-mono font-bold">{m.count}</span>,
  }));

  /* ── Quote status table ── */
  const statusColumns: PrintTableColumn[] = [
    { key: 'status', header: 'الحالة' },
    { key: 'count', header: 'العدد', width: 'w-20', align: 'text-center' },
  ];

  const statusRows: PrintTableRow[] = quotesByStatus.map(s => ({
    status: <span className="font-bold text-slate-800">{s.status || 'مسودة'}</span>,
    count: <span className="font-mono font-bold">{s.count}</span>,
  }));

  return (
    <ReportLayout printOnly={printOnly}>
      <ReportHeader
        title="تقرير التحليلات"
        refNumber={refNumber}
        date={date}
        refLabel="رقم التقرير"
      />

      <div className="px-8 py-5 flex-1 flex flex-col">
        {kpiSection}

        <ReportSection title="الإيرادات الشهرية" className="mb-6">
          <PrintTable columns={revenueColumns} rows={revenueRows} />
        </ReportSection>

        <ReportSection title="توزيع حالات العروض">
          <PrintTable columns={statusColumns} rows={statusRows} />
        </ReportSection>
      </div>

      <ReportFooter />
    </ReportLayout>
  );
}
