import { useState, useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useNavigate } from 'react-router-dom';
import { Printer, ChevronRight, Settings, User, Phone, DollarSign } from 'lucide-react';
import { useCurrencyStore } from '../store/currencyStore';
import QuoteReport from '../reports/templates/QuoteReport';
import type { QuoteReportData } from '../reports/templates/QuoteReport';
import { triggerPrint, generateReportRef, formatReportDate } from '../reports/utils/reportHelpers';

export default function QuoteView() {
  const { recommendation, region, systemType } = useProjectStore();
  const { formatPrice } = useCurrencyStore();
  const navigate = useNavigate();

  // Seller Customization State
  const [customerName, setCustomerName] = useState('عميل محتمل');
  const [customerPhone, setCustomerPhone] = useState('');

  // Default values
  const hardwareTotalBase = recommendation ?
    (recommendation.recommendation.panels.count * (recommendation.recommendation.panels.item.sale_price || 0)) +
    (recommendation.recommendation.batteries.count * (recommendation.recommendation.batteries.item.sale_price || 0)) +
    (recommendation.recommendation.inverter.item.sale_price || 0) : 0;

  const [accessoriesCost, setAccessoriesCost] = useState(hardwareTotalBase * 0.10);
  const [installationCost, setInstallationCost] = useState(hardwareTotalBase * 0.05);
  const [discount, setDiscount] = useState(0);

  const [warrantyPanels, setWarrantyPanels] = useState('25 سنة أداء');
  const [warrantyBatteries, setWarrantyBatteries] = useState('5 سنوات');
  const [warrantyInverter, setWarrantyInverter] = useState('5 سنوات');
  const [warrantyLabor, setWarrantyLabor] = useState('سنة واحدة');

  // Stable ref number that doesn't change on re-renders
  const [quoteRef] = useState(() => generateReportRef('QT'));
  const [quoteDate] = useState(() => formatReportDate());

  useEffect(() => {
    if (!recommendation) navigate('/');
  }, [recommendation, navigate]);

  useEffect(() => {
    if (recommendation) {
      const base = (recommendation.recommendation.panels.count * (recommendation.recommendation.panels.item.sale_price || 0)) +
        (recommendation.recommendation.batteries.count * (recommendation.recommendation.batteries.item.sale_price || 0)) +
        (recommendation.recommendation.inverter.item.sale_price || 0);
      setAccessoriesCost(base * 0.10);
      setInstallationCost(base * 0.05);
    }
  }, [recommendation]);

  if (!recommendation) return null;

  const { engineering, recommendation: rec } = recommendation;

  const panelsTotal = rec.panels.count * (rec.panels.item.sale_price || 0);
  const batteriesTotal = rec.batteries.count * (rec.batteries.item.sale_price || 0);
  const inverterTotal = rec.inverter.item.sale_price || 0;
  const hardwareTotal = panelsTotal + batteriesTotal + inverterTotal;

  const subTotal = hardwareTotal + accessoriesCost + installationCost;
  const grandTotal = subTotal - discount;

  const totalDailyKwh = (engineering.total_wh / 1000).toFixed(1);

  // Build the report data contract from interactive state
  const reportData: QuoteReportData = {
    customerName,
    customerPhone: customerPhone || undefined,
    systemType,
    systemVoltage: engineering.system_voltage,
    regionName: region?.name,
    totalDailyKwh,
    peakLoadKw: (engineering.peak_continuous_w / 1000).toFixed(1),
    autonomyHours: engineering.autonomy_hours,
    panels: {
      model: rec.panels.item.model,
      count: rec.panels.count,
      unitPrice: rec.panels.item.sale_price || 0,
      total: panelsTotal,
    },
    batteries: {
      model: rec.batteries.item.model,
      count: rec.batteries.count,
      unitPrice: rec.batteries.item.sale_price || 0,
      total: batteriesTotal,
    },
    inverter: {
      model: rec.inverter.item.model,
      unitPrice: rec.inverter.item.sale_price || 0,
      total: inverterTotal,
    },
    accessoriesCost,
    installationCost,
    hardwareTotal,
    discount,
    grandTotal,
    warranty: [
      { label: 'الألواح', value: warrantyPanels },
      { label: 'البطاريات', value: warrantyBatteries },
      { label: 'المحول', value: warrantyInverter },
      { label: 'التركيب', value: warrantyLabor },
    ],
    formatPrice,
    quoteRef,
    date: quoteDate,
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row print:bg-white print:block">

      {/* ══ Seller Customization Panel (Hidden in Print) ══ */}
      <div className="w-full md:w-80 bg-white border-l border-slate-200 p-6 flex-shrink-0 print:hidden overflow-y-auto max-h-screen sticky top-0 shadow-lg z-10">
        <div className="flex items-center gap-2 mb-6 text-slate-800">
          <Settings className="w-5 h-5" />
          <h2 className="font-bold text-lg">إعدادات العرض (للبائع)</h2>
        </div>

        <div className="space-y-5">
          {/* Customer Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-500 border-b pb-1">معلومات العميل</h3>
            <div>
              <label className="block text-xs text-slate-500 mb-1">اسم العميل</label>
              <div className="relative">
                <User className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-9 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">رقم الهاتف</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="07XX-XXX-XXXX"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-9 text-sm focus:ring-2 focus:ring-amber-500 outline-none dir-ltr text-right"
                />
              </div>
            </div>
          </div>

          {/* Pricing Adjustments */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-500 border-b pb-1">تعديل التكاليف ($)</h3>
            <div>
              <label className="block text-xs text-slate-500 mb-1">تكلفة الملحقات والكابلات</label>
              <input
                type="number"
                value={Math.round(accessoriesCost)}
                onChange={(e) => setAccessoriesCost(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">أجور التركيب والنقل</label>
              <input
                type="number"
                value={Math.round(installationCost)}
                onChange={(e) => setInstallationCost(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 text-emerald-600 font-bold">الخصم الممنوح</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute right-3 top-2.5 text-emerald-500" />
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-full bg-emerald-50 border border-emerald-200 rounded-lg py-2 pl-3 pr-9 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-emerald-700 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Warranty */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-500 border-b pb-1">الضمانات</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">الألواح</label>
                <input type="text" value={warrantyPanels} onChange={(e) => setWarrantyPanels(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">البطاريات</label>
                <input type="text" value={warrantyBatteries} onChange={(e) => setWarrantyBatteries(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">المحول</label>
                <input type="text" value={warrantyInverter} onChange={(e) => setWarrantyInverter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">العمل</label>
                <input type="text" value={warrantyLabor} onChange={(e) => setWarrantyLabor(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <button onClick={triggerPrint} className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors shadow-lg">
            <Printer className="w-5 h-5" /> طباعة أو حفظ PDF
          </button>
          <button onClick={() => navigate(-1)} className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-600 px-4 py-3 rounded-lg font-medium hover:bg-slate-200 transition-colors">
            <ChevronRight className="w-5 h-5" /> العودة للتصميم
          </button>
        </div>
      </div>

      {/* ══ A4 Document Area — uses shared QuoteReport template ══ */}
      <div className="flex-1 overflow-auto py-8 print:py-0 bg-slate-100 print:bg-white flex justify-center">
        <QuoteReport data={reportData} />
      </div>
    </div>
  );
}
