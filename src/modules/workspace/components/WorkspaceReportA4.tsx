import { useWorkspaceStore } from '../../../store/workspaceStore';
import { useCurrencyStore } from '../../../store/currencyStore';
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
} from '../../../reports/components';
import { formatReportDate, generateReportRef, systemTypeLabels } from '../../../reports/utils/reportHelpers';
import type { MetaColumn } from '../../../reports/components/ReportMetaBlock';
import type { PrintTableColumn, PrintTableRow } from '../../../reports/components/PrintTable';
import type { SummaryLine } from '../../../reports/components/ReportSummary';

export default function WorkspaceReportA4() {
  const { config, result, loads } = useWorkspaceStore();
  const { formatPrice } = useCurrencyStore();

  if (!result || !result.engineering || !result.pricing) {
    return null;
  }

  const eng = result.engineering;
  const pricing = result.pricing;
  const recommendation = result.recommendation;

  const selectedPanelModel = recommendation?.panels?.item
    ? `${recommendation.panels.item.brand} - ${recommendation.panels.item.model}`
    : 'لوح شمسي';
  const selectedBatteryModel = recommendation?.batteries?.item
    ? `${recommendation.batteries.item.brand} - ${recommendation.batteries.item.model}`
    : 'بطاريات تخزين';
  const selectedInverterModel = recommendation?.inverter?.item
    ? `${recommendation.inverter.item.brand} - ${recommendation.inverter.item.model}`
    : 'إنفرتر شمسي';

  const totalDailyKwh = (
    loads.reduce((sum, load) => sum + load.watts * load.quantity * load.hoursDaily, 0) / 1000
  ).toFixed(1);

  const refNumber = generateReportRef('WS');
  const date = formatReportDate();

  const metaColumns: MetaColumn[] = [
    {
      heading: 'العميل',
      rows: [
        { label: '', value: <span className="font-bold text-sm">زبون مساحة العمل</span> },
        { label: '', value: <span className="text-slate-500 text-[10px]">تحديد الحسابات المتقدمة</span> },
      ],
    },
    {
      heading: 'تفاصيل النظام',
      rows: [
        { label: 'النوع:', value: systemTypeLabels[config.systemType] ?? config.systemType },
        { label: 'فولتية النظام:', value: <span className="font-mono">{eng.system_voltage}V</span> },
      ],
    },
    {
      heading: 'الأحمال المتوقعة',
      rows: [
        { label: 'استهلاك يومي:', value: <span className="font-mono">{totalDailyKwh} kWh</span> },
        { label: 'ذروة الحمل:', value: <span className="font-mono">{(eng.peak_continuous_w / 1000).toFixed(1)} kW</span> },
        { label: 'الاستقلالية:', value: <span className="font-mono">{config.autonomyHours} hrs</span> },
      ],
    },
  ];

  const bomColumns: PrintTableColumn[] = [
    { key: 'num', header: '#', width: 'w-8', align: 'text-center' },
    { key: 'category', header: 'الصنف', width: 'w-32' },
    { key: 'spec', header: 'المواصفات / الموديل' },
    { key: 'qty', header: 'العدد', width: 'w-12', align: 'text-center' },
    { key: 'total', header: 'الإجمالي', width: 'w-24' },
  ];

  const bomRows: PrintTableRow[] = [];
  let n = 1;

  if (eng.panel_strings?.total_panels > 0) {
    bomRows.push({
      num: <span className="text-slate-400">{n++}</span>,
      category: <span className="font-bold text-slate-800 flex items-center gap-1.5"><Sun className="w-3.5 h-3.5 text-amber-500" /> الواح</span>,
      spec: <span className="text-slate-600 truncate max-w-[200px] block">{selectedPanelModel}</span>,
      qty: <span className="font-mono font-bold">{eng.panel_strings.total_panels}</span>,
      total: <span className="font-mono font-bold text-slate-800">{formatPrice(pricing.panels_cost)}</span>,
    });
  }
  if (eng.battery_bank?.total_battery_count > 0) {
    bomRows.push({
      num: <span className="text-slate-400">{n++}</span>,
      category: <span className="font-bold text-slate-800 flex items-center gap-1.5"><Battery className="w-3.5 h-3.5 text-emerald-500" /> بطاريات</span>,
      spec: <span className="text-slate-600 truncate max-w-[200px] block">{selectedBatteryModel}</span>,
      qty: <span className="font-mono font-bold">{eng.battery_bank.total_battery_count}</span>,
      total: <span className="font-mono font-bold text-slate-800">{formatPrice(pricing.batteries_cost)}</span>,
    });
  }
  bomRows.push({
    num: <span className="text-slate-400">{n++}</span>,
    category: <span className="font-bold text-slate-800 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-blue-500" /> انفرتر</span>,
    spec: <span className="text-slate-600 truncate max-w-[200px] block">{selectedInverterModel}</span>,
    qty: <span className="font-mono font-bold">1</span>,
    total: <span className="font-mono font-bold text-slate-800">{formatPrice(pricing.inverter_cost)}</span>,
  });
  bomRows.push({
    num: <span className="text-slate-400">{n++}</span>,
    category: <span className="font-bold text-slate-800">ملحقات</span>,
    spec: <span className="text-slate-500 text-[10px]">قواطع حماية، كابلات، هياكل تثبيت، مؤرض</span>,
    qty: <span className="font-mono">—</span>,
    total: <span className="font-mono font-bold text-slate-800">{formatPrice(pricing.accessories_cost)}</span>,
  });
  bomRows.push({
    num: <span className="text-slate-400">{n++}</span>,
    category: <span className="font-bold text-slate-800">أجور عمل</span>,
    spec: <span className="text-slate-500 text-[10px]">نقل، تركيب، تشغيل وبرمجة النظام</span>,
    qty: <span className="font-mono">—</span>,
    total: <span className="font-mono font-bold text-slate-800">{formatPrice(pricing.installation_cost)}</span>,
  });

  const summaryLines: SummaryLine[] = [
    { label: 'إجمالي المواد:', value: formatPrice(pricing.material_cost_usd) },
    { label: 'أجور العمل:', value: formatPrice(pricing.installation_cost) },
  ];

  const workspaceDisclaimers = [
    'الأسعار قابلة للتغيير وتعتمد على سعر الصرف وتوفر المواد وقت التجهيز.',
    'هذا التقرير هو ناتج عن حساب برمجي مبدئي وقد يتطلب معاينة موقعية للتأكيد النهائي.',
    'تختلف شروط الضمان حسب طراز كل مكون وخيارات المورد.',
  ];

  return (
    <ReportLayout printOnly className="absolute top-0 left-0 z-50">
      <ReportHeader
        title="تقرير الحساب المتقدم"
        refNumber={refNumber}
        date={date}
        refLabel="رقم التقرير"
      />

      <div className="px-8 py-5 flex-1 flex flex-col">
        <ReportMetaBlock columns={metaColumns} />

        <ReportSection title="موجز المعدات المحددة والتسعير" className="flex-1">
          <PrintTable columns={bomColumns} rows={bomRows} />

          <div className="mt-6 report-section-bg border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <h4 className="text-xs font-bold text-slate-700 mb-2">توزيع وتفاصيل التكاليف</h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500">إجمالي المواد: </span>
                <span className="font-bold mr-2">{formatPrice(pricing.material_cost_usd)}</span>
              </div>
              <div>
                <span className="text-slate-500">أجور العمل: </span>
                <span className="font-bold mr-2">{formatPrice(pricing.installation_cost)}</span>
              </div>
            </div>
          </div>
        </ReportSection>

        <div className="flex gap-6 mt-6 shrink-0">
          <ReportTerms disclaimers={workspaceDisclaimers} />

          <div className="w-[240px] border border-slate-200 rounded-xl p-4 bg-white flex flex-col justify-center print-avoid-break">
            <div className="flex justify-between items-end mb-1">
              <span className="text-sm font-bold text-slate-900">الإجمالي النهائي</span>
              <span className="text-2xl font-black text-slate-900 font-mono">{formatPrice(pricing.sale_price_usd)}</span>
            </div>
            {result.payment_options && (
              <div className="flex justify-between items-end mt-2 pt-2 border-t border-dashed border-slate-200">
                <span className="text-xs font-bold text-emerald-600">الدفع النقدي (بعد الخصم)</span>
                <span className="text-sm font-black text-emerald-600 font-mono">{formatPrice(result.payment_options.cash.final_total_usd)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <ReportFooter />
    </ReportLayout>
  );
}
