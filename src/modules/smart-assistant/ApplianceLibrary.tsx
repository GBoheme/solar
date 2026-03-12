import { apiFetch } from '@/src/utils/apiFetch';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectStore } from '../../store/projectStore';
import { Plus, Minus, Trash2, Tv, Refrigerator, Fan, Lightbulb, Droplet, Wind, Zap, Users, ShoppingBag, Building2, AlertTriangle, BatteryCharging, ChevronDown, ChevronUp } from 'lucide-react';
import InfoTooltip from '../../components/InfoTooltip';

const iconMap: Record<string, any> = {
  tv: Tv, refrigerator: Refrigerator, fan: Fan, lightbulb: Lightbulb,
  droplet: Droplet, 'air-vent': Wind, default: Zap
};

/* ── Realistic default hours per appliance ── */
const DEFAULT_HOURS: Record<string, number> = {
  'ثلاجة': 24, 'تلفاز': 6, 'مكيف 1 طن': 10, 'مكيف 2 طن': 10,
  'مروحة سقفية': 12, 'إضاءة LED': 7, 'مضخة ماء': 2,
};

/* ── Preset Load Profiles ── */
const PRESETS = [
  {
    id: 'family_small',
    title: 'عائلة صغيرة',
    desc: '2-3 أشخاص — أجهزة أساسية',
    icon: Users,
    color: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
    appliances: [
      { name: 'إضاءة LED', watts: 15, qty: 6, hours_daily: 7 },
      { name: 'مروحة سقفية', watts: 60, qty: 2, hours_daily: 12 },
      { name: 'تلفاز', watts: 100, qty: 1, hours_daily: 5 },
      { name: 'ثلاجة', watts: 200, qty: 1, hours_daily: 24 },
    ],
  },
  {
    id: 'family_medium',
    title: 'عائلة متوسطة',
    desc: '4-6 أشخاص — مكيف + أجهزة',
    icon: Users,
    color: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300',
    appliances: [
      { name: 'إضاءة LED', watts: 15, qty: 10, hours_daily: 7 },
      { name: 'مروحة سقفية', watts: 60, qty: 3, hours_daily: 12 },
      { name: 'تلفاز', watts: 100, qty: 2, hours_daily: 6 },
      { name: 'ثلاجة', watts: 200, qty: 1, hours_daily: 24 },
      { name: 'مكيف 1 طن', watts: 1200, qty: 1, hours_daily: 10 },
      { name: 'مضخة ماء', watts: 750, qty: 1, hours_daily: 2 },
    ],
  },
  {
    id: 'shop',
    title: 'محل تجاري',
    desc: 'إضاءة تجارية + ثلاجة + مكيف',
    icon: ShoppingBag,
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300',
    appliances: [
      { name: 'إضاءة LED', watts: 15, qty: 15, hours_daily: 14 },
      { name: 'مكيف 2 طن', watts: 2400, qty: 1, hours_daily: 12 },
      { name: 'ثلاجة', watts: 200, qty: 2, hours_daily: 24 },
      { name: 'تلفاز', watts: 100, qty: 1, hours_daily: 14 },
    ],
  },
  {
    id: 'office',
    title: 'مكتب صغير',
    desc: 'كمبيوترات + تكييف + إضاءة',
    icon: Building2,
    color: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300',
    appliances: [
      { name: 'إضاءة LED', watts: 15, qty: 12, hours_daily: 10 },
      { name: 'مكيف 1 طن', watts: 1200, qty: 2, hours_daily: 10 },
      { name: 'مروحة سقفية', watts: 60, qty: 2, hours_daily: 10 },
    ],
  },
];

export default function ApplianceLibrary() {
  const { appliances, addAppliance, updateApplianceQty, updateApplianceHours, updateAppliancePeriod, removeAppliance, setStep, projectType } = useProjectStore();
  const [library, setLibrary] = useState<any[]>([]);
  const [showCustom, setShowCustom] = useState(false);
  const [customAmps, setCustomAmps] = useState('');
  const [customVolts, setCustomVolts] = useState('220');

  useEffect(() => {
    apiFetch('/api/appliances').then(res => res.json()).then(setLibrary);
  }, []);

  /* ── Energy Calculations ── */
  const totalDailyWh = appliances.reduce((sum, a) => sum + (a.watts * a.qty * a.hours_daily), 0);
  const totalDailyKwh = totalDailyWh / 1000;
  const monthlyKwh = totalDailyKwh * 30;
  const peakWatts = appliances.reduce((sum, a) => sum + (a.watts * a.qty), 0);

  const handleAddFromLibrary = (app: any) => {
    const defaultHours = DEFAULT_HOURS[app.name] || 4;
    addAppliance({
      id: app.id, name: app.name, watts: app.default_watts,
      qty: 1, hours_daily: defaultHours,
      surge_factor: app.surge_factor || 1.0, type: app.type, icon: app.icon
    });
  };

  const handleLoadPreset = (preset: typeof PRESETS[0]) => {
    // Clear existing and load preset
    appliances.forEach(a => removeAppliance(a.id));
    preset.appliances.forEach((a, i) => {
      addAppliance({
        id: `preset-${preset.id}-${i}`,
        name: a.name, watts: a.watts, qty: a.qty, hours_daily: a.hours_daily,
        surge_factor: 1.0, type: 'AC', icon: 'default'
      });
    });
  };

  const handleAddCustom = () => {
    const amps = parseFloat(customAmps) || 0;
    const volts = parseFloat(customVolts) || 0;
    if (amps <= 0 || volts <= 0) return;
    addAppliance({
      id: `custom-${Date.now()}`,
      name: `حمل مخصص (${amps}A)`,
      watts: Math.round(amps * volts),
      qty: 1, hours_daily: 4, surge_factor: 1.0, type: 'custom', icon: 'default'
    });
    setCustomAmps('');
  };

  /* ── Smart Alerts ── */
  const alerts: string[] = [];
  if (appliances.length > 0 && totalDailyKwh < 0.5) alerts.push('⚠️ الاستهلاك منخفض جداً — هل نسيت إضافة أجهزة؟');
  if (appliances.some(a => a.name.includes('مكيف') && a.hours_daily < 4)) alerts.push('💡 المكيف يعمل عادة 8-12 ساعة يومياً — تحقق من الإعداد');
  if (appliances.some(a => a.name.includes('ثلاجة') && a.hours_daily < 20)) alerts.push('💡 الثلاجة تعمل 24 ساعة متواصلة عادة');

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-3 tracking-tight">ما هي الأجهزة التي تريد تشغيلها؟</h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg">اختر قالب جاهز أو أضف أجهزتك يدوياً — لا تحتاج معرفة تقنية!</p>
      </div>

      {/* ══════ LIVE ENERGY METER ══════ */}
      {appliances.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-gradient-to-l from-amber-500 to-amber-400 dark:from-amber-600 dark:to-amber-500 p-4 rounded-2xl shadow-lg shadow-amber-500/20 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BatteryCharging className="w-6 h-6" />
              <div>
                <span className="text-2xl font-black">{totalDailyKwh.toFixed(1)}</span>
                <span className="text-sm font-medium mr-1">كيلوواط ساعة / يوم</span>
              </div>
            </div>
            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <div className="font-bold text-lg">{monthlyKwh.toFixed(0)}</div>
                <div className="text-white/80 text-xs">كيلوواط / شهر</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{(peakWatts / 1000).toFixed(1)} kW</div>
                <div className="text-white/80 text-xs">ذروة الحمل</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{appliances.length}</div>
                <div className="text-white/80 text-xs">أجهزة</div>
              </div>
            </div>
          </div>
          {/* Energy bar visual */}
          <div className="mt-3 bg-white/20 rounded-full h-2 overflow-hidden">
            <motion.div animate={{ width: `${Math.min(100, (totalDailyKwh / 50) * 100)}%` }} className="h-full bg-white rounded-full" />
          </div>
          <div className="flex justify-between text-[10px] mt-1 text-white/60">
            <span>0 kWh</span><span>منزل صغير</span><span>منزل كبير</span><span>50+ kWh</span>
          </div>
        </motion.div>
      )}

      {/* ══════ SMART ALERTS ══════ */}
      <AnimatePresence>
        {alerts.map((alert, i) => (
          <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />{alert}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ══════ PRESET PROFILES ══════ */}
      {appliances.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            قوالب جاهزة — ابدأ بنقرة واحدة
            <InfoTooltip text="اختر قالب يناسب احتياجاتك وسنضيف كل الأجهزة النموذجية تلقائياً. يمكنك التعديل بعدها!" />
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PRESETS.map((preset) => {
              const Icon = preset.icon;
              return (
                <button key={preset.id} onClick={() => handleLoadPreset(preset)}
                  className={`p-4 rounded-2xl border text-center transition-all hover:shadow-md hover:-translate-y-1 ${preset.color}`}>
                  <Icon className="w-8 h-8 mx-auto mb-2" />
                  <div className="font-bold text-sm">{preset.title}</div>
                  <div className="text-xs mt-1 opacity-75">{preset.desc}</div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Appliance Library Panel ── */}
        <div className="lg:col-span-1 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl p-5 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-700/60">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <div className="w-2 h-6 bg-amber-500 rounded-full" />
            أضف أجهزة
          </h3>
          <div className="space-y-2">
            {library.map((app) => {
              const Icon = iconMap[app.icon] || iconMap.default;
              const defaultH = DEFAULT_HOURS[app.name] || 4;
              return (
                <button key={app.id} onClick={() => handleAddFromLibrary(app)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-900/20 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 transition-colors">
                      <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-amber-600 transition-colors" />
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-sm text-slate-700 dark:text-slate-200 block">{app.name}</span>
                      <span className="text-[10px] text-slate-400">{app.default_watts}W · {defaultH}h/يوم</span>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all">
                    <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Custom Amperage (Collapsed) ── */}
          <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
            <button onClick={() => setShowCustom(!showCustom)} className="w-full flex items-center justify-between text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium transition-colors">
              <span>حمل مخصص (بالأمبير)</span>
              {showCustom ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <AnimatePresence>
              {showCustom && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-2 overflow-hidden">
                  <div className="flex gap-2">
                    <input type="number" value={customAmps} onChange={(e) => setCustomAmps(e.target.value)} placeholder="أمبير" className="flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
                    <input type="number" value={customVolts} onChange={(e) => setCustomVolts(e.target.value)} className="w-20 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
                  </div>
                  <button onClick={handleAddCustom} disabled={!customAmps || parseFloat(customAmps) <= 0}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold rounded-lg transition-colors">
                    إضافة {(parseFloat(customAmps) || 0) * (parseFloat(customVolts) || 0)} واط
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Selected Appliances Panel ── */}
        <div className="lg:col-span-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl p-5 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <div className="w-2 h-6 bg-emerald-500 rounded-full" />
              أجهزتك المختارة
            </h3>
            <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-sm font-bold">
              {appliances.length} أجهزة
            </div>
          </div>

          {appliances.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-slate-400 dark:text-slate-500 border-[1.5px] border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
              <Zap className="w-14 h-14 mx-auto mb-3 opacity-20" />
              <p className="font-semibold text-lg text-slate-500 dark:text-slate-400">اختر قالب جاهز أعلاه للبدء بسرعة ⬆️</p>
              <p className="text-sm mt-1">أو أضف أجهزتك يدوياً من القائمة</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {appliances.map((app) => {
                  const Icon = iconMap[app.icon || 'default'] || iconMap.default;
                  const dailyKwh = (app.watts * app.qty * app.hours_daily) / 1000;
                  return (
                    <motion.div key={app.id} layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col sm:flex-row items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm gap-3"
                    >
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                          <Icon className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm">{app.name}</h4>
                          <div className="flex gap-2 mt-0.5">
                            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{app.watts}W</span>
                            <span className="text-[10px] font-medium text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">{dailyKwh.toFixed(1)} kWh/يوم</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        {/* Quantity */}
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-slate-400 mb-1">العدد</span>
                          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-0.5">
                            <button onClick={() => updateApplianceQty(app.id, Math.max(1, app.qty - 1))} className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded text-slate-500 hover:text-slate-800 transition-all">
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-mono font-bold w-5 text-center text-slate-800 dark:text-white text-sm">{app.qty}</span>
                            <button onClick={() => updateApplianceQty(app.id, app.qty + 1)} className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded text-slate-500 hover:text-slate-800 transition-all">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Hours */}
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-slate-400 mb-1">ساعات/يوم</span>
                          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-0.5">
                            <button onClick={() => updateApplianceHours(app.id, Math.max(1, app.hours_daily - 1))} className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded text-slate-500 hover:text-slate-800 transition-all">
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-mono font-bold w-5 text-center text-slate-800 dark:text-white text-sm">{app.hours_daily}</span>
                            <button onClick={() => updateApplianceHours(app.id, Math.min(24, app.hours_daily + 1))} className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded text-slate-500 hover:text-slate-800 transition-all">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Period */}
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-slate-400 mb-1">وقت التشغيل</span>
                          <select
                            value={app.usage_period || 'both'}
                            onChange={(e) => updateAppliancePeriod(app.id, e.target.value as any)}
                            className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-1 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                          >
                            <option value="both">شامل</option>
                            <option value="day">نهاراً</option>
                            <option value="night">ليلاً</option>
                          </select>
                        </div>

                        <button onClick={() => removeAppliance(app.id)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 flex justify-between items-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-md p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <button onClick={() => setStep(2)} className="text-slate-500 hover:text-slate-800 dark:hover:text-white font-bold px-8 py-4 rounded-2xl hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all">
          العودة للموقع
        </button>
        <button onClick={() => setStep(4)}
          disabled={appliances.length === 0}
          className="bg-gradient-to-l from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-bold px-10 py-4 rounded-2xl shadow-lg shadow-amber-500/30 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center gap-3"
        >
          عرض التوصية والسعر
          <Zap className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}
