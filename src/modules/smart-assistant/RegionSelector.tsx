import { apiFetch } from '@/src/utils/apiFetch';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectStore } from '../../store/projectStore';
import { MapPin, Sun, Battery, Zap, Clock, Check, X, Minus, Shield, Leaf } from 'lucide-react';
import InfoTooltip from '../../components/InfoTooltip';
import IraqMap from '../../components/IraqMap';

const systemTypes = [
  {
    id: 'hybrid',
    title: 'نظام مرن (هجين)',
    desc: 'يعمل مع الكهرباء الوطنية + ألواح شمسية + بطاريات',
    why: 'الأفضل لمعظم المنازل — يوفر فاتورة الكهرباء ويشتغل عند الانقطاع',
    icon: Zap,
    badge: 'الأكثر شيوعاً',
    badgeColor: 'bg-amber-100 text-amber-700',
    features: { panels: true, batteries: true, grid: true, savings: true },
  },
  {
    id: 'off_grid',
    title: 'نظام مستقل (بدون شبكة)',
    desc: 'يعتمد كلياً على الشمس والبطاريات — بدون كهرباء وطنية',
    why: 'مثالي للمناطق النائية التي لا تصلها الكهرباء الوطنية',
    icon: Sun,
    badge: 'استقلال تام',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    features: { panels: true, batteries: true, grid: false, savings: false },
  },
  {
    id: 'backup',
    title: 'نظام طوارئ (UPS)',
    desc: 'بطاريات + كهرباء وطنية فقط — بدون ألواح شمسية',
    why: 'الأقل تكلفة — يشحن من الكهرباء الوطنية ويشتغل عند الانقطاع',
    icon: Shield,
    badge: 'أقل تكلفة',
    badgeColor: 'bg-blue-100 text-blue-700',
    features: { panels: false, batteries: true, grid: true, savings: false },
  },
  {
    id: 'solar_direct',
    title: 'نظام نهاري (مباشر)',
    desc: 'ألواح شمسية فقط — تعمل بالنهار وتتوقف بالليل',
    why: 'مناسب للمضخات والمكيفات النهارية — لا يحتاج بطاريات',
    icon: Leaf,
    badge: 'اقتصادي',
    badgeColor: 'bg-teal-100 text-teal-700',
    features: { panels: true, batteries: false, grid: false, savings: true },
  },
];

const featureLabels = [
  { key: 'panels', label: 'ألواح شمسية' },
  { key: 'batteries', label: 'بطاريات' },
  { key: 'grid', label: 'كهرباء وطنية' },
  { key: 'savings', label: 'توفير بالفاتورة' },
];

export default function RegionSelector() {
  const { setRegion, setStep, region, systemType, setSystemType, gridHoursOff, setGridHoursOff } = useProjectStore();
  const [regions, setRegions] = useState<any[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  useEffect(() => {
    apiFetch('/api/regions')
      .then(res => res.json())
      .then(setRegions);
  }, []);

  const handleNext = () => {
    if (region) setStep(3);
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-5xl mx-auto pb-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-3 tracking-tight">إعدادات الموقع والنظام</h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg">حدد محافظتك ونوع النظام المناسب لاحتياجاتك</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Region Selection ── */}
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl">
                <MapPin className="w-5 h-5" />
              </div>
              المحافظة
              <InfoTooltip text="اختر محافظتك ليتم تحديد ساعات الشمس المتاحة تلقائياً. كلما زادت ساعات الشمس، قلّ عدد الألواح المطلوبة." />
            </h3>
            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 text-xs">
              <button onClick={() => setViewMode('grid')} className={`px-2.5 py-1 rounded-md font-medium transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow text-amber-600' : 'text-slate-500'}`}>قائمة</button>
              <button onClick={() => setViewMode('map')} className={`px-2.5 py-1 rounded-md font-medium transition-all ${viewMode === 'map' ? 'bg-white dark:bg-slate-600 shadow text-amber-600' : 'text-slate-500'}`}>خريطة</button>
            </div>
          </div>

          {viewMode === 'map' ? (
            <div className="flex justify-center">
              <IraqMap regions={regions} selectedRegion={region} onSelect={setRegion} />
            </div>
          ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {regions.map((r) => {
              const isSelected = region?.id === r.id;
              return (
                <button key={r.id} onClick={() => setRegion(r)}
                  className={`relative p-3 rounded-2xl border text-center transition-all duration-200 group ${isSelected
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 ring-2 ring-amber-500/20 text-amber-800 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-amber-300 text-slate-600 dark:text-slate-300 hover:shadow-sm'
                  }`}
                >
                  <span className={`font-bold block text-base ${isSelected ? 'text-amber-700 dark:text-amber-300' : 'text-slate-700 dark:text-slate-200'}`}>{r.name}</span>
                  <div className={`text-xs mt-1.5 flex items-center justify-center gap-1 font-medium ${isSelected ? 'text-amber-600' : 'text-slate-400 group-hover:text-amber-500'}`}>
                    <Sun className="w-3 h-3" /> {r.sun_hours} ساعات شمس
                  </div>
                  {isSelected && <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />}
                </button>
              );
            })}
          </div>
          )}
        </div>

        {/* ── System Type ── */}
        <div className="space-y-6">
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                  <Zap className="w-5 h-5" />
                </div>
                نوع النظام
                <InfoTooltip text="نوع النظام يحدد كيف تعمل منظومتك. إذا كان عندك كهرباء وطنية وتنقطع كثيراً، اختر النظام المرن (هجين)." />
              </h3>
              <button onClick={() => setShowComparison(!showComparison)} className="text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors">
                {showComparison ? 'إخفاء المقارنة' : 'قارن الأنظمة'}
              </button>
            </div>

            {/* ── Comparison Table ── */}
            <AnimatePresence>
              {showComparison && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          <th className="text-right p-2 text-slate-500 font-medium">الميزة</th>
                          {systemTypes.map(s => (
                            <th key={s.id} className="p-2 text-center font-bold text-slate-700 dark:text-slate-300">{s.title.split('(')[0]}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {featureLabels.map(f => (
                          <tr key={f.key} className="border-t border-slate-200 dark:border-slate-700">
                            <td className="p-2 font-medium text-slate-600 dark:text-slate-400">{f.label}</td>
                            {systemTypes.map(s => (
                              <td key={s.id} className="p-2 text-center">
                                {(s.features as any)[f.key] ? (
                                  <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                                ) : (
                                  <X className="w-4 h-4 text-slate-300 mx-auto" />
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3">
              {systemTypes.map((type) => {
                const isSelected = systemType === type.id;
                return (
                  <button key={type.id} onClick={() => setSystemType(type.id as any)}
                    className={`w-full text-right transition-all duration-200 group rounded-2xl border p-4 ${isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-blue-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl transition-all ${isSelected ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 group-hover:text-blue-500'}`}>
                        <type.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`font-bold text-base ${isSelected ? 'text-blue-900 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>{type.title}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${type.badgeColor}`}>{type.badge}</span>
                        </div>
                        <p className={`text-sm ${isSelected ? 'text-blue-600/80 dark:text-blue-400/80' : 'text-slate-500 dark:text-slate-400'}`}>{type.desc}</p>
                        {isSelected && (
                          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-blue-500 dark:text-blue-400 mt-1 font-medium">
                            💡 {type.why}
                          </motion.p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid Hours Slider */}
          {(systemType === 'hybrid' || systemType === 'backup') && (
            <motion.div initial={{ opacity: 0, height: 0, scale: 0.95 }} animate={{ opacity: 1, height: 'auto', scale: 1 }} className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 relative overflow-hidden">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                ساعات انقطاع الكهرباء
                <InfoTooltip text="كم ساعة تنقطع الكهرباء الوطنية عندكم يومياً؟ هذا يحدد حجم البطاريات المطلوبة. معدل العراق: 8-16 ساعة." />
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">حدد المعدل اليومي — هذا يؤثر مباشرة على عدد البطاريات المطلوبة</p>
              <div className="flex items-center gap-6">
                <input type="range" min="1" max="24" value={gridHoursOff} onChange={(e) => setGridHoursOff(Number(e.target.value))}
                  className="flex-1 h-3 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-amber-500"
                />
                <div className="w-20 text-center font-black text-2xl text-amber-600 bg-white dark:bg-slate-800 py-3 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-800">
                  {gridHoursOff}<span className="text-sm text-amber-500 mr-1">ساعة</span>
                </div>
              </div>
              {/* Contextual hint */}
              <p className="text-xs text-slate-400 mt-3">
                {gridHoursOff <= 6 ? '⚡ انقطاع خفيف — بطاريات صغيرة كافية' :
                 gridHoursOff <= 14 ? '🔋 انقطاع متوسط — هذا المعدل الشائع في العراق' :
                 '⚠️ انقطاع طويل — ستحتاج بطاريات كبيرة'}
              </p>
            </motion.div>
          )}
        </div>
      </div>

      <div className="mt-10 flex justify-between items-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-md p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-800 dark:hover:text-white font-bold px-8 py-4 rounded-2xl hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all">
          العودة
        </button>
        <button onClick={handleNext} disabled={!region} className="bg-gradient-to-l from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-bold px-12 py-4 rounded-2xl shadow-lg shadow-amber-500/30 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center gap-2">
          متابعة للأجهزة
        </button>
      </div>
    </motion.div>
  );
}
