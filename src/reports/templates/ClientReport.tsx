import {
  ReportLayout,
  ReportHeader,
  ReportFooter,
  ReportMetaBlock,
  ReportSection,
  PrintTable,
} from '../components';
import { formatReportDate, generateReportRef, quoteStatusLabels } from '../utils/reportHelpers';
import type { MetaColumn } from '../components/ReportMetaBlock';
import type { PrintTableColumn, PrintTableRow } from '../components/PrintTable';

/* ─── Data contract ─── */
export interface ClientReportData {
  client: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    notes?: string;
  };
  stats: {
    quotesCount: number;
    projectsCount: number;
    totalRevenue: number;
  };
  quotes: Array<{
    quote_number: string;
    total_selling_price: number;
    status: string;
    created_at: string;
  }>;
  projects: Array<{
    name: string;
    status: string;
    created_at: string;
  }>;
  formatPrice: (v: number) => string;
}

interface ClientReportProps {
  data: ClientReportData;
  printOnly?: boolean;
}

/**
 * Client summary report template.
 * Shows client info, statistics, quote history, and project history.
 */
export default function ClientReport({ data, printOnly }: ClientReportProps) {
  const { client, stats, quotes, projects, formatPrice } = data;
  const refNumber = generateReportRef('CL');
  const date = formatReportDate();

  const metaColumns: MetaColumn[] = [
    {
      heading: 'بيانات العميل',
      rows: [
        { label: 'الاسم:', value: <span className="font-bold text-sm">{client.name}</span> },
        ...(client.phone ? [{ label: 'الهاتف:', value: <span className="font-mono">{client.phone}</span> }] : []),
        ...(client.email ? [{ label: 'البريد:', value: client.email }] : []),
      ],
    },
    {
      heading: 'العنوان',
      rows: [
        ...(client.city ? [{ label: 'المدينة:', value: client.city }] : []),
        ...(client.address ? [{ label: 'العنوان:', value: client.address }] : []),
      ],
    },
    {
      heading: 'ملخص النشاط',
      rows: [
        { label: 'عدد العروض:', value: <span className="font-mono font-bold">{stats.quotesCount}</span> },
        { label: 'عدد المشاريع:', value: <span className="font-mono font-bold">{stats.projectsCount}</span> },
        { label: 'إجمالي الإيرادات:', value: <span className="font-mono font-bold">{formatPrice(stats.totalRevenue)}</span> },
      ],
    },
  ];

  const quoteColumns: PrintTableColumn[] = [
    { key: 'num', header: '#', width: 'w-8', align: 'text-center' },
    { key: 'ref', header: 'رقم العرض', width: 'w-28' },
    { key: 'amount', header: 'المبلغ', width: 'w-28' },
    { key: 'status', header: 'الحالة', width: 'w-20', align: 'text-center' },
    { key: 'date', header: 'التاريخ', width: 'w-24' },
  ];

  const quoteRows: PrintTableRow[] = quotes.map((q, i) => ({
    num: <span className="text-slate-400">{i + 1}</span>,
    ref: <span className="font-mono text-slate-800">{q.quote_number}</span>,
    amount: <span className="font-mono font-bold text-slate-800">{formatPrice(q.total_selling_price)}</span>,
    status: <span className="text-xs">{quoteStatusLabels[q.status] ?? q.status}</span>,
    date: <span className="font-mono text-slate-500">{formatReportDate(q.created_at)}</span>,
  }));

  const projectColumns: PrintTableColumn[] = [
    { key: 'num', header: '#', width: 'w-8', align: 'text-center' },
    { key: 'name', header: 'اسم المشروع' },
    { key: 'status', header: 'الحالة', width: 'w-24', align: 'text-center' },
    { key: 'date', header: 'التاريخ', width: 'w-24' },
  ];

  const projectRows: PrintTableRow[] = projects.map((p, i) => ({
    num: <span className="text-slate-400">{i + 1}</span>,
    name: <span className="font-bold text-slate-800">{p.name}</span>,
    status: <span className="text-xs">{p.status}</span>,
    date: <span className="font-mono text-slate-500">{formatReportDate(p.created_at)}</span>,
  }));

  return (
    <ReportLayout printOnly={printOnly}>
      <ReportHeader
        title="تقرير العميل"
        refNumber={refNumber}
        date={date}
        refLabel="رقم التقرير"
      />

      <div className="px-8 py-5 flex-1 flex flex-col">
        <ReportMetaBlock columns={metaColumns} />

        {client.notes && (
          <div className="report-section-bg bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 text-xs text-slate-600 print-avoid-break">
            <span className="font-bold text-slate-800">ملاحظات: </span>{client.notes}
          </div>
        )}

        {quotes.length > 0 && (
          <ReportSection title="سجل عروض الأسعار" className="mb-5">
            <PrintTable columns={quoteColumns} rows={quoteRows} />
          </ReportSection>
        )}

        {projects.length > 0 && (
          <ReportSection title="سجل المشاريع">
            <PrintTable columns={projectColumns} rows={projectRows} />
          </ReportSection>
        )}
      </div>

      <ReportFooter />
    </ReportLayout>
  );
}
