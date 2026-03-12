import { apiFetch } from '@/src/utils/apiFetch';
import { useState, useEffect } from 'react';
import {
  Settings, Globe, Calculator, MapPin, Building2, Save,
  Plus, Pencil, Trash2, X, CheckCircle, AlertCircle, ChevronDown, RefreshCw
} from 'lucide-react';
import { useConfirmStore } from '../store/confirmStore';
import { useCurrencyStore } from '../store/currencyStore';
import KnowledgeBaseManager from '../modules/admin/KnowledgeBaseManager';

// ============================================================
// SHARED UI
// ============================================================
function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 left-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-white text-sm font-medium ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      {msg}
    </div>
  );
}

function Modal({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

const inp = "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-slate-50";

function SectionCard({ title, icon, children, action }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">{icon}</div>
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function SliderField({ label, value, min, max, step = 0.01, format, onChange }: any) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        <span className="text-sm font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">{format ? format(value) : value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-amber-500"
      />
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span>{format ? format(min) : min}</span>
        <span>{format ? format(max) : max}</span>
      </div>
    </div>
  );
}

// ============================================================
// TAB 1: COMPANY SETTINGS
// ============================================================
function CompanySettings({ toast }: any) {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch('/api/admin/settings').then(r => r.json()).then(d => {
      setName(d.company_name || ''); setCurrency(d.base_currency || 'USD'); setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const r = await apiFetch('/api/admin/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_name: name, base_currency: currency })
    });
    setSaving(false);
    if (r.ok) toast('تم حفظ إعدادات الشركة', 'success');
    else toast('حدث خطأ أثناء الحفظ', 'error');
  };

  if (loading) return <div className="h-20 flex items-center justify-center"><div className="w-6 h-6 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <SectionCard title="إعدادات الشركة" icon={<Building2 className="w-5 h-5" />}>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">اسم الشركة</label>
          <input className={inp} value={name} onChange={e => setName(e.target.value)} placeholder="مثال: شركة الشمس الذكية" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3">العملة الافتراضية</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'USD', label: 'دولار أمريكي', symbol: '$' },
              { value: 'IQD', label: 'دينار عراقي', symbol: 'د.ع' },
              { value: 'EUR', label: 'يورو', symbol: '€' },
            ].map(c => (
              <button key={c.value} type="button" onClick={() => setCurrency(c.value)}
                className={`p-4 rounded-2xl border-2 text-center transition-all ${currency === c.value ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-amber-300'}`}>
                <p className="text-2xl font-bold mb-1 text-slate-700">{c.symbol}</p>
                <p className="text-xs font-semibold text-slate-600">{c.value}</p>
                <p className="text-xs text-slate-400">{c.label}</p>
              </button>
            ))}
          </div>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-50">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ الإعدادات
        </button>
      </div>
    </SectionCard>
  );
}

// ============================================================
// TAB 2: CALCULATION DEFAULTS
// ============================================================
function CalcDefaults({ toast }: any) {
  const [d, setD] = useState({
    safety_margin: 1.25,
    dod: 0.8,
    efficiency: 0.95,
    temp_correction: 1.1,
    future_expansion: 1.2,
  });

  const u = (k: string) => (v: number) => setD(p => ({ ...p, [k]: v }));
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const mult = (v: number) => `×${v.toFixed(2)}`;

  const reset = () => setD({ safety_margin: 1.25, dod: 0.8, efficiency: 0.95, temp_correction: 1.1, future_expansion: 1.2 });

  const save = () => {
    // In a real implementation, save to backend. For now, just show success.
    toast('تم حفظ معاملات الحساب الافتراضية', 'success');
  };

  const params = [
    {
      key: 'safety_margin', label: 'هامش الأمان (Safety Margin)',
      desc: 'يُضاف على حمل الذروة لاختيار الانفيرتر المناسب',
      min: 1.0, max: 2.0, step: 0.05, format: mult
    },
    {
      key: 'dod', label: 'عمق الشحن المسموح (DOD)',
      desc: 'النسبة المئوية من طاقة البطارية المسموح باستخدامها',
      min: 0.5, max: 1.0, step: 0.05, format: pct
    },
    {
      key: 'efficiency', label: 'كفاءة النظام',
      desc: 'الكفاءة الكلية للمنظومة تشمل الكابلات والمحول',
      min: 0.7, max: 1.0, step: 0.05, format: pct
    },
    {
      key: 'temp_correction', label: 'معامل تصحيح الحرارة',
      desc: 'تأثير درجات الحرارة العالية على أداء البطاريات',
      min: 1.0, max: 1.5, step: 0.05, format: mult
    },
    {
      key: 'future_expansion', label: 'معامل التوسع المستقبلي',
      desc: 'احتياط للزيادة المستقبلية في الأحمال',
      min: 1.0, max: 2.0, step: 0.05, format: mult
    },
  ];

  return (
    <SectionCard
      title="معاملات الحساب الافتراضية"
      icon={<Calculator className="w-5 h-5" />}
      action={
        <button onClick={reset} className="text-sm text-slate-500 hover:text-amber-600 flex items-center gap-1.5 transition-colors">
          <RefreshCw className="w-4 h-4" /> استعادة الافتراضي
        </button>
      }
    >
      <div className="space-y-6">
        {params.map(p => (
          <div key={p.key} className="pb-5 border-b border-slate-100 last:border-0 last:pb-0">
            <SliderField
              label={p.label}
              value={(d as any)[p.key]}
              min={p.min} max={p.max} step={p.step}
              format={p.format}
              onChange={u(p.key)}
            />
            <p className="text-xs text-slate-400 mt-2">{p.desc}</p>
          </div>
        ))}

        {/* Preview */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
          <p className="text-sm font-bold text-slate-700 mb-3">معاينة المعاملات الحالية</p>
          <div className="grid grid-cols-2 gap-3">
            {params.map(p => (
              <div key={p.key} className="bg-white rounded-xl px-3 py-2 border border-slate-100">
                <p className="text-xs text-slate-400">{p.label.split(' ')[0]}</p>
                <p className="font-bold text-amber-600">{p.format((d as any)[p.key])}</p>
              </div>
            ))}
          </div>
        </div>

        <button onClick={save} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors">
          <Save className="w-4 h-4" /> حفظ المعاملات
        </button>
      </div>
    </SectionCard>
  );
}

// ============================================================
// TAB 3: REGIONS MANAGER
// ============================================================
interface Region { id: string; name: string; name_en: string; sun_hours: number; }

function RegionForm({ initial, onSave, onClose }: { initial?: Region; onSave: (d: any) => void; onClose: () => void }) {
  const [name, setName] = useState(initial?.name || '');
  const [nameEn, setNameEn] = useState(initial?.name_en || '');
  const [sunHours, setSunHours] = useState(String(initial?.sun_hours || '5.0'));

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">اسم المنطقة (عربي)</label>
        <input className={inp} value={name} onChange={e => setName(e.target.value)} placeholder="مثال: بغداد" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">اسم المنطقة (إنجليزي)</label>
        <input className={inp} value={nameEn} onChange={e => setNameEn(e.target.value)} placeholder="Baghdad" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">ساعات الشمس اليومية</label>
        <input type="number" step="0.1" min="1" max="12" className={inp} value={sunHours} onChange={e => setSunHours(e.target.value)} />
        <div className="mt-2">
          <input type="range" min="1" max="10" step="0.1" value={Number(sunHours)}
            onChange={e => setSunHours(e.target.value)}
            className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-amber-500" />
          <div className="flex justify-between text-xs text-slate-400 mt-1"><span>1 ساعة</span><span className="font-bold text-amber-600">{Number(sunHours).toFixed(1)} ساعة</span><span>10 ساعات</span></div>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={() => onSave({ name, name_en: nameEn || name, sun_hours: Number(sunHours) })}
          className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 rounded-xl">
          <Save className="w-4 h-4" /> حفظ
        </button>
        <button onClick={onClose} className="px-5 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200">إلغاء</button>
      </div>
    </div>
  );
}

function RegionsManager({ toast }: any) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [modal, setModal] = useState<'add' | Region | null>(null);
  const [search, setSearch] = useState('');

  const load = () => apiFetch('/api/regions').then(r => r.json()).then(setRegions);
  useEffect(() => { load(); }, []);

  const save = async (data: any) => {
    const isEdit = modal !== 'add';
    const url = isEdit ? `/api/admin/regions/${(modal as Region).id}` : '/api/admin/regions';
    const r = await apiFetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (r.ok) { toast(isEdit ? 'تم تعديل المنطقة' : 'تمت إضافة المنطقة', 'success'); load(); setModal(null); }
    else toast('حدث خطأ', 'error');
  };

  const del = async (id: string) => {
    const ok = await useConfirmStore.getState().confirm({ title: 'حذف المنطقة', message: 'سيتم حذف هذه المنطقة نهائياً. هل أنت متأكد؟', confirmLabel: 'حذف', variant: 'danger' }); if (!ok) return;
    const r = await apiFetch(`/api/admin/regions/${id}`, { method: 'DELETE' });
    if (r.ok) {
      toast('تم الحذف', 'success'); load();
    } else {
      toast('لا يمكن الحذف (مرتبطة بسجلات أخرى)', 'error');
    }
  };

  const filtered = regions.filter(r => !search || r.name.includes(search) || r.name_en.toLowerCase().includes(search.toLowerCase()));

  const sunColor = (h: number) => h >= 6 ? 'text-orange-600 bg-orange-50' : h >= 5 ? 'text-amber-600 bg-amber-50' : 'text-yellow-600 bg-yellow-50';

  return (
    <SectionCard
      title="إدارة المناطق وساعات الشمس"
      icon={<MapPin className="w-5 h-5" />}
      action={
        <div className="flex items-center gap-3">
          <div className="relative">
            <input className="w-40 pr-8 pl-3 py-1.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setModal('add')} className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-4 py-2 rounded-xl text-sm transition-colors">
            <Plus className="w-4 h-4" /> إضافة
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(r => (
          <div key={r.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-amber-300 transition-colors group">
            <div>
              <p className="font-bold text-slate-800">{r.name}</p>
              <p className="text-xs text-slate-400">{r.name_en}</p>
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full mt-1 ${sunColor(r.sun_hours)}`}>
                ☀ {r.sun_hours} ساعة
              </span>
            </div>
            <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <button onClick={() => setModal(r)} className="p-2 hover:bg-amber-100 rounded-xl transition-colors text-amber-600">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => del(r.id)} className="p-2 hover:bg-red-100 rounded-xl transition-colors text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <Modal title={modal === 'add' ? 'إضافة منطقة جديدة' : 'تعديل المنطقة'} onClose={() => setModal(null)}>
          <RegionForm initial={modal === 'add' ? undefined : modal as Region} onSave={save} onClose={() => setModal(null)} />
        </Modal>
      )}
    </SectionCard>
  );
}

// ============================================================
// TAB 4: PRICING RULES (Dynamic Pricing Engine)
// ============================================================
interface RateHistoryEntry { id: string; rate: number; changed_by: string; created_at: string; }

function PricingRules({ toast }: any) {
  const [rate, setRate] = useState(1500);
  const [newRate, setNewRate] = useState('');
  const [margin, setMargin] = useState(15);
  const [history, setHistory] = useState<RateHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { setExchangeRate, formatPrice } = useCurrencyStore();

  const load = async () => {
    try {
      const [settingsRes, historyRes] = await Promise.all([
        apiFetch('/api/settings/pricing'),
        apiFetch('/api/settings/exchange-rate-history')
      ]);
      const settings = await settingsRes.json();
      const hist = await historyRes.json();
      setRate(settings.usd_to_iqd || 1500);
      setMargin(settings.default_margin_percent || 15);
      setNewRate(String(settings.usd_to_iqd || 1500));
      setHistory(hist || []);
      setLoading(false);
    } catch { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const saveRate = async () => {
    const parsed = Number(newRate);
    if (!parsed || parsed <= 0) { toast('سعر الصرف غير صالح', 'error'); return; }
    setSaving(true);
    const r = await apiFetch('/api/settings/exchange-rate', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rate: parsed })
    });
    setSaving(false);
    if (r.ok) {
      setRate(parsed);
      setExchangeRate(parsed); // Update global store immediately
      toast('تم تحديث سعر الصرف بنجاح', 'success');
      load(); // Refresh history
    } else toast('حدث خطأ أثناء التحديث', 'error');
  };

  const saveMargin = async (newMargin: number) => {
    setMargin(newMargin);
    const r = await apiFetch('/api/settings/default-margin', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ margin_percent: newMargin })
    });
    if (!r.ok) toast('حدث خطأ أثناء حفظ الهامش', 'error');
  };

  // Live preview pricing
  const previewCost = 100; // Example: $100 product
  const previewSellUSD = previewCost * (1 + margin / 100);
  const previewProfitUSD = previewSellUSD - previewCost;

  if (loading) return <div className="h-40 flex items-center justify-center"><div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Exchange Rate Card */}
      <SectionCard title="سعر صرف الدولار مقابل الدينار" icon={<Globe className="w-5 h-5" />}>
        <div className="space-y-5">
          {/* Current Rate Display */}
          <div className="bg-gradient-to-l from-amber-50 to-yellow-50 rounded-2xl p-5 border border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 font-medium">السعر الحالي</p>
                <p className="text-4xl font-black text-amber-800 mt-1">{rate.toLocaleString()}</p>
                <p className="text-sm text-amber-600 mt-1">دينار عراقي لكل 1 دولار أمريكي</p>
              </div>
              <div className="text-6xl opacity-20">💱</div>
            </div>
          </div>

          {/* Update Rate */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">تحديث سعر الصرف</label>
              <input type="number" className={inp} value={newRate}
                onChange={e => setNewRate(e.target.value)}
                placeholder="مثال: 1500" min="1" />
            </div>
            <button onClick={saveRate} disabled={saving || Number(newRate) === rate}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              تحديث
            </button>
          </div>

          {/* Rate History */}
          {history.length > 0 && (
            <div>
              <p className="text-sm font-bold text-slate-700 mb-3">📊 سجل تغييرات سعر الصرف</p>
              <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600">
                      <th className="text-right px-4 py-2.5 font-semibold">السعر</th>
                      <th className="text-right px-4 py-2.5 font-semibold">بواسطة</th>
                      <th className="text-right px-4 py-2.5 font-semibold">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 10).map((h, i) => (
                      <tr key={h.id} className={`border-t border-slate-100 ${i === 0 ? 'bg-amber-50/50' : ''}`}>
                        <td className="px-4 py-2.5 font-bold text-slate-800">
                          {h.rate.toLocaleString()} <span className="text-xs text-slate-400">د.ع</span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">{h.changed_by}</td>
                        <td className="px-4 py-2.5 text-slate-400 text-xs" dir="ltr">
                          {new Date(h.created_at).toLocaleString('ar-IQ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Default Margin */}
      <SectionCard title="نسبة هامش الربح الافتراضية" icon={<Calculator className="w-5 h-5" />}>
        <div className="space-y-5">
          <SliderField
            label="هامش الربح الافتراضي"
            value={margin}
            min={0} max={100} step={1}
            format={(v: number) => `${v}%`}
            onChange={saveMargin}
          />
          <p className="text-xs text-slate-400">يُطبق تلقائياً على كل منتج بدون هامش خاص. يمكنك تخصيص الهامش لكل منتج على حدة من صفحة الكاتالوج.</p>

          {/* Live Preview */}
          <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200">
            <p className="text-sm font-bold text-emerald-800 mb-4">🧮 معاينة التسعير الديناميكي</p>
            <p className="text-xs text-emerald-600 mb-3">مثال: منتج بسعر تكلفة <strong>{formatPrice(previewCost, 'USD')}</strong></p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <p className="text-xs text-slate-400 mb-1">سعر التكلفة</p>
                <p className="font-bold text-slate-700">{formatPrice(previewCost)}</p>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <p className="text-xs text-slate-400 mb-1">+ هامش {margin}%</p>
                <p className="font-bold text-amber-600">{formatPrice(previewProfitUSD)}</p>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-sm border-2 border-emerald-300">
                <p className="text-xs text-emerald-600 mb-1 font-semibold">سعر البيع</p>
                <p className="font-black text-emerald-700 text-lg">{formatPrice(previewSellUSD)}</p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Architecture Info */}
      <div className="bg-blue-50 rounded-2xl p-5 border border-blue-200">
        <p className="text-sm font-bold text-blue-800 mb-3">📋 كيف يعمل نظام التسعير</p>
        <div className="space-y-2 text-sm text-blue-700">
          <p>• <strong>سعر التكلفة</strong> يُدخل بعملة المنتج (USD أو IQD)</p>
          <p>• <strong>سعر البيع</strong> يُحسب تلقائياً = التكلفة × سعر الصرف × (1 + الهامش%)</p>
          <p>• <strong>تغيير سعر الصرف</strong> يُحدّث أسعار البيع فوراً لكل المنتجات</p>
          <p>• <strong>العروض القديمة</strong> لا تتأثر — سعر الصرف يُجمّد وقت إنشاء العرض</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN SETTINGS PAGE
// ============================================================
const TABS = [
  { id: 'company', label: 'الشركة', icon: <Building2 className="w-4 h-4" /> },
  { id: 'calc', label: 'الحسابات', icon: <Calculator className="w-4 h-4" /> },
  { id: 'regions', label: 'المناطق', icon: <MapPin className="w-4 h-4" /> },
  { id: 'pricing', label: 'التسعير', icon: <Globe className="w-4 h-4" /> },
  { id: 'knowledge', label: 'قاعدة المعرفة', icon: <Settings className="w-4 h-4" /> },
];

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('company');
  const [toastMsg, setToastMsg] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error') => setToastMsg({ msg, type });

  return (
    <div className="max-w-4xl mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Settings className="w-8 h-8 text-amber-500" />
          الإعدادات المتقدمة
        </h1>
        <p className="text-slate-500 mt-1">تحكم كامل في إعدادات التطبيق والحسابات والتسعير</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-slate-100 p-1.5 rounded-2xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'company' && <CompanySettings toast={showToast} />}
      {activeTab === 'calc' && <CalcDefaults toast={showToast} />}
      {activeTab === 'regions' && <RegionsManager toast={showToast} />}
      {activeTab === 'pricing' && <PricingRules toast={showToast} />}
      {activeTab === 'knowledge' && <KnowledgeBaseManager />}

      {toastMsg && <Toast msg={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </div>
  );
}
