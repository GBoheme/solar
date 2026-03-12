import {
  ReportLayout,
  ReportHeader,
  ReportFooter,
  ReportSection,
  PrintTable,
} from '../components';
import { formatReportDate, generateReportRef, quoteStatusLabels } from '../utils/reportHelpers';
import type { PrintTableColumn, PrintTableRow } from '../components/PrintTable';

/* ─── Data contract (matches Dashboard's DashboardStats) ─── */
export interface DashboardReportData {
  counts: { projects: number; quotes: number; clients: number; components: number };
  financial: {
    total_revenue: number;
    total_cost: number;
    total_profit: number;
    avg_margin_pct: number;
    exchange_rate: number;
    default_margin: number;
  };
  quotesByStatus: Array<{ status: string; count: number }>;
  recentQuotes: Array<{
    customer_name: string;
    quote_number: string;
    total_selling_price: number;
    status: string;
  }>;
  recentClients: Array<{
    name: string;
    city?: string;
    quotes_count: number;
  }>;
  monthlyRevenue: Array<{ month: string; revenue: number; profit: number; count: number }>;
  formatPrice: (v: number) => string;
}

interface DashboardReportProps {
  data: DashboardReportData;
  printOnly?: boolean;
}

/**
 * Dashboard snapshot report for printing.
 * Replaces the inline window.print() approach with a structured A4 report.
 * KPIs + revenue table + recent quotes + recent clients.
 */
export default function DashboardReport({ data, printOnly }: DashboardReportProps) {
  const d = data;
  const refNumber = generateReportRef('DSH');
  const date = formatReportDate();

  /* ── KPI summary grid ── */
  const kpis = [
    { label: 'إجمالي الإيرادات', value: d.formatPrice(d.financial.total_revenue) },
    { label: 'صافي الأرباح', value: d.formatPrice(d.financial.total_profit) },
    { label: 'متوسط الهامش', value: `${d.financial.avg_margin_pct}%` },
    { label: 'المشاريع', value: String(d.counts.projects) },
    { label: 'عروض الأسعار', value: String(d.counts.quotes) },
    { label: 'العملاء', value: String(d.counts.clients) },
    { label: 'سعر الصرف', value: `${d.financial.exchange_rate.toLocaleString()} IQD` },
    { label: 'الهامش الافتراضي', value: `${d.financial.default_margin}%` },
  ];

  /* ── Revenue table ── */
  const revCols: PrintTableColumn[] = [
    { key: 'month', header: 'الشهر' },
    { key: 'revenue', header: 'الإيرادات', width: 'w-28' },
    { key: 'profit', header: 'الأرباح', width: 'w-28' },
    { key: 'count', header: 'عدد العروض', width: 'w-20', align: 'text-center' },
  ];
  const revRows: PrintTableRow[] = d.monthlyRevenue.map(m => ({
    month: <span className="font-bold">{m.month}</span>,
    revenue: <span className="font-mono">{d.formatPrice(m.revenue)}</span>,
    profit: <span className="font-mono text-emerald-700">{d.formatPrice(m.profit)}</span>,
    count: <span className="font-mono font-bold">{m.count}</span>,
  }));

  /* ── Recent quotes table ── */
  const quoteCols: PrintTableColumn[] = [
    { key: 'num', header: '#', width: 'w-8', align: 'text-center' },
    { key: 'customer', header: 'العميل' },
    { key: 'ref', header: 'الرقم', width: 'w-24' },
    { key: 'amount', header: 'المبلغ', width: 'w-24' },
    { key: 'status', header: 'الحالة', width: 'w-20', align: 'text-center' },
  ];
  const quoteRows: PrintTableRow[] = d.recentQuotes.map((q, i) => ({
    num: <span className="text-slate-400">{i + 1}</span>,
    customer: <span className="font-bold text-slate-800">{q.customer_name}</span>,
    ref: <span className="font-mono text-xs">{q.quote_number}</span>,
    amount: <span className="font-mono font-bold">{d.formatPrice(q.total_selling_price)}</span>,
    status: <span className="text-xs">{quoteStatusLabels[q.status] ?? q.status}</span>,
  }));

  /* ── Recent clients table ── */
  const clientCols: PrintTableColumn[] = [
    { key: 'num', header: '#', width: 'w-8', align: 'text-center' },
    { key: 'name', header: 'الاسم' },
    { key: 'city', header: 'المدينة', width: 'w-28' },
    { key: 'quotes', header: 'العروض', width: 'w-16', align: 'text-center' },
  ];
  const clientRows: PrintTableRow[] = d.recentClients.map((c, i) => ({
    num: <span className="text-slate-400">{i + 1}</span>,
    name: <span className="font-bold text-slate-800">{c.name}</span>,
    city: <span className="text-slate-600">{c.city || '—'}</span>,
    quotes: <span className="font-mono font-bold">{c.quotes_count}</span>,
  }));

  return (
    <ReportLayout printOnly={printOnly}>
      <ReportHeader
        title="تقرير لوحة التحكم"
        refNumber={refNumber}
        date={date}
        refLabel="رقم التقرير"
      />

      <div className="px-8 py-5 flex-1 flex flex-col">
        {/* KPI Grid */}
        <div className="report-section-bg bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 grid grid-cols-4 gap-4 shrink-0 print-avoid-break">
          {kpis.map((kpi, i) => (
            <div key={i} className="text-center">
              <p className="text-[10px] text-slate-400 mb-1">{kpi.label}</p>
              <p className="text-sm font-black text-slate-800 font-mono" dir="ltr">{kpi.value}</p>
            </div>
          ))}
        </div>

        {d.monthlyRevenue.length > 0 && (
          <ReportSection title="الإيرادات الشهرية" className="mb-5">
            <PrintTable columns={revCols} rows={revRows} />
          </ReportSection>
        )}

        <div className="grid grid-cols-2 gap-6">
          {d.recentQuotes.length > 0 && (
            <ReportSection title="أحدث العروض">
              <PrintTable columns={quoteCols} rows={quoteRows} />
            </ReportSection>
          )}
          {d.recentClients.length > 0 && (
            <ReportSection title="أحدث العملاء">
              <PrintTable columns={clientCols} rows={clientRows} />
            </ReportSection>
          )}
        </div>
      </div>

      <ReportFooter />
    </ReportLayout>
  );
}
