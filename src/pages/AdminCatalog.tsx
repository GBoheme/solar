import { apiFetch } from '@/src/utils/apiFetch';
import { useState, useEffect } from 'react';
import {
  Battery, Sun, Zap, Gauge, Lightbulb, Plus, Pencil, Trash2,
  X, Save, Search, AlertCircle, CheckCircle, ChevronDown, Tag
} from 'lucide-react';
import { useConfirmStore } from '../store/confirmStore';
import { useCurrencyStore } from '../store/currencyStore';
import { SkeletonCard } from '../components/Skeleton';

type Category = 'battery' | 'panel' | 'inverter' | 'controller' | 'appliance' | 'abpe' | 'pricing';

interface Component {
  id: string; sku: string; category: string; brand: string; model: string;
  spec: Record<string, any>; cost_price: number; sale_price: number;
  currency: string; stock_qty: number; margin_percent: number | null;
  sell_price_iqd?: number; cost_price_iqd?: number; effective_margin?: number; exchange_rate?: number;
}
interface Appliance {
  id: string; name: string; name_en: string; icon: string;
  default_watts: number; surge_factor: number; type: string;
}

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
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: any) {
  return <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>{children}</div>;
}

const inp = "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-slate-50";

function RadioGroup({ options, value, onChange }: any) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o: any) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${value === o.value ? 'bg-amber-500 text-slate-900 border-amber-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-amber-300'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function InfoCell({ label, value, green }: any) {
  return (
    <div className="bg-slate-50 rounded-xl px-3 py-2">
      <p className="text-slate-400 text-xs mb-0.5">{label}</p>
      <p className={`font-bold text-sm ${green ? 'text-emerald-600' : 'text-slate-700'}`}>{value}</p>
    </div>
  );
}

function StockBadge({ qty }: { qty: number }) {
  const color = qty === 0 ? 'bg-red-100 text-red-700' : qty <= 5 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600';
  return <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${color}`}>{qty}</span>;
}

function CardActions({ onEdit, onDelete }: any) {
  return (
    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
      <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">
        <Pencil className="w-4 h-4" /> تعديل
      </button>
      <button onClick={onDelete} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function AddCard({ onClick, label }: any) {
  return (
    <button onClick={onClick}
      className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-5 hover:border-amber-400 hover:bg-amber-50 transition-all flex flex-col items-center justify-center gap-2 min-h-[180px] group">
      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
        <Plus className="w-6 h-6 text-slate-400 group-hover:text-amber-500" />
      </div>
      <span className="text-sm font-medium text-slate-400 group-hover:text-amber-600">{label}</span>
    </button>
  );
}

function TabHeader({ title, onAdd, search, onSearch, count }: any) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{count}</span>
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="relative flex-1 sm:flex-none">
          <Search className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-slate-400" />
          <input className="w-full sm:w-52 pr-9 pl-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="بحث..." value={search} onChange={e => onSearch(e.target.value)} />
        </div>
        <button onClick={onAdd} className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-4 py-2 rounded-xl transition-colors whitespace-nowrap">
          <Plus className="w-4 h-4" /> إضافة
        </button>
      </div>
    </div>
  );
}

function useCRUD(apiPath: string, parseSpec = true) {
  const [items, setItems] = useState<any[]>([]);
  const load = () => apiFetch(apiPath).then(r => r.json()).then(setItems);
  useEffect(() => { load(); }, [apiPath]);
  return { items, load };
}

// ===== BATTERIES =====
function BatteryForm({ initial, onSave, onClose }: any) {
  const s = initial?.spec || {};
  const [f, setF] = useState({
    brand: initial?.brand || '', model: initial?.model || '', voltage: String(s.V || '48'),
    capacity: String(s.Ah || ''), chemistry: initial?.battery_chemistry || 'GEL', cost: String(initial?.cost_price ?? ''),
    margin: String(initial?.margin_percent ?? ''), currency: initial?.currency || 'USD', stock: String(initial?.stock_qty || '0')
  });
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }));
  const submit = () => onSave({
    category: 'battery', brand: f.brand, model: f.model,
    spec: { Ah: +f.capacity, V: +f.voltage, type: f.chemistry }, cost_price: +f.cost,
    margin_percent: f.margin ? +f.margin : null,
    currency: f.currency, stock_qty: +f.stock, sku: initial?.sku, is_active: 1,
    battery_chemistry: f.chemistry
  });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="الماركة"><input className={inp} value={f.brand} onChange={e => u('brand')(e.target.value)} placeholder="مثال: BatCo" /></Field>
        <Field label="الموديل"><input className={inp} value={f.model} onChange={e => u('model')(e.target.value)} /></Field>
      </div>
      <Field label="الفولتية (V)"><RadioGroup options={[{ label: '12V', value: '12' }, { label: '24V', value: '24' }, { label: '48V', value: '48' }]} value={f.voltage} onChange={u('voltage')} /></Field>
      <Field label="السعة (Ah)"><input type="number" className={inp} value={f.capacity} onChange={e => u('capacity')(e.target.value)} placeholder="200" /></Field>
      <Field label="التكنولوجيا (Chemistry)"><RadioGroup options={[{ label: 'LITHIUM', value: 'LITHIUM' }, { label: 'GEL', value: 'GEL' }, { label: 'LEAD_ACID', value: 'LEAD_ACID' }, { label: 'TUBULAR', value: 'TUBULAR' }]} value={f.chemistry} onChange={u('chemistry')} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="سعر التكلفة ($)"><input type="number" className={inp} value={f.cost} onChange={e => u('cost')(e.target.value)} placeholder="مثال: 800" /></Field>
        <Field label="هامش الربح % (اختياري)"><input type="number" className={inp} value={f.margin} onChange={e => u('margin')(e.target.value)} placeholder="يستخدم الافتراضي" /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="العملة"><RadioGroup options={[{ label: 'USD', value: 'USD' }, { label: 'IQD', value: 'IQD' }]} value={f.currency} onChange={u('currency')} /></Field>
        <Field label="الكمية"><input type="number" className={inp} value={f.stock} onChange={e => u('stock')(e.target.value)} /></Field>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={submit} className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 rounded-xl"><Save className="w-4 h-4" /> حفظ</button>
        <button onClick={onClose} className="px-5 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200">إلغاء</button>
      </div>
    </div>
  );
}

function BatteriesTab({ toast }: any) {
  const [items, setItems] = useState<Component[]>([]);
  const [modal, setModal] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { formatPrice, exchangeRate } = useCurrencyStore();
  const load = () => {
    setLoading(true);
    apiFetch('/api/admin/components?category=battery').then(r => r.json()).then(d => { setItems(d); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  const save = async (data: any) => {
    const isEdit = modal !== 'add';
    const r = await apiFetch(isEdit ? `/api/admin/components/${modal.id}` : '/api/admin/components',
      { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (r.ok) { toast(isEdit ? 'تم التعديل' : 'تمت الإضافة', 'success'); load(); setModal(null); } else toast('خطأ', 'error');
  };
  const del = async (id: string) => {
    const ok = await useConfirmStore.getState().confirm({ title: 'حذف البطارية', message: 'سيتم حذف هذه البطارية نهائياً. هل أنت متأكد؟', confirmLabel: 'حذف', variant: 'danger' }); if (!ok) return;
    const r = await apiFetch(`/api/admin/components/${id}`, { method: 'DELETE' });
    if (r.ok) {
      toast('تم الحذف', 'success'); load();
    } else {
      const err = await r.json();
      if (err.error === 'LINKED_QUOTES') {
        const list = err.quotes.map((q: any) => `- ${q.client_name} (${q.date})`).join('\n');
        toast(`لا يمكن الحذف — البطارية مستخدمة في ${err.quotes.length} عرض سعر`, 'error');
      } else {
        toast('خطأ أثناء الحذف', 'error');
      }
    }
  };
  const filtered = items.filter(i => !search || `${i.brand} ${i.model}`.toLowerCase().includes(search.toLowerCase()));
  const btColors: any = { 'LITHIUM': 'bg-emerald-100 text-emerald-700', 'GEL': 'bg-blue-100 text-blue-700', 'TUBULAR': 'bg-purple-100 text-purple-700', 'LEAD_ACID': 'bg-orange-100 text-orange-700' };
  return (
    <div>
      <TabHeader title="البطاريات" onAdd={() => setModal('add')} search={search} onSearch={setSearch} count={items.length} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />) : filtered.map(item => (
          <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div><p className="font-bold text-slate-800">{item.brand}</p><p className="text-sm text-slate-500">{item.model}</p></div>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${btColors[item.battery_chemistry || item.spec.type] || 'bg-slate-100 text-slate-600'}`}>{item.battery_chemistry || item.spec.type}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InfoCell label="السعة" value={`${item.spec.Ah} Ah`} />
              <InfoCell label="الجهد" value={`${item.spec.V} V`} />
              <InfoCell label="التكلفة" value={formatPrice(item.currency === 'USD' ? item.cost_price : item.cost_price / exchangeRate, item.currency as any)} />
              <InfoCell label="سعر البيع" value={formatPrice(item.sale_price || (item.sell_price_iqd || 0) / exchangeRate)} green />
            </div>
            <CardActions onEdit={() => setModal(item)} onDelete={() => del(item.id)} />
          </div>
        ))}
        <AddCard onClick={() => setModal('add')} label="بطارية جديدة" />
      </div>
      {modal && <Modal title={modal === 'add' ? 'إضافة بطارية' : 'تعديل البطارية'} onClose={() => setModal(null)}>
        <BatteryForm initial={modal === 'add' ? undefined : modal} onSave={save} onClose={() => setModal(null)} />
      </Modal>}
    </div>
  );
}

// ===== PANELS =====
function PanelForm({ initial, onSave, onClose }: any) {
  const s = initial?.spec || {};
  const [f, setF] = useState({
    brand: initial?.brand || '', model: initial?.model || '', watts: String(s.w || ''), voc: String(s.Voc || ''),
    cost: String(initial?.cost_price ?? ''), margin: String(initial?.margin_percent ?? ''), currency: initial?.currency || 'USD', stock: String(initial?.stock_qty || '0')
  });
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }));
  const submit = () => onSave({
    category: 'panel', brand: f.brand, model: f.model, spec: { w: +f.watts, Voc: +f.voc },
    cost_price: +f.cost, margin_percent: f.margin ? +f.margin : null, currency: f.currency, stock_qty: +f.stock, sku: initial?.sku, is_active: 1
  });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="الماركة"><input className={inp} value={f.brand} onChange={e => u('brand')(e.target.value)} /></Field>
        <Field label="الموديل"><input className={inp} value={f.model} onChange={e => u('model')(e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="القدرة (W)"><input type="number" className={inp} value={f.watts} onChange={e => u('watts')(e.target.value)} /></Field>
        <Field label="Voc (V)"><input type="number" className={inp} value={f.voc} onChange={e => u('voc')(e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="سعر التكلفة ($)"><input type="number" className={inp} value={f.cost} onChange={e => u('cost')(e.target.value)} placeholder="مثال: 110" /></Field>
        <Field label="هامش الربح % (اختياري)"><input type="number" className={inp} value={f.margin} onChange={e => u('margin')(e.target.value)} placeholder="يستخدم الافتراضي" /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="العملة"><RadioGroup options={[{ label: 'USD', value: 'USD' }, { label: 'IQD', value: 'IQD' }]} value={f.currency} onChange={u('currency')} /></Field>
        <Field label="الكمية"><input type="number" className={inp} value={f.stock} onChange={e => u('stock')(e.target.value)} /></Field>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={submit} className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 rounded-xl"><Save className="w-4 h-4" /> حفظ</button>
        <button onClick={onClose} className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200">إلغاء</button>
      </div>
    </div>
  );
}

function PanelsTab({ toast }: any) {
  const [items, setItems] = useState<Component[]>([]); const [modal, setModal] = useState<any>(null); const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { formatPrice, exchangeRate } = useCurrencyStore();
  const load = () => { setLoading(true); apiFetch('/api/admin/components?category=panel').then(r => r.json()).then(d => { setItems(d); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(() => { load(); }, []);
  const save = async (data: any) => { const isEdit = modal !== 'add'; const r = await apiFetch(isEdit ? `/api/admin/components/${modal.id}` : '/api/admin/components', { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (r.ok) { toast(isEdit ? 'تم التعديل' : 'تمت الإضافة', 'success'); load(); setModal(null); } else toast('خطأ', 'error'); };
  const del = async (id: string) => {
    const ok = await useConfirmStore.getState().confirm({ title: 'تأكيد الحذف', message: 'سيتم حذف هذا المكون نهائياً. هل أنت متأكد؟', confirmLabel: 'حذف', variant: 'danger' }); if (!ok) return;
    const r = await apiFetch(`/api/admin/components/${id}`, { method: 'DELETE' });
    if (r.ok) {
      toast('تم الحذف', 'success'); load();
    } else {
      const err = await r.json();
      if (err.error === 'LINKED_QUOTES') {
        const list = err.quotes.map((q: any) => `- ${q.client_name} (${q.date})`).join('\n');
        toast(`لا يمكن الحذف — اللوح مستخدم في ${err.quotes.length} عرض سعر`, 'error');
      } else {
        toast('لا يمكن الحذف', 'error');
      }
    }
  };
  const filtered = items.filter(i => !search || `${i.brand} ${i.model}`.toLowerCase().includes(search.toLowerCase()));
  return (<div>
    <TabHeader title="الألواح الشمسية" onAdd={() => setModal('add')} search={search} onSearch={setSearch} count={items.length} />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {loading ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />) : filtered.map(item => (<div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center"><Sun className="w-5 h-5 text-amber-600" /></div>
          <div><p className="font-bold text-slate-800">{item.brand}</p><p className="text-sm text-slate-500">{item.model}</p></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <InfoCell label="القدرة" value={`${item.spec.w} W`} />
          <InfoCell label="Voc" value={`${item.spec.Voc || '—'} V`} />
          <InfoCell label="التكلفة" value={formatPrice(item.currency === 'USD' ? item.cost_price : item.cost_price / exchangeRate, item.currency as any)} />
          <InfoCell label="سعر البيع" value={formatPrice(item.sale_price || (item.sell_price_iqd || 0) / exchangeRate)} green />
        </div>
        <CardActions onEdit={() => setModal(item)} onDelete={() => del(item.id)} />
      </div>))}
      <AddCard onClick={() => setModal('add')} label="لوح جديد" />
    </div>
    {modal && <Modal title={modal === 'add' ? 'إضافة لوح' : 'تعديل اللوح'} onClose={() => setModal(null)}><PanelForm initial={modal === 'add' ? undefined : modal} onSave={save} onClose={() => setModal(null)} /></Modal>}
  </div>);
}

// ===== INVERTERS =====
function InverterForm({ initial, onSave, onClose }: any) {
  const s = initial?.spec || {};
  const [f, setF] = useState({ brand: initial?.brand || '', model: initial?.model || '', watts: String(s.W || ''), voltage: String(s.V || '48'), type: s.type || 'Hybrid', cost: String(initial?.cost_price ?? ''), margin: String(initial?.margin_percent ?? ''), currency: initial?.currency || 'USD', stock: String(initial?.stock_qty || '0') });
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }));
  const submit = () => onSave({ category: 'inverter', brand: f.brand, model: f.model, spec: { W: +f.watts, V: +f.voltage, type: f.type }, cost_price: +f.cost, margin_percent: f.margin ? +f.margin : null, currency: f.currency, stock_qty: +f.stock, sku: initial?.sku, is_active: 1 });
  return (<div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Field label="الماركة"><input className={inp} value={f.brand} onChange={e => u('brand')(e.target.value)} /></Field><Field label="الموديل"><input className={inp} value={f.model} onChange={e => u('model')(e.target.value)} /></Field></div>
    <Field label="القدرة (W)"><input type="number" className={inp} value={f.watts} onChange={e => u('watts')(e.target.value)} /></Field>
    <Field label="جهد الدخل (V)"><RadioGroup options={[{ label: '12V', value: '12' }, { label: '24V', value: '24' }, { label: '48V', value: '48' }]} value={f.voltage} onChange={u('voltage')} /></Field>
    <Field label="النوع"><RadioGroup options={[{ label: 'Hybrid', value: 'Hybrid' }, { label: 'Off-Grid', value: 'Off-Grid' }, { label: 'Grid-Tie', value: 'Grid-Tie' }]} value={f.type} onChange={u('type')} /></Field>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Field label="سعر التكلفة ($)"><input type="number" className={inp} value={f.cost} onChange={e => u('cost')(e.target.value)} placeholder="مثال: 400" /></Field><Field label="هامش الربح % (اختياري)"><input type="number" className={inp} value={f.margin} onChange={e => u('margin')(e.target.value)} placeholder="يستخدم الافتراضي" /></Field></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Field label="العملة"><RadioGroup options={[{ label: 'USD', value: 'USD' }, { label: 'IQD', value: 'IQD' }]} value={f.currency} onChange={u('currency')} /></Field><Field label="الكمية"><input type="number" className={inp} value={f.stock} onChange={e => u('stock')(e.target.value)} /></Field></div>
    <div className="flex gap-3 pt-2"><button onClick={submit} className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 rounded-xl"><Save className="w-4 h-4" /> حفظ</button><button onClick={onClose} className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200">إلغاء</button></div>
  </div>);
}

function InvertersTab({ toast }: any) {
  const [items, setItems] = useState<Component[]>([]); const [modal, setModal] = useState<any>(null); const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { formatPrice, exchangeRate } = useCurrencyStore();
  const load = () => { setLoading(true); apiFetch('/api/admin/components?category=inverter').then(r => r.json()).then(d => { setItems(d); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(() => { load(); }, []);
  const save = async (data: any) => { const isEdit = modal !== 'add'; const r = await apiFetch(isEdit ? `/api/admin/components/${modal.id}` : '/api/admin/components', { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (r.ok) { toast(isEdit ? 'تم التعديل' : 'تمت الإضافة', 'success'); load(); setModal(null); } else toast('خطأ', 'error'); };
  const del = async (id: string) => {
    const ok = await useConfirmStore.getState().confirm({ title: 'تأكيد الحذف', message: 'سيتم حذف هذا المكون نهائياً. هل أنت متأكد؟', confirmLabel: 'حذف', variant: 'danger' }); if (!ok) return;
    const r = await apiFetch(`/api/admin/components/${id}`, { method: 'DELETE' });
    if (r.ok) {
      toast('تم الحذف', 'success'); load();
    } else {
      const err = await r.json();
      if (err.error === 'LINKED_QUOTES') {
        const list = err.quotes.map((q: any) => `- ${q.client_name} (${q.date})`).join('\n');
        toast(`لا يمكن الحذف — الانفيرتر مستخدم في ${err.quotes.length} عرض سعر`, 'error');
      } else {
        toast('لا يمكن الحذف', 'error');
      }
    }
  };
  const filtered = items.filter(i => !search || `${i.brand} ${i.model}`.toLowerCase().includes(search.toLowerCase()));
  const tc: any = { 'Hybrid': 'bg-emerald-100 text-emerald-700', 'Off-Grid': 'bg-blue-100 text-blue-700', 'Grid-Tie': 'bg-purple-100 text-purple-700' };
  return (<div>
    <TabHeader title="الانفيرترات" onAdd={() => setModal('add')} search={search} onSearch={setSearch} count={items.length} />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {loading ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />) : filtered.map(item => (<div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-start justify-between mb-3"><div><p className="font-bold text-slate-800">{item.brand}</p><p className="text-sm text-slate-500">{item.model}</p></div>
          <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${tc[item.spec.type] || 'bg-slate-100 text-slate-600'}`}>{item.spec.type}</span></div>
        <div className="grid grid-cols-2 gap-2">
          <InfoCell label="القدرة" value={`${(item.spec.W / 1000).toFixed(1)} kW`} />
          <InfoCell label="الجهد" value={`${item.spec.V} V`} />
          <InfoCell label="التكلفة" value={formatPrice(item.currency === 'USD' ? item.cost_price : item.cost_price / exchangeRate, item.currency as any)} />
          <InfoCell label="سعر البيع" value={formatPrice(item.sale_price || (item.sell_price_iqd || 0) / exchangeRate)} green />
        </div>
        <CardActions onEdit={() => setModal(item)} onDelete={() => del(item.id)} />
      </div>))}
      <AddCard onClick={() => setModal('add')} label="انفيرتر جديد" />
    </div>
    {modal && <Modal title={modal === 'add' ? 'إضافة انفيرتر' : 'تعديل الانفيرتر'} onClose={() => setModal(null)}><InverterForm initial={modal === 'add' ? undefined : modal} onSave={save} onClose={() => setModal(null)} /></Modal>}
  </div>);
}

// ===== CONTROLLERS =====
function ControllerForm({ initial, onSave, onClose }: any) {
  const s = initial?.spec || {};
  const [f, setF] = useState({ brand: initial?.brand || '', model: initial?.model || '', amps: String(s.A || ''), vmax: String(s.Vmax || ''), type: s.type || 'MPPT', cost: String(initial?.cost_price ?? ''), margin: String(initial?.margin_percent ?? ''), currency: initial?.currency || 'USD', stock: String(initial?.stock_qty || '0') });
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }));
  const submit = () => onSave({ category: 'controller', brand: f.brand, model: f.model, spec: { A: +f.amps, Vmax: +f.vmax, type: f.type }, cost_price: +f.cost, margin_percent: f.margin ? +f.margin : null, currency: f.currency, stock_qty: +f.stock, sku: initial?.sku, is_active: 1 });
  return (<div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Field label="الماركة"><input className={inp} value={f.brand} onChange={e => u('brand')(e.target.value)} /></Field><Field label="الموديل"><input className={inp} value={f.model} onChange={e => u('model')(e.target.value)} /></Field></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Field label="أقصى تيار (A)"><input type="number" className={inp} value={f.amps} onChange={e => u('amps')(e.target.value)} /></Field><Field label="أقصى جهد ألواح (V)"><input type="number" className={inp} value={f.vmax} onChange={e => u('vmax')(e.target.value)} /></Field></div>
    <Field label="النوع"><RadioGroup options={[{ label: 'MPPT', value: 'MPPT' }, { label: 'PWM', value: 'PWM' }]} value={f.type} onChange={u('type')} /></Field>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Field label="سعر التكلفة ($)"><input type="number" className={inp} value={f.cost} onChange={e => u('cost')(e.target.value)} placeholder="مثال: 250" /></Field><Field label="هامش الربح % (اختياري)"><input type="number" className={inp} value={f.margin} onChange={e => u('margin')(e.target.value)} placeholder="يستخدم الافتراضي" /></Field></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Field label="العملة"><RadioGroup options={[{ label: 'USD', value: 'USD' }, { label: 'IQD', value: 'IQD' }]} value={f.currency} onChange={u('currency')} /></Field><Field label="الكمية"><input type="number" className={inp} value={f.stock} onChange={e => u('stock')(e.target.value)} /></Field></div>
    <div className="flex gap-3 pt-2"><button onClick={submit} className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 rounded-xl"><Save className="w-4 h-4" /> حفظ</button><button onClick={onClose} className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200">إلغاء</button></div>
  </div>);
}

function ControllersTab({ toast }: any) {
  const [items, setItems] = useState<Component[]>([]); const [modal, setModal] = useState<any>(null); const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { formatPrice, exchangeRate } = useCurrencyStore();
  const load = () => { setLoading(true); apiFetch('/api/admin/components?category=controller').then(r => r.json()).then(d => { setItems(d); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(() => { load(); }, []);
  const save = async (data: any) => { const isEdit = modal !== 'add'; const r = await apiFetch(isEdit ? `/api/admin/components/${modal.id}` : '/api/admin/components', { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (r.ok) { toast(isEdit ? 'تم التعديل' : 'تمت الإضافة', 'success'); load(); setModal(null); } else toast('خطأ', 'error'); };
  const del = async (id: string) => {
    const ok = await useConfirmStore.getState().confirm({ title: 'تأكيد الحذف', message: 'سيتم حذف هذا المكون نهائياً. هل أنت متأكد؟', confirmLabel: 'حذف', variant: 'danger' }); if (!ok) return;
    const r = await apiFetch(`/api/admin/components/${id}`, { method: 'DELETE' });
    if (r.ok) {
      toast('تم الحذف', 'success'); load();
    } else {
      const err = await r.json();
      if (err.error === 'LINKED_QUOTES') {
        const list = err.quotes.map((q: any) => `- ${q.client_name} (${q.date})`).join('\n');
        toast(`لا يمكن الحذف — وحدة الشحن مستخدمة في ${err.quotes.length} عرض سعر`, 'error');
      } else {
        toast('لا يمكن الحذف', 'error');
      }
    }
  };
  const filtered = items.filter(i => !search || `${i.brand} ${i.model}`.toLowerCase().includes(search.toLowerCase()));
  return (<div>
    <TabHeader title="وحدات الشحن (MPPT/PWM)" onAdd={() => setModal('add')} search={search} onSearch={setSearch} count={items.length} />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {loading ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />) : filtered.map(item => (<div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-start justify-between mb-3"><div><p className="font-bold text-slate-800">{item.brand}</p><p className="text-sm text-slate-500">{item.model}</p></div>
          <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${item.spec.type === 'MPPT' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{item.spec.type}</span></div>
        <div className="grid grid-cols-2 gap-2">
          <InfoCell label="أقصى تيار" value={`${item.spec.A} A`} />
          <InfoCell label="أقصى جهد ألواح" value={`${item.spec.Vmax || '—'} V`} />
          <InfoCell label="التكلفة" value={formatPrice(item.currency === 'USD' ? item.cost_price : item.cost_price / exchangeRate, item.currency as any)} />
          <InfoCell label="سعر البيع" value={formatPrice(item.sale_price || (item.sell_price_iqd || 0) / exchangeRate)} green />
        </div>
        <CardActions onEdit={() => setModal(item)} onDelete={() => del(item.id)} />
      </div>))}
      <AddCard onClick={() => setModal('add')} label="وحدة شحن جديدة" />
    </div>
    {modal && <Modal title={modal === 'add' ? 'إضافة وحدة شحن' : 'تعديل وحدة الشحن'} onClose={() => setModal(null)}><ControllerForm initial={modal === 'add' ? undefined : modal} onSave={save} onClose={() => setModal(null)} /></Modal>}
  </div>);
}

// ===== APPLIANCES =====
const ICONS = ['tv', 'refrigerator', 'fan', 'lightbulb', 'droplet', 'air-vent', 'zap', 'monitor', 'server', 'cpu'];
function ApplianceForm({ initial, onSave, onClose }: any) {
  const [f, setF] = useState({ name: initial?.name || '', nameEn: initial?.name_en || '', icon: initial?.icon || 'zap', watts: String(initial?.default_watts || ''), surge: String(initial?.surge_factor || '1.0'), type: initial?.type || 'AC' });
  const [showIcons, setShowIcons] = useState(false);
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }));
  const submit = () => onSave({ name: f.name, name_en: f.nameEn || f.name, icon: f.icon, default_watts: +f.watts, surge_factor: +f.surge, type: f.type });
  return (<div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Field label="الاسم (عربي)"><input className={inp} value={f.name} onChange={e => u('name')(e.target.value)} /></Field><Field label="الاسم (إنجليزي)"><input className={inp} value={f.nameEn} onChange={e => u('nameEn')(e.target.value)} /></Field></div>
    <Field label="الأيقونة">
      <button type="button" onClick={() => setShowIcons(v => !v)} className={`${inp} text-right flex items-center justify-between`}>
        <span>{f.icon}</span><ChevronDown className="w-4 h-4 text-slate-400" />
      </button>
      {showIcons && <div className="mt-2 flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
        {ICONS.map(ic => <button key={ic} type="button" onClick={() => { u('icon')(ic); setShowIcons(false); }}
          className={`px-3 py-1.5 text-xs rounded-lg border ${f.icon === ic ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'}`}>{ic}</button>)}
      </div>}
    </Field>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Field label="الاستهلاك (W)"><input type="number" className={inp} value={f.watts} onChange={e => u('watts')(e.target.value)} /></Field><Field label="معامل الانطلاق"><input type="number" step="0.1" className={inp} value={f.surge} onChange={e => u('surge')(e.target.value)} /></Field></div>
    <Field label="نوع التيار"><RadioGroup options={[{ label: 'AC', value: 'AC' }, { label: 'DC', value: 'DC' }]} value={f.type} onChange={u('type')} /></Field>
    <div className="flex gap-3 pt-2"><button onClick={submit} className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 rounded-xl"><Save className="w-4 h-4" /> حفظ</button><button onClick={onClose} className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200">إلغاء</button></div>
  </div>);
}

function AppliancesTab({ toast }: any) {
  const [items, setItems] = useState<Appliance[]>([]); const [modal, setModal] = useState<any>(null); const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); apiFetch('/api/appliances').then(r => r.json()).then(d => { setItems(d); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(() => { load(); }, []);
  const save = async (data: any) => { const isEdit = modal !== 'add'; const r = await apiFetch(isEdit ? `/api/admin/appliances/${modal.id}` : '/api/admin/appliances', { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (r.ok) { toast(isEdit ? 'تم التعديل' : 'تمت الإضافة', 'success'); load(); setModal(null); } else toast('خطأ', 'error'); };
  const del = async (id: string) => { const ok = await useConfirmStore.getState().confirm({ title: 'حذف الجهاز', message: 'سيتم حذف هذا الجهاز من المكتبة نهائياً. هل أنت متأكد؟', confirmLabel: 'حذف', variant: 'danger' }); if (!ok) return; const r = await apiFetch(`/api/admin/appliances/${id}`, { method: 'DELETE' }); if (r.ok) { toast('تم الحذف', 'success'); load(); } else { toast('لا يمكن الحذف', 'error'); } };
  const filtered = items.filter(i => !search || i.name.includes(search) || i.name_en.toLowerCase().includes(search.toLowerCase()));
  return (<div>
    <TabHeader title="مكتبة الأجهزة" onAdd={() => setModal('add')} search={search} onSearch={setSearch} count={items.length} />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {loading ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />) : filtered.map(item => (<div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center"><Lightbulb className="w-5 h-5 text-amber-600" /></div>
          <div><p className="font-bold text-slate-800">{item.name}</p><p className="text-xs text-slate-400">{item.name_en}</p></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <InfoCell label="الاستهلاك" value={`${item.default_watts} W`} />
          <InfoCell label="معامل الانطلاق" value={`×${item.surge_factor}`} />
          <InfoCell label="نوع التيار" value={item.type} />
          <InfoCell label="الأيقونة" value={item.icon} />
        </div>
        <CardActions onEdit={() => setModal(item)} onDelete={() => del(item.id)} />
      </div>))}
      <AddCard onClick={() => setModal('add')} label="جهاز جديد" />
    </div>
    {modal && <Modal title={modal === 'add' ? 'إضافة جهاز' : 'تعديل الجهاز'} onClose={() => setModal(null)}><ApplianceForm initial={modal === 'add' ? undefined : modal} onSave={save} onClose={() => setModal(null)} /></Modal>}
  </div>);
}

// ===== ABPE SETTINGS =====
function ABPESettingsTab({ toast }: any) {
  const [f, setF] = useState({
    abpe_voltage: '220', abpe_phase: 'single', abpe_hours: '3',
    abpe_dod: '0.8', abpe_eff: '0.95', abpe_surge: '1.2',
    abpe_exp_margin: '1.2', abpe_pf: '0.8', wholesale_margin: '1.15', retail_margin: '1.30'
  });
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }));

  useEffect(() => {
    apiFetch('/api/admin/global-settings').then(r => r.json()).then(data => {
      setF({
        abpe_voltage: String(data.abpe_voltage || 220), abpe_phase: data.abpe_phase || 'single',
        abpe_hours: String(data.abpe_hours || 3), abpe_dod: String(data.abpe_dod || 0.8),
        abpe_eff: String(data.abpe_eff || 0.95), abpe_surge: String(data.abpe_surge || 1.2),
        abpe_exp_margin: String(data.abpe_exp_margin || 1.2), abpe_pf: String(data.abpe_pf || 0.8),
        wholesale_margin: String(data.wholesale_margin || 1.15), retail_margin: String(data.retail_margin || 1.30)
      });
    });
  }, []);

  const save = async () => {
    const payload = {
      abpe_voltage: +f.abpe_voltage, abpe_phase: f.abpe_phase,
      abpe_hours: +f.abpe_hours, abpe_dod: +f.abpe_dod, abpe_eff: +f.abpe_eff,
      abpe_surge: +f.abpe_surge, abpe_exp_margin: +f.abpe_exp_margin, abpe_pf: +f.abpe_pf,
      wholesale_margin: +f.wholesale_margin, retail_margin: +f.retail_margin
    };
    const res = await apiFetch('/api/admin/global-settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    if (res.ok) toast('تم حفظ الإعدادات', 'success');
    else toast('حدث خطأ أثناء الحفظ', 'error');
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">إعدادات التسعير السريع (ABPE)</h2>
        <p className="text-slate-500 text-sm mt-1">تتحكم هذه القيم المركزية بمحرك التسعير الفوري بالأمبير</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Field label="الفولتية العامة (V)"><input type="number" className={inp} value={f.abpe_voltage} onChange={e => u('abpe_voltage')(e.target.value)} /></Field>
        <Field label="الطور (Phase)">
          <RadioGroup options={[{ label: 'Single (1Ph)', value: 'single' }, { label: 'Three (3Ph)', value: 'three' }]} value={f.abpe_phase} onChange={u('abpe_phase')} />
        </Field>
        <Field label="ساعات التشغيل (h)"><input type="number" className={inp} value={f.abpe_hours} onChange={e => u('abpe_hours')(e.target.value)} /></Field>
        <Field label="مقدار تفريغ البطارية (DoD)"><input type="number" step="0.01" className={inp} value={f.abpe_dod} onChange={e => u('abpe_dod')(e.target.value)} /></Field>
        <Field label="كفاءة الإنفيرتر"><input type="number" step="0.01" className={inp} value={f.abpe_eff} onChange={e => u('abpe_eff')(e.target.value)} /></Field>
        <Field label="معامل القدرة (PF)"><input type="number" step="0.01" className={inp} value={f.abpe_pf} onChange={e => u('abpe_pf')(e.target.value)} /></Field>
        <Field label="معامل الانطلاق للإنفيرتر"><input type="number" step="0.01" className={inp} value={f.abpe_surge} onChange={e => u('abpe_surge')(e.target.value)} /></Field>
        <Field label="هامش توسعة الإنفيرتر"><input type="number" step="0.01" className={inp} value={f.abpe_exp_margin} onChange={e => u('abpe_exp_margin')(e.target.value)} /></Field>

        <div className="col-span-full border-t border-slate-100 my-2" />

        <Field label="نسبة ربح الجملة (Wholesale)"><input type="number" step="0.01" className={inp} value={f.wholesale_margin} onChange={e => u('wholesale_margin')(e.target.value)} /></Field>
        <Field label="نسبة ربح التجزئة (Retail)"><input type="number" step="0.01" className={inp} value={f.retail_margin} onChange={e => u('retail_margin')(e.target.value)} /></Field>
      </div>
      <div className="flex gap-4">
        <button onClick={save} className="bg-amber-500 hover:bg-amber-600 px-8 py-3 rounded-xl font-bold text-slate-900 transition-colors shadow-sm display-flex items-center gap-2">
          <Save className="w-5 h-5 inline-block" />
          حفظ الإعدادات
        </button>
      </div>
    </div>
  );
}

// ===== BULK PRICING TIERS =====
function PricingTiersTab({ toast }: any) {
  const [components, setComponents] = useState<Component[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string>('');
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const { formatPrice, exchangeRate } = useCurrencyStore();

  useEffect(() => {
    setLoading(true);
    apiFetch('/api/admin/components').then(r => r.json()).then(d => {
      setComponents(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const loadTiers = async (compId: string) => {
    setSelectedComponent(compId);
    if (!compId) { setTiers([]); return; }
    try {
      const res = await apiFetch(`/api/admin/pricing-tiers/${compId}`);
      setTiers(await res.json());
    } catch { setTiers([]); }
  };

  const saveTier = async (data: any) => {
    const isEdit = modal?.id;
    const url = isEdit ? `/api/admin/pricing-tiers/${modal.id}` : '/api/admin/pricing-tiers';
    const method = isEdit ? 'PUT' : 'POST';
    const res = await apiFetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, component_id: selectedComponent })
    });
    if (res.ok) {
      toast(isEdit ? 'تم تعديل الشريحة' : 'تمت إضافة شريحة السعر', 'success');
      loadTiers(selectedComponent);
      setModal(null);
    } else toast('خطأ', 'error');
  };

  const deleteTier = async (id: string) => {
    const ok = await useConfirmStore.getState().confirm({ title: 'حذف شريحة السعر', message: 'هل أنت متأكد من حذف هذه الشريحة؟', confirmLabel: 'حذف', variant: 'danger' });
    if (!ok) return;
    const res = await apiFetch(`/api/admin/pricing-tiers/${id}`, { method: 'DELETE' });
    if (res.ok) { toast('تم الحذف', 'success'); loadTiers(selectedComponent); }
    else toast('خطأ أثناء الحذف', 'error');
  };

  const selectedComp = components.find(c => c.id === selectedComponent);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">خصومات حسب الكمية</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">حدد خصومات تلقائية عند شراء كميات كبيرة من أي منتج</p>
      </div>

      {/* Component Selector */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
        <Field label="اختر المنتج">
          <select
            value={selectedComponent}
            onChange={e => loadTiers(e.target.value)}
            className={inp}
          >
            <option value="">— اختر منتج —</option>
            {components.map(c => (
              <option key={c.id} value={c.id}>{c.brand} {c.model} ({c.category})</option>
            ))}
          </select>
        </Field>

        {selectedComp && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <InfoCell label="التكلفة" value={formatPrice(selectedComp.currency === 'USD' ? selectedComp.cost_price : selectedComp.cost_price / exchangeRate, selectedComp.currency as any)} />
            <InfoCell label="سعر البيع" value={formatPrice(selectedComp.sale_price || (selectedComp.sell_price_iqd || 0) / exchangeRate)} green />
            <InfoCell label="المخزون" value={`${selectedComp.stock_qty}`} />
          </div>
        )}
      </div>

      {/* Tiers Table */}
      {selectedComponent && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 dark:text-white">شرائح الأسعار</h3>
            <button onClick={() => setModal('add')} className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-4 py-2 rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> إضافة شريحة
            </button>
          </div>

          {tiers.length > 0 ? (
            <div className="space-y-3">
              {tiers.map((tier: any) => (
                <div key={tier.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 rounded-xl px-5 py-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-xs text-slate-400">الكمية</p>
                      <p className="font-bold text-slate-800 dark:text-white font-sans">{tier.min_qty} - {tier.max_qty}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">الخصم</p>
                      <p className="font-bold text-emerald-600 font-sans">{tier.discount_percent}%</p>
                    </div>
                    {tier.valid_from && (
                      <div>
                        <p className="text-xs text-slate-400">الصلاحية</p>
                        <p className="text-xs text-slate-500 font-sans">{tier.valid_from} → {tier.valid_to || '∞'}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setModal(tier)} className="p-2 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-xl text-amber-600">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteTier(tier.id)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>لا توجد شرائح أسعار لهذا المنتج</p>
              <p className="text-xs mt-1">أضف شريحة لتقديم خصومات على الكميات الكبيرة</p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <Modal title={modal === 'add' ? 'إضافة شريحة سعر' : 'تعديل شريحة السعر'} onClose={() => setModal(null)}>
          <TierForm initial={modal === 'add' ? undefined : modal} onSave={saveTier} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}

function TierForm({ initial, onSave, onClose }: any) {
  const [f, setF] = useState({
    min_qty: String(initial?.min_qty || '1'),
    max_qty: String(initial?.max_qty || '999'),
    discount_percent: String(initial?.discount_percent || ''),
    valid_from: initial?.valid_from || '',
    valid_to: initial?.valid_to || ''
  });
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }));
  const submit = () => onSave({
    min_qty: +f.min_qty, max_qty: +f.max_qty,
    discount_percent: +f.discount_percent,
    valid_from: f.valid_from || null, valid_to: f.valid_to || null
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="الحد الأدنى للكمية"><input type="number" className={inp} value={f.min_qty} onChange={e => u('min_qty')(e.target.value)} /></Field>
        <Field label="الحد الأقصى للكمية"><input type="number" className={inp} value={f.max_qty} onChange={e => u('max_qty')(e.target.value)} /></Field>
      </div>
      <Field label="نسبة الخصم %">
        <input type="number" min="0" max="50" step="0.5" className={inp} value={f.discount_percent} onChange={e => u('discount_percent')(e.target.value)} placeholder="مثال: 5" />
        <p className="text-xs text-slate-400 mt-1">الحد الأقصى 50%</p>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="صالح من (اختياري)"><input type="date" className={inp} value={f.valid_from} onChange={e => u('valid_from')(e.target.value)} /></Field>
        <Field label="صالح حتى (اختياري)"><input type="date" className={inp} value={f.valid_to} onChange={e => u('valid_to')(e.target.value)} /></Field>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={submit} className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 rounded-xl"><Save className="w-4 h-4" /> حفظ</button>
        <button onClick={onClose} className="px-5 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200">إلغاء</button>
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====
const TABS = [
  { id: 'battery' as Category, label: 'البطاريات', icon: <Battery className="w-4 h-4" /> },
  { id: 'panel' as Category, label: 'الألواح الشمسية', icon: <Sun className="w-4 h-4" /> },
  { id: 'inverter' as Category, label: 'الانفيرترات', icon: <Zap className="w-4 h-4" /> },
  { id: 'controller' as Category, label: 'وحدات الشحن', icon: <Gauge className="w-4 h-4" /> },
  { id: 'appliance' as Category, label: 'مكتبة الأجهزة', icon: <Lightbulb className="w-4 h-4" /> },
  { id: 'abpe' as Category, label: 'إعدادات التسعير', icon: <Gauge className="w-4 h-4" /> },
  { id: 'pricing' as Category, label: 'التسعير الحجمي', icon: <Tag className="w-4 h-4" /> },
];

export default function AdminCatalog() {
  const [activeTab, setActiveTab] = useState<Category>('battery');
  const [toastMsg, setToastMsg] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error') => setToastMsg({ msg, type });
  return (
    <div className="max-w-6xl mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">إدارة الكاتالوج</h1>
        <p className="text-slate-500 mt-1 text-sm">أضف وعدّل جميع المنتجات والأجهزة</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1 scrollbar-hide">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all border ${activeTab === tab.id ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'}`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'battery' && <BatteriesTab toast={showToast} />}
      {activeTab === 'panel' && <PanelsTab toast={showToast} />}
      {activeTab === 'inverter' && <InvertersTab toast={showToast} />}
      {activeTab === 'controller' && <ControllersTab toast={showToast} />}
      {activeTab === 'appliance' && <AppliancesTab toast={showToast} />}
      {activeTab === 'abpe' && <ABPESettingsTab toast={showToast} />}
      {activeTab === 'pricing' && <PricingTiersTab toast={showToast} />}
      {toastMsg && <Toast msg={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </div>
  );
}
