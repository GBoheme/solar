import React from 'react';
import { useFastEstimateStore } from '../../../store/fastEstimateStore';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { useCurrencyStore } from '../../../store/currencyStore';
import { Zap, Clock, Battery, AlertCircle, ChevronRight, Calculator, ArrowLeftRight, CheckCircle2, Activity } from 'lucide-react';

interface FastEstimatePanelProps {
  onConvertToDetailed: () => void;
}

export default function FastEstimatePanel({ onConvertToDetailed }: FastEstimatePanelProps) {
  const { 
    amperage, systemType, usagePeriod, hours, heavySurge, result, isCalculating,
    setAmperage, setSystemType, setUsagePeriod, setHours, setHeavySurge, calculate
  } = useFastEstimateStore();
  
  const { formatPrice } = useCurrencyStore();

  const handleConvert = () => {
    if (!amperage || !result) return;

    const { setConfig, resetWorkspace, addLoad } = useWorkspaceStore.getState();

    // 1. Reset old workspace state to ensure clean slate
    resetWorkspace();

    // 2. Transfer fast inputs to workspace config
    setConfig({
        systemType,
        autonomyHours: hours >= 12 ? 24 : 12, // Rough translation assumption
        advanced: {
          ...useWorkspaceStore.getState().config.advanced,
          surgeFactor: heavySurge ? 2.0 : 1.2
        }
    });

    // 3. Derive synthetic load item
    addLoad({
        label: `احمال مجمعة (حساب سريع - ${amperage}A)`,
        watts: Math.ceil(result.technical.requiredPowerW / result.assumptions.surgeMultiplier),
        hoursDaily: hours,
        quantity: 1,
        usagePeriod: usagePeriod,
        surgeFactor: result.assumptions.surgeMultiplier
    });

    // 4. Trigger the UI switch. The parent should then trigger the backend calculate() or prompt the user.
    onConvertToDetailed();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full animate-in fade-in zoom-in-95 duration-200">
      
      {/* Left Column: Fast Inputs */}
      <div className="col-span-1 lg:col-span-4 space-y-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800 dark:text-slate-100">
             <Zap className="w-6 h-6 text-amber-500" />
             حساب الأمبير السريع
          </h2>

          <div className="space-y-5">
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">الأمبير المطلوب</label>
              <div className="relative">
                <input 
                  type="number" 
                  min="1"
                  value={amperage}
                  onChange={(e) => setAmperage(e.target.value ? parseFloat(e.target.value) : '')}
                  className="w-full text-2xl font-bold px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all dark:text-white"
                  placeholder="مثال: 10"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">A</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">نوع النظام</label>
              <select 
                value={systemType}
                onChange={(e) => setSystemType(e.target.value as any)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white"
              >
                <option value="HYBRID">نظام هجين (Hybrid)</option>
                <option value="OFF_GRID">نظام معزول (Off-Grid)</option>
                <option value="ON_GRID">نظام متصل (On-Grid)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">ساعات التشغيل</label>
                <input 
                  type="number" 
                  min="1" max="24"
                  value={hours}
                  onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">فترة الاستخدام</label>
                <select 
                  value={usagePeriod}
                  onChange={(e) => setUsagePeriod(e.target.value as any)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white text-sm"
                >
                  <option value="both">موزع</option>
                  <option value="day">نهاراً فقط</option>
                  <option value="night">ليلاً فقط</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
              <input 
                type="checkbox" 
                checked={heavySurge}
                onChange={(e) => setHeavySurge(e.target.checked)}
                className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500"
              />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">يوجد أحمال إقلاع عالية (مكيفات، مضخات)</span>
            </label>

          </div>
        </div>
      </div>

      {/* Right Column: Engine Output & Packages */}
      <div className="col-span-1 lg:col-span-8">
        {isCalculating ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-400">
             <Activity className="w-12 h-12 mb-4 animate-pulse text-emerald-500" />
             <p className="font-bold text-lg">جاري حساب فيزياء النظام وتقييم الباقات...</p>
           </div>
        ) : !result ? (
           <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-400">
             <Calculator className="w-12 h-12 mb-4 opacity-20" />
             <p className="font-bold text-lg">أدخل الأمبير لعرض التقديرات فوراً</p>
             <p className="text-sm">هذا الوضع يوفر تسعيراً أولياً تقريبياً</p>
           </div>
        ) : (
           <div className="space-y-6">
             {/* Physics Summary */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
                 <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">القدرة المطلوبة</p>
                 <p className="text-xl font-black text-slate-800 dark:text-white">{result.technical.requiredPowerW.toLocaleString()} W</p>
               </div>
               <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
                 <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">فولتية النظام الموصى بها</p>
                 <p className="text-xl font-black text-slate-800 dark:text-white">{result.technical.suggestedSystemVoltage} V</p>
               </div>
               <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
                 <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">الإنفرتر التقريبي</p>
                 <p className="text-xl font-black text-slate-800 dark:text-white">{result.technical.suggestedInverterSizeW.toLocaleString()} W</p>
               </div>
               <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
                 <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">سعة البطاريات التقريبية</p>
                 <p className="text-xl font-black text-slate-800 dark:text-white">{result.technical.requiredBatteryCapacityAh.toLocaleString()} Ah</p>
               </div>
             </div>

             {/* Pricing Tiers */}
             <div className="max-w-2xl mx-auto">
               {heavySurge && (
                 <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 p-4 rounded-xl flex items-start gap-3 text-sm font-bold">
                   <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                   <p>ملاحظة: تم زيادة حجم الإنفرتر وسعة البطاريات للتعامل مع تيارات الإقلاع العالية (Surge) الخاصة بالمكيفات أو المضخات، مما أدى لارتفاع السعر التقديري لضمان استقرار النظام.</p>
                 </div>
               )}
               {result.packages.map((pkg, idx) => (
                 <div key={pkg.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex flex-col hover:border-emerald-500 transition-colors shadow-sm">
                   <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-2">{pkg.name}</h3>
                   <p className="text-sm text-slate-500 mb-6 leading-relaxed">{pkg.description}</p>
                   
                   <div className="mb-6">
                     <span className="block text-xs font-black uppercase tracking-wider text-rose-500 mb-1">السعر التقديري (غير نهائي)</span>
                     <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{formatPrice(pkg.estimatedPriceUsd)}</span>
                   </div>

                   <ul className="space-y-3 mt-auto text-sm text-slate-700 dark:text-slate-300 font-medium bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                     {pkg.profileRules.map((rule, rIdx) => (
                       <li key={rIdx} className="flex items-start gap-2">
                         <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                         <span>{rule}</span>
                       </li>
                     ))}
                   </ul>
                 </div>
               ))}
             </div>

             {/* Bridge to Engineering Mode */}
             <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
               <div className="flex items-start gap-3 text-blue-800 dark:text-blue-300">
                 <AlertCircle className="w-6 h-6 shrink-0" />
                 <div>
                   <h4 className="font-bold mb-1">هل تحتاج إلى تسعير دقيق ونهائي من الكتالوج؟</h4>
                   <p className="text-sm opacity-80">الأسعار بالأعلى هي تقديرات أولية (Estimated Price) بناءً على معايير السوق العامة. للحصول على الأسعار النهاية الدقيقة، يجب نقل هذه البيانات إلى الوضع الهندسي ليتم جلب مكونات محددة من الكتالوج.</p>
                 </div>
               </div>
               
               <button 
                 onClick={handleConvert}
                 className="whitespace-nowrap flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm"
               >
                 <ArrowLeftRight className="w-4 h-4" />
                 نقل للوضع الهندسي (Detailed Quote)
               </button>
             </div>

           </div>
        )}
      </div>

    </div>
  );
}
