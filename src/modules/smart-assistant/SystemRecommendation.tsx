import { apiFetch } from '@/src/utils/apiFetch';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectStore, SystemRecommendationData } from '../../store/projectStore';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Sun, Battery, Settings2, FileText, Activity, Save, CheckCircle2, User, Phone, DollarSign, TrendingUp, Lightbulb, Zap, Info, ChevronDown, ChevronUp, Scale, Package, ArrowRightLeft, Download, Share2, Calculator, ChevronLeft, CreditCard, Sparkles, AlertCircle, History, Plus } from 'lucide-react';
import { useCurrencyStore } from '../../store/currencyStore';
import DynamicDiagram from './DynamicDiagram';
import InfoTooltip from '../../components/InfoTooltip';
import { useNavigate } from 'react-router-dom';

export default function SystemRecommendation() {
  const { appliances, region, systemType, gridHoursOff, advancedSettings, isProMode, toggleProMode, setStep, recommendation, setRecommendation } = useProjectStore();
  const [loading, setLoading] = useState(true);
  const [customPanels, setCustomPanels] = useState(0);
  const [customBatteries, setCustomBatteries] = useState(0);
  const [selectedBatteryItem, setSelectedBatteryItem] = useState<any>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [quoteSaved, setQuoteSaved] = useState(false);
  const [savingQuote, setSavingQuote] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showROI, setShowROI] = useState(false);
  const [showBatteryCompare, setShowBatteryCompare] = useState(false);
  const navigate = useNavigate();

  // ── Catalog Selection State (Pro Mode) ──
  const [availablePanels, setAvailablePanels] = useState<any[]>([]);
  const [availableInverters, setAvailableInverters] = useState<any[]>([]);
  const [selectedPanelItem, setSelectedPanelItem] = useState<any>(null);
  const [selectedInverterItem, setSelectedInverterItem] = useState<any>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // ── Quick Ampere Calculator State ──
  const [quickAmps, setQuickAmps] = useState<number>(0);
  const [quickCalcResult, setQuickCalcResult] = useState<any>(null);
  const [quickCalcLoading, setQuickCalcLoading] = useState(false);
  const [quickCalcError, setQuickCalcError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'installments'>('cash');

  const { formatPrice, exchangeRate } = useCurrencyStore();

  const handleQuickCalc = async () => {
    if (!quickAmps || quickAmps <= 0) return;
    setQuickCalcLoading(true);
    setQuickCalcError(null);
    setQuickCalcResult(null);
    try {
      const res = await apiFetch('/api/amper-quote', {
        method: 'POST',
        body: JSON.stringify({ amps: quickAmps, sun_hours: region?.sun_hours || 5, day_hours: 8 })
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error || 'فشل حساب السعر');
      }
      const data = await res.json();
      setQuickCalcResult(data);
    } catch (err: any) {
      setQuickCalcError(err.message);
    } finally {
      setQuickCalcLoading(false);
    }
  };

  useEffect(() => {
    const fetchRecommendation = async () => {
      setLoading(true);
      try {
        const res = await apiFetch('/api/calculate-recommendation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appliances, region, systemType, gridHoursOff, advancedSettings })
        });
        const data = await res.json();
        setRecommendation(data);
        setCustomPanels(data.recommendation.panels.count);
        setCustomBatteries(data.recommendation.batteries.count);
        setSelectedBatteryItem(data.recommendation.batteries.item);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendation();
  }, [appliances, region, systemType, gridHoursOff, advancedSettings]);

  // ── Fetch catalog items when Pro Mode is toggled on ──
  useEffect(() => {
    if (isProMode && availablePanels.length === 0) {
      setCatalogLoading(true);
      Promise.all([
        apiFetch('/api/products?category=panel').then(r => r.json()),
        apiFetch('/api/products?category=inverter').then(r => r.json()),
      ]).then(([panels, inverters]) => {
        setAvailablePanels(panels || []);
        setAvailableInverters(inverters || []);
      }).catch(console.error).finally(() => setCatalogLoading(false));
    }
  }, [isProMode]);

  if (loading || !recommendation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">جاري الحساب الهندسي...</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">نصمم لك أفضل منظومة بناءً على احتياجاتك</p>
      </div>
    );
  }

  const { engineering, recommendation: rec } = recommendation;

  // Use user-selected items if available, otherwise use recommendation defaults
  const currentPanel = selectedPanelItem || rec.panels.item;
  const currentInverter = selectedInverterItem || rec.inverter.item;
  const currentBattery = selectedBatteryItem || rec.batteries.item;

  // 1. Is overridden?
  const isPanelCountChanged = customPanels !== rec.panels.count;
  const isBatteryCountChanged = customBatteries !== (rec.batteries?.count || 0);
  const isPanelItemChanged = currentPanel.id !== rec.panels.item.id;
  const isBatteryItemChanged = currentBattery?.id !== rec.batteries?.item?.id;
  const isInverterItemChanged = currentInverter.id !== rec.inverter.item.id;

  const isCustomized = isPanelCountChanged || isBatteryCountChanged || isPanelItemChanged || isBatteryItemChanged || isInverterItemChanged;

  const panelWatt = JSON.parse(currentPanel.spec || '{}').w || JSON.parse(currentPanel.spec || '{}').W || 550;
  const batteryAh = currentBattery ? (JSON.parse(currentBattery.spec || '{}').Ah || JSON.parse(currentBattery.spec || '{}').ah || 200) : 0;

  // 2. Coverage
  let coveragePercent = 100;
  if (!isCustomized && engineering.system_balance) {
      coveragePercent = engineering.system_balance.solar_coverage_percent;
  } else {
      const generatedWh = customPanels * panelWatt * (region?.sun_hours || 5);
      const storedWh = customBatteries * batteryAh * engineering.system_voltage * engineering.dod * engineering.efficiency;
      const effectiveWh = Math.min(generatedWh, storedWh);
      coveragePercent = engineering.total_wh > 0 ? Math.min(100, Math.round((effectiveWh / engineering.total_wh) * 100)) : 100;
  }
  
  const gaugeData = [
    { name: 'Coverage', value: coveragePercent },
    { name: 'Empty', value: 100 - coveragePercent },
  ];
  const COLORS = [coveragePercent >= 100 ? '#10b981' : '#f59e0b', '#e2e8f0'];

  /* ── Dynamic Price Estimate ── */
  const batteryItemCost = currentBattery?.cost_price || 0;
  const batteryItemSale = currentBattery?.sale_price || currentBattery?.retail_price || batteryItemCost;
  const panelCost = customPanels * (currentPanel.cost_price || 0);
  const panelSale = customPanels * (currentPanel.sale_price || currentPanel.retail_price || currentPanel.cost_price || 0);
  const inverterCost = currentInverter.cost_price || 0;
  const inverterSale = currentInverter.sale_price || currentInverter.retail_price || currentInverter.cost_price || 0;

  const currentMaterialCost = panelCost + (customBatteries * batteryItemCost) + inverterCost;
  const currentRetailTotal = panelSale + (customBatteries * batteryItemSale) + inverterSale;

  let estimatedPriceUSD = 0;
  let estimatedPriceIQD = 0;
  let cashTotalUSD = 0;
  let cashTotalIQD = 0;
  let installmentOptions: any = null;
  
  if (!isCustomized && recommendation.pricing && recommendation.payment_options) {
     estimatedPriceUSD = recommendation.pricing.sale_price_usd;
     estimatedPriceIQD = recommendation.pricing.sale_price_iqd;
     cashTotalUSD = recommendation.payment_options.cash.final_total_usd;
     cashTotalIQD = recommendation.payment_options.cash.final_total_iqd;
     installmentOptions = recommendation.payment_options.installments;
  } else {
     estimatedPriceUSD = currentRetailTotal || currentMaterialCost * 1.15;
     estimatedPriceIQD = estimatedPriceUSD * exchangeRate;
     
     // Recalculate basic cash discount if customized
     const cash_discount_percent = 3;
     cashTotalUSD = Math.round(estimatedPriceUSD * (1 - cash_discount_percent / 100));
     cashTotalIQD = Math.round(cashTotalUSD * exchangeRate);
     
     // Basic Installments if customized
     const financed_amount_usd = estimatedPriceUSD - Math.round(estimatedPriceUSD * 0.3); // 30% down
     const financed_amount_iqd = Math.round(financed_amount_usd * exchangeRate);
     const admin_fee_iqd = Math.round(financed_amount_iqd * 0.05); // 5% admin
     const total_financed_iqd = financed_amount_iqd + admin_fee_iqd;
     
     installmentOptions = {
         enabled: true,
         months: 12,
         down_payment_percent: 30,
         down_payment_usd: Math.round(estimatedPriceUSD * 0.3),
         down_payment_iqd: Math.round(estimatedPriceUSD * 0.3 * exchangeRate),
         admin_fee_percent: 5,
         admin_fee_iqd,
         monthly_payment_iqd: Math.round(total_financed_iqd / 12),
         final_total_iqd: Math.round(estimatedPriceUSD * 0.3 * exchangeRate) + total_financed_iqd,
         interest_percent: 0,
         financed_amount_iqd
     };
  }

  /* ── ROI Calculations ── */
  const monthlyGridBill = (engineering.total_wh * 30 / 1000) * 250; // ~250 IQD/kWh estimate
  const annualSavings = monthlyGridBill * 12;
  const paybackYears = annualSavings > 0 ? cashTotalIQD / annualSavings : 0;
  const lifetimeSavings25y = annualSavings * 25 - cashTotalIQD;

  /* ── "Why This Recommendation" ── */
  const explanations = [
    `تحتاج ${customPanels} لوح شمسي لأن استهلاكك اليومي ${(engineering.total_wh / 1000).toFixed(1)} كيلوواط ساعة ومنطقتك ${region?.name} فيها ${region?.sun_hours} ساعات شمس.`,
    systemType !== 'solar_direct' ? `تحتاج ${customBatteries} بطارية لتخزين الطاقة لـ ${gridHoursOff || 'ساعات'} ساعة انقطاع.` : 'لا تحتاج بطاريات — النظام يعمل بالنهار فقط.',
    `الحمل الأقصى ${(engineering.peak_continuous_w / 1000).toFixed(1)} كيلوواط — لذلك اخترنا محوّل (انفرتر) يتحمل هذا الحمل.`,
  ];

  const handleSaveQuote = async () => {
    if (!customerName || !customerPhone) { setSaveError('يرجى إدخال اسم ورقم هاتف العميل'); return; }
    setSavingQuote(true); setSaveError('');
    try {
      const payload = {
        amps: engineering.peak_continuous_w / 220,
        sun_hours: region?.sun_hours || 5,
        advancedSettings,
        customer_name: customerName,
        customer_phone: customerPhone,
        pricing_layer: 'retail',
        quote_data: {
          material_cost: currentMaterialCost,
          wholesale_total: currentMaterialCost, // Or updated logic
          retail_total: currentRetailTotal,
          profit: currentRetailTotal - currentMaterialCost,
          panels: { count: customPanels, item: currentPanel },
          batteries: { count: customBatteries, item: currentBattery },
          inverter: { item: currentInverter }
        }
      };
      const res = await apiFetch('/api/quotes/from-abpe', { method: 'POST', body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ عرض السعر');
      setQuoteSaved(true);
      setShowSaveForm(false);
      setTimeout(() => navigate('/quotes'), 1500);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSavingQuote(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto pb-24">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white/40 dark:bg-slate-800/40 backdrop-blur-3xl p-6 rounded-[2rem] border border-white/50 dark:border-slate-700/50 shadow-sm">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">منظومتك المقترحة ☀️</h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
            بناءً على استهلاكك في <span className="font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-lg">{region?.name}</span>
          </p>
        </div>
        <button onClick={toggleProMode} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${isProMode ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:border-amber-300'}`}>
          <Settings2 className={`w-4 h-4 ${isProMode ? 'animate-spin-slow' : ''}`} />
          {isProMode ? 'الوضع الهندسي مفعل' : 'الوضع الهندسي'}
        </button>
      </div>

      {/* ══════ "WHY THIS RECOMMENDATION" ══════ */}
      <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
        <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          لماذا هذا التوصية؟
        </h3>
        <div className="space-y-2">
          {explanations.map((exp, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-400">
              <span className="mt-0.5 w-5 h-5 bg-blue-200 dark:bg-blue-800 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
              <span>{exp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══════ PRICE ESTIMATE BANNER (WITH TABS) ══════ */}
      <div className="mb-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setPaymentMethod('cash')}
            className={`flex-1 py-4 text-center font-bold text-sm transition-colors relative ${paymentMethod === 'cash' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            نقد (الكاش)
            {paymentMethod === 'cash' && <motion.div layoutId="activeTabPrice" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-full" />}
          </button>
          <button
            onClick={() => setPaymentMethod('installments')}
            className={`flex-1 py-4 text-center font-bold text-sm transition-colors relative ${paymentMethod === 'installments' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            الأقساط
            {paymentMethod === 'installments' && <motion.div layoutId="activeTabPrice" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-t-full" />}
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {paymentMethod === 'cash' ? (
              <motion.div key="cash" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 text-emerald-600 dark:text-emerald-400">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl">
                    <DollarSign className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-sm block font-medium mb-1">السعر التقريبي للمنظومة (نقداً)</span>
                    <span className="text-4xl font-black">{formatPrice(cashTotalUSD)}</span>
                  </div>
                </div>
                <div className="flex gap-6 text-sm">
                  <div className="text-center bg-slate-50 dark:bg-slate-900/50 px-6 py-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="font-black text-xl text-slate-800 dark:text-slate-200">{formatPrice(cashTotalIQD, 'IQD')}</div>
                    <div className="text-slate-500 text-xs">بالدينار العراقي (تقريبي)</div>
                  </div>
                  <div className="text-center bg-slate-50 dark:bg-slate-900/50 px-6 py-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="font-black text-xl text-slate-800 dark:text-slate-200">{customPanels + customBatteries + 1}</div>
                    <div className="text-slate-500 text-xs">عدد القطع الرئيسية</div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="installments" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                    <div className="text-xs text-slate-500 mb-1">المقدمة ({installmentOptions.down_payment_percent}%)</div>
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">{formatPrice(installmentOptions.down_payment_usd)}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{formatPrice(installmentOptions.down_payment_iqd, 'IQD')}</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50 text-center">
                    <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">القسط الشهري</div>
                    <div className="text-xl font-black text-blue-700 dark:text-blue-300">{formatPrice(installmentOptions.monthly_payment_iqd, 'IQD')}</div>
                    <div className="text-[10px] text-blue-500 mt-1">لمدة {installmentOptions.months} شهر</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                    <div className="text-xs text-slate-500 mb-1">المبلغ الممول</div>
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">{formatPrice(installmentOptions.financed_amount_iqd, 'IQD')}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                    <div className="text-xs text-slate-500 mb-1">الإجمالي (شامل الأجور)</div>
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">{formatPrice(installmentOptions.final_total_iqd, 'IQD')}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg flex gap-2">
                  <Info className="w-4 h-4 text-blue-500 shrink-0" />
                  <p>تم احتساب الأقساط بأجور إدارية {installmentOptions.admin_fee_percent}% تضاف لمرة واحدة على المبلغ الممول. لا توجد فوائد شهرية.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/80 px-6 py-3 border-t border-slate-200 dark:border-slate-700 pb-4">
            <p className="text-slate-400 dark:text-slate-500 text-xs text-center">* السعر تقديري ويتضمن المعدات فقط — يضاف 5-10% للتركيب والإكسسوارات. قد تختلف الأسعار الفعلية وعروض التقسيط حسب وقت التعاقد.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left: Visual Summary ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <motion.div whileHover={{ y: -4 }} className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-5 rounded-2xl border border-amber-100 dark:border-amber-800 relative overflow-hidden">
              <Sun className="w-20 h-20 absolute -bottom-3 -left-3 text-amber-500/10" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md"><Sun className="w-6 h-6" /></div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">الألواح الشمسية</h3>
                    <InfoTooltip text="الألواح الشمسية تحوّل ضوء الشمس إلى كهرباء. كل لوح ينتج حوالي 550 واط في ذروة الشمس." />
                  </div>
                </div>
                <div className="text-4xl font-black text-amber-600 dark:text-amber-400 mb-1">
                  {customPanels} <span className="text-lg font-bold text-amber-700/60 dark:text-amber-500/60">لوح</span>
                </div>
                <p className="text-amber-800 dark:text-amber-300 font-medium text-sm">{currentPanel.model}</p>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -4 }} className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800 relative overflow-hidden">
              <Battery className="w-20 h-20 absolute -bottom-3 -left-3 text-emerald-500/10" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-md"><Battery className="w-6 h-6" /></div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">البطاريات</h3>
                    <InfoTooltip text="البطاريات تخزن الكهرباء لاستخدامها عند انقطاع الشبكة أو في الليل. عمر البطارية الليثيوم 10-15 سنة." />
                  </div>
                </div>
                <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400 mb-1">
                  {customBatteries} <span className="text-lg font-bold text-emerald-700/60 dark:text-emerald-500/60">بطارية</span>
                </div>
                <p className="text-emerald-800 dark:text-emerald-300 font-medium text-sm">{currentBattery.model}</p>
              </div>
            </motion.div>
          </div>

          {/* Dynamic Diagram */}
          <div>
            <h3 className="text-slate-800 dark:text-white font-bold text-lg mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-500" />
              مخطط التوصيل
              <InfoTooltip text="هذا المخطط يوضح كيف تتصل مكونات المنظومة ببعضها: من الألواح → للمنظم → للبطاريات → للمحوّل → لأجهزتك." />
            </h3>
            <DynamicDiagram panels={{ count: customPanels, item: currentPanel }} batteries={{ count: customBatteries, item: currentBattery }} inverter={currentInverter} systemType={systemType} />
          </div>

          {/* ══════ ROI Calculator ══════ */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button onClick={() => setShowROI(!showROI)} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                حاسبة التوفير — هل المنظومة تستحق؟
              </h3>
              {showROI ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            <AnimatePresence>
              {showROI && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="p-5 pt-0 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl text-center">
                      <div className="text-2xl font-black text-amber-600">{formatPrice(monthlyGridBill / exchangeRate)}</div>
                      <div className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-1">فاتورة شهرية تقديرية</div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl text-center">
                      <div className="text-2xl font-black text-emerald-600">{formatPrice(annualSavings / exchangeRate)}</div>
                      <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-1">توفير سنوي</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-center">
                      <div className="text-2xl font-black text-blue-600">{paybackYears.toFixed(1)}</div>
                      <div className="text-xs text-blue-700 dark:text-blue-400 font-medium mt-1">سنة لاسترداد التكلفة</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl text-center">
                      <div className="text-2xl font-black text-purple-600">{formatPrice(lifetimeSavings25y / exchangeRate)}</div>
                      <div className="text-xs text-purple-700 dark:text-purple-400 font-medium mt-1">صافي التوفير (25 سنة)</div>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <p className="text-xs text-slate-400 dark:text-slate-500">* الحسابات تقديرية بناءً على متوسط تعرفة الكهرباء ~250 د.ع/كيلوواط ساعة وعمر ألواح 25 سنة</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ══════ Battery Selection ══════ */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button onClick={() => setShowBatteryCompare(!showBatteryCompare)} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Battery className="w-5 h-5 text-emerald-500" />
                خيارات البطاريات البديلة
              </h3>
              {showBatteryCompare ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            <AnimatePresence>
              {showBatteryCompare && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="p-5 pt-0">
                    <div className="flex flex-col gap-3">
                      {(rec.batteries.alternatives || []).map((alt: any, idx: number) => {
                        const isSelected = selectedBatteryItem?.id === alt.item.id;
                        const chemistryLabel = alt.item.battery_chemistry === 'LITHIUM' ? '🔋 ليثيوم' :
                          alt.item.battery_chemistry === 'TUBULAR' ? '🔋 أنبوبية' :
                            alt.item.battery_chemistry === 'GEL' ? '🔋 جل' : '🪫 رصاص';
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setSelectedBatteryItem(alt.item);
                              setCustomBatteries(alt.count);
                            }}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600'}`}
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`font-bold ${isSelected ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}`}>{alt.item.model}</h4>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{chemistryLabel}</span>
                              </div>
                              <p className="text-xs text-slate-500 font-medium">العدد المطلوب: {alt.count} بطارية</p>
                            </div>
                            <div className="text-left flex flex-col items-end">
                              <p className={`font-black text-lg ${isSelected ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'}`}>${(alt.total_sale || alt.total_cost).toLocaleString()}</p>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-1" />}
                            </div>
                          </div>
                        );
                      })}
                      {(!rec.batteries.alternatives || rec.batteries.alternatives.length === 0) && (
                        <p className="text-sm text-slate-500 text-center py-4">لا توجد بدائل متاحة حالياً.</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Right Column ── */}
        <div className="space-y-6">
          {/* Coverage Gauge */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1 flex items-center justify-center gap-2">
              تغطية الاستهلاك
              <InfoTooltip text="النسبة المئوية من استهلاكك اليومي التي تغطيها المنظومة. 100% يعني تغطية كاملة." />
            </h3>
            <div className="h-40 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={gaugeData} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={55} outerRadius={75} paddingAngle={0} dataKey="value" stroke="none">
                    {gaugeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-1">
                <span className={`text-3xl font-black ${coveragePercent >= 100 ? 'text-emerald-500' : 'text-amber-500'}`}>{coveragePercent}%</span>
              </div>
            </div>
          </div>

          {/* What-If Sliders */}
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-6">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-slate-500" />
              تعديل المنظومة
              <InfoTooltip text="حرّك المزلاج لزيادة أو تقليل عدد الألواح أو البطاريات وشاهد تأثيرها على التغطية والسعر فوراً." />
            </h3>
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-sm text-slate-600 dark:text-slate-300">الألواح</span>
                <span className="font-black text-xl text-amber-600 dark:text-amber-400">{customPanels}</span>
              </div>
              <input type="range" min="0" max={Math.max(10, rec.panels.count * 2)} value={customPanels} onChange={(e) => setCustomPanels(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-amber-500" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-sm text-slate-600 dark:text-slate-300">البطاريات</span>
                <span className="font-black text-xl text-emerald-600 dark:text-emerald-400">{customBatteries}</span>
              </div>
              <input type="range" min="0" max={Math.max(10, rec.batteries.count * 2)} value={customBatteries} onChange={(e) => setCustomBatteries(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-emerald-500" />
            </div>

            <AnimatePresence>
              {coveragePercent < 100 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-medium text-xs rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  المنظومة لن تغطي كامل الاستهلاك اليومي
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Pro Mode — Engineering Details + Catalog Selection */}
          <AnimatePresence>
            {isProMode && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="bg-slate-950 text-white p-6 rounded-2xl shadow-xl border border-slate-800 overflow-hidden space-y-5">
                <div className="flex gap-1.5 mb-2 opacity-30">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>

                {/* Engineering Summary */}
                <div>
                  <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                    التفاصيل الهندسية
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] font-mono">
                    {[
                      { label: "الاستهلاك اليومي", val: `${engineering.total_wh.toFixed(0)} Wh`, color: "text-amber-400" },
                      { label: "ذروة الحمل", val: `${engineering.peak_continuous_w.toFixed(0)} W`, color: "text-emerald-300" },
                      { label: "ذروة التشغيل", val: `${engineering.peak_surge_w.toFixed(0)} W`, color: "text-rose-400" },
                      { label: "جهد النظام", val: `${engineering.system_voltage} V`, color: "text-blue-400" },
                      { label: "سعة البطاريات", val: `${engineering.required_ah.toFixed(0)} Ah`, color: "text-emerald-400" },
                      { label: "القدرة الشمسية", val: `${engineering.required_panel_w.toFixed(0)} W`, color: "text-amber-300" },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between border-b border-slate-800/40 pb-1">
                        <span className="text-slate-500">{item.label}</span>
                        <span className={`font-bold ${item.color}`}>{item.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Catalog Selection */}
                <div className="border-t border-slate-800 pt-5">
                  <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-500" />
                    اختيار المكونات من الكتالوج
                  </h3>

                  {catalogLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-slate-400 text-sm mr-3">جاري تحميل الكتالوج...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Panel Selector */}
                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5 font-bold">
                          <Sun className="w-3.5 h-3.5 inline ml-1 text-amber-500" />
                          نوع اللوح الشمسي
                        </label>
                        <select
                          value={currentPanel.id || ''}
                          onChange={(e) => {
                            const item = availablePanels.find((p: any) => String(p.id) === e.target.value);
                            if (item) setSelectedPanelItem(item);
                          }}
                          className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none appearance-none cursor-pointer"
                        >
                          {availablePanels.length === 0 && <option value="">لا توجد ألواح في الكتالوج</option>}
                          {availablePanels.map((p: any) => {
                            const spec = typeof p.spec === 'object' ? p.spec : JSON.parse(p.spec || '{}');
                            return (
                              <option key={p.id} value={p.id}>
                                {p.model} — {spec.w || spec.W || '?'}W — {formatPrice(p.sale_price || p.cost_price)}
                              </option>
                            );
                          })}
                        </select>
                        <div className="flex gap-4 mt-1.5 text-[10px] text-slate-500">
                          <span>القدرة: <strong className="text-amber-400">{panelWatt}W</strong></span>
                          <span>سعر الوحدة: <strong className="text-amber-400">{formatPrice(currentPanel.sale_price || currentPanel.cost_price)}</strong></span>
                          <span>العلامة: <strong className="text-slate-300">{currentPanel.brand || '—'}</strong></span>
                        </div>
                      </div>

                      {/* Inverter Selector */}
                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5 font-bold">
                          <Zap className="w-3.5 h-3.5 inline ml-1 text-blue-500" />
                          نوع المحوّل (الانفرتر)
                        </label>
                        <select
                          value={currentInverter.id || ''}
                          onChange={(e) => {
                            const item = availableInverters.find((p: any) => String(p.id) === e.target.value);
                            if (item) setSelectedInverterItem(item);
                          }}
                          className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                        >
                          {availableInverters.length === 0 && <option value="">لا توجد محولات في الكتالوج</option>}
                          {availableInverters.map((inv: any) => {
                            const spec = typeof inv.spec === 'object' ? inv.spec : JSON.parse(inv.spec || '{}');
                            return (
                              <option key={inv.id} value={inv.id}>
                                {inv.model} — {spec.W || spec.w || '?'}W — {formatPrice(inv.sale_price || inv.cost_price)}
                              </option>
                            );
                          })}
                        </select>
                        <div className="flex gap-4 mt-1.5 text-[10px] text-slate-500">
                          <span>القدرة: <strong className="text-blue-400">{JSON.parse(currentInverter.spec || '{}').W || JSON.parse(currentInverter.spec || '{}').w || '?'}W</strong></span>
                          <span>السعر: <strong className="text-blue-400">{formatPrice(currentInverter.sale_price || currentInverter.cost_price)}</strong></span>
                          <span>العلامة: <strong className="text-slate-300">{currentInverter.brand || '—'}</strong></span>
                        </div>
                      </div>

                      {/* Reset button */}
                      <button
                        onClick={() => { setSelectedPanelItem(null); setSelectedInverterItem(null); setSelectedBatteryItem(null); setCustomPanels(rec.panels.count); setCustomBatteries(rec.batteries.count); }}
                        className="w-full mt-2 flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 py-2 rounded-lg transition-colors border border-slate-700"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        إعادة تعيين للتوصية الأصلية
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Quick Ampere Calculator ── */}
                <div className="border-t border-slate-800 pt-5">
                  <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    حاسبة الأمبير السريعة
                  </h3>
                  <p className="text-slate-500 text-[11px] mb-3">أدخل الأمبير المطلوب مباشرة لحساب السعر فوراً</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="1"
                        placeholder="مثال: 30"
                        value={quickAmps || ''}
                        onChange={(e) => setQuickAmps(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg py-2.5 px-3 text-lg font-black text-center focus:ring-2 focus:ring-yellow-500 outline-none placeholder:text-slate-600 placeholder:text-sm placeholder:font-normal"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">A</span>
                    </div>
                    <button
                      onClick={handleQuickCalc}
                      disabled={quickCalcLoading || !quickAmps || quickAmps <= 0}
                      className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 text-sm whitespace-nowrap"
                    >
                      {quickCalcLoading ? (
                        <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <><Zap className="w-4 h-4" /> احسب</>
                      )}
                    </button>
                  </div>

                  {/* Quick Calc Results */}
                  <AnimatePresence>
                    {quickCalcResult && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="mt-4 bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-3">
                        {/* Price Banner */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-slate-500 text-[10px]">سعر البيع (تجزئة)</p>
                            <p className="text-2xl font-black text-yellow-400">${quickCalcResult.pricing.retailPrice.toLocaleString()}</p>
                          </div>
                          <div className="text-left">
                            <p className="text-slate-500 text-[10px]">التكلفة</p>
                            <p className="text-sm font-bold text-slate-400">${quickCalcResult.pricing.totalCost.toLocaleString()}</p>
                          </div>
                          <div className="text-left">
                            <p className="text-slate-500 text-[10px]">الربح</p>
                            <p className="text-sm font-bold text-emerald-400">${(quickCalcResult.pricing.retailPrice - quickCalcResult.pricing.totalCost).toLocaleString()}</p>
                          </div>
                        </div>
                        {/* Components */}
                        <div className="grid grid-cols-3 gap-2 text-[10px]">
                          <div className="bg-slate-900 rounded-lg p-2 text-center">
                            <Sun className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
                            <div className="text-white font-bold">{quickCalcResult.recommendation.panels.count}x</div>
                            <div className="text-slate-500 truncate">{quickCalcResult.recommendation.panels.item.model}</div>
                          </div>
                          <div className="bg-slate-900 rounded-lg p-2 text-center">
                            <Battery className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
                            <div className="text-white font-bold">{quickCalcResult.recommendation.batteries.count}x</div>
                            <div className="text-slate-500 truncate">{quickCalcResult.recommendation.batteries.item.model}</div>
                          </div>
                          <div className="bg-slate-900 rounded-lg p-2 text-center">
                            <Zap className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
                            <div className="text-white font-bold">1x</div>
                            <div className="text-slate-500 truncate">{quickCalcResult.recommendation.inverter.item.model}</div>
                          </div>
                        </div>
                        {/* Apply button */}
                        <button
                          onClick={() => {
                            // Apply ABPE result to the main recommendation view
                            setSelectedPanelItem(quickCalcResult.recommendation.panels.item);
                            setCustomPanels(quickCalcResult.recommendation.panels.count);
                            setSelectedBatteryItem(quickCalcResult.recommendation.batteries.item);
                            setCustomBatteries(quickCalcResult.recommendation.batteries.count);
                            setSelectedInverterItem(quickCalcResult.recommendation.inverter.item);
                          }}
                          className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 font-bold py-2 rounded-lg transition-colors text-xs flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          تطبيق هذا النظام على العرض الحالي
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {quickCalcError && (
                    <div className="mt-3 text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                      {quickCalcError}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Actions ── */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col gap-3">
            {!quoteSaved ? (
              <>
                <AnimatePresence>
                  {showSaveForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3 overflow-hidden">
                      <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                        <Save className="w-4 h-4 text-emerald-600" />
                        حفظ كعرض سعر
                      </h4>
                      {saveError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{saveError}</div>}
                      <div className="space-y-2">
                        <div className="relative">
                          <User className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                          <input type="text" placeholder="اسم العميل" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full pr-9 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-800 dark:text-white" />
                        </div>
                        <div className="relative">
                          <Phone className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                          <input type="text" placeholder="رقم الهاتف" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full pr-9 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-800 dark:text-white" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSaveQuote} disabled={savingQuote} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg transition-colors text-sm flex justify-center items-center gap-2">
                            {savingQuote ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'تأكيد الحفظ'}
                          </button>
                          <button onClick={() => setShowSaveForm(false)} className="px-3 py-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm">إلغاء</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!showSaveForm && (
                  <button onClick={() => setShowSaveForm(true)} className="w-full bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm">
                    <Save className="w-5 h-5" />
                    حفظ كعرض سعر
                  </button>
                )}

                <button onClick={() => navigate('/quote/preview')}
                  className="w-full bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm">
                  <FileText className="w-5 h-5" />
                  توليد ملف (PDF)
                </button>
              </>
            ) : (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-5 bg-emerald-500 text-white rounded-xl flex flex-col items-center gap-2 text-center shadow-lg">
                <CheckCircle2 className="w-10 h-10" />
                <h3 className="font-bold text-lg">تم حفظ عرض السعر!</h3>
                <p className="opacity-90 text-sm">جاري تحويلك لقائمة العروض...</p>
              </motion.div>
            )}

            <button onClick={() => setStep(3)} className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm">
              تعديل الأجهزة
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
