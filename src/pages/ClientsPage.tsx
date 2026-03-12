import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/src/utils/apiFetch';
import { Users, Plus, Search, Phone, Mail, MapPin, Trash2, Edit3, X, FileText, FolderOpen, DollarSign, UserPlus, Tag, Save, Percent, Download } from 'lucide-react';
import { useConfirmStore } from '../store/confirmStore';
import { useToastStore } from '../store/toastStore';
import { triggerPrint } from '../reports/utils/reportHelpers';

interface Client {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    notes: string | null;
    created_at: string;
    quotes_count: number;
    projects_count: number;
    total_revenue: number;
}

const emptyForm = { name: '', phone: '', email: '', address: '', city: '', notes: '' };

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [pricingClient, setPricingClient] = useState<Client | null>(null);
    const confirm = useConfirmStore(s => s.confirm);
    const addToast = useToastStore(s => s.addToast);

    const load = async () => {
        try {
            const res = await apiFetch('/api/clients');
            const data = await res.json();
            if (Array.isArray(data)) {
                setClients(data);
            } else {
                console.error("Failed to load clients:", data);
                setClients([]);
            }
        } catch (e) {
            console.error(e);
            setClients([]);
        }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const filtered = clients.filter(c =>
        c.name.includes(search) || c.phone?.includes(search) || c.city?.includes(search)
    );

    const handleSubmit = async () => {
        if (!form.name.trim()) {
            addToast('error', 'يرجى إدخال اسم العميل');
            return;
        }
        setSaving(true);
        try {
            const url = editId ? `/api/clients/${editId}` : '/api/clients';
            const method = editId ? 'PUT' : 'POST';
            const res = await apiFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (!res.ok) throw new Error('فشل الحفظ');
            addToast('success', editId ? 'تم تحديث بيانات العميل' : 'تم إضافة العميل بنجاح');
            setShowForm(false);
            setEditId(null);
            setForm(emptyForm);
            load();
        } catch {
            addToast('error', 'حدث خطأ أثناء حفظ البيانات');
        }
        setSaving(false);
    };

    const handleDelete = async (id: string, name: string) => {
        const ok = await confirm({
            title: 'حذف العميل',
            message: `سيتم حذف "${name}" نهائياً. العروض والمشاريع المرتبطة ستبقى ولكن بدون ربط بالعميل.`,
            confirmLabel: 'حذف نهائياً',
            variant: 'danger',
        });
        if (!ok) return;
        try {
            const res = await apiFetch(`/api/clients/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json();
                addToast('error', `فشل الحذف: ${err.error || 'خطأ غير معروف'}`);
                return;
            }
            addToast('success', 'تم حذف العميل');
            load();
        } catch {
            addToast('error', 'حدث خطأ أثناء الحذف');
        }
    };

    const openEdit = (c: Client) => {
        setEditId(c.id);
        setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', city: c.city || '', notes: c.notes || '' });
        setShowForm(true);
    };

    const totalRevenue = clients.reduce((s, c) => s + c.total_revenue, 0);
    const totalQuotes = clients.reduce((s, c) => s + c.quotes_count, 0);

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        إدارة العملاء
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">إدارة بيانات العملاء وربطهم بالمشاريع وعروض الأسعار</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={triggerPrint}
                        className="no-print flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl text-sm font-bold hover:border-blue-300 hover:text-blue-600 transition-all"
                    >
                        <Download className="w-4 h-4" />
                        طباعة
                    </button>
                    <button
                        onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(true); }}
                        className="flex items-center gap-2 bg-gradient-to-l from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5"
                    >
                        <Plus className="w-4 h-4" />
                        عميل جديد
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Stat icon={<Users className="w-5 h-5" />} label="إجمالي العملاء" value={clients.length.toString()} color="blue" />
                <Stat icon={<FileText className="w-5 h-5" />} label="عروض الأسعار" value={totalQuotes.toString()} color="amber" />
                <Stat icon={<DollarSign className="w-5 h-5" />} label="إجمالي الإيرادات" value={`${(totalRevenue / 1000).toFixed(0)}K IQD`} color="emerald" />
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="بحث بالاسم، الهاتف، أو المدينة..."
                    className="w-full pr-10 pl-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-12 text-slate-400">جاري التحميل...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                        <Users className="w-9 h-9 text-blue-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
                            {search ? 'لا توجد نتائج' : 'لا يوجد عملاء حالياً'}
                        </h3>
                        <p className="text-slate-400 text-sm">
                            {search ? `لا يوجد عميل مطابق لـ "${search}"` : 'ابدأ بإضافة أول عميل لقاعدة البيانات'}
                        </p>
                    </div>
                    {!search && (
                        <button
                            onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(true); }}
                            className="inline-flex items-center gap-2 bg-gradient-to-l from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5"
                        >
                            <UserPlus className="w-4 h-4" />
                            إضافة عميل جديد
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500">
                                <th className="text-right py-3 px-4 font-semibold">العميل</th>
                                <th className="text-right py-3 px-4 font-semibold hidden md:table-cell">الهاتف</th>
                                <th className="text-right py-3 px-4 font-semibold hidden lg:table-cell">المدينة</th>
                                <th className="text-center py-3 px-4 font-semibold">عروض</th>
                                <th className="text-center py-3 px-4 font-semibold">مشاريع</th>
                                <th className="text-left py-3 px-4 font-semibold hidden md:table-cell">الإيرادات</th>
                                <th className="text-center py-3 px-4 font-semibold">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="py-3.5 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                {c.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{c.name}</p>
                                                {c.email && <p className="text-xs text-slate-400">{c.email}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600 hidden md:table-cell" dir="ltr">{c.phone || '-'}</td>
                                    <td className="py-3.5 px-4 text-slate-600 hidden lg:table-cell">{c.city || '-'}</td>
                                    <td className="py-3.5 px-4 text-center">
                                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg text-xs font-bold">
                                            <FileText className="w-3 h-3" /> {c.quotes_count}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-center">
                                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg text-xs font-bold">
                                            <FolderOpen className="w-3 h-3" /> {c.projects_count}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-left hidden md:table-cell">
                                        <span className="text-emerald-600 font-bold text-xs">{c.total_revenue > 0 ? `${(c.total_revenue / 1000).toFixed(0)}K` : '-'}</span>
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => setPricingClient(c)} title="تسعير خاص" className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition">
                                                <Tag className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => openEdit(c)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition">
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(c.id, c.name)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">{editId ? 'تعديل العميل' : 'عميل جديد'}</h2>
                            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <Field label="الاسم *" icon={<Users className="w-4 h-4" />} value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="اسم العميل" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="الهاتف" icon={<Phone className="w-4 h-4" />} value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="07xxxxxxxxx" dir="ltr" />
                                <Field label="البريد" icon={<Mail className="w-4 h-4" />} value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="email@example.com" dir="ltr" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="العنوان" icon={<MapPin className="w-4 h-4" />} value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} placeholder="العنوان" />
                                <Field label="المدينة" icon={<MapPin className="w-4 h-4" />} value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} placeholder="بغداد" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">ملاحظات</label>
                                <textarea
                                    value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition resize-none"
                                    placeholder="ملاحظات إضافية..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={handleSubmit}
                                disabled={saving || !form.name.trim()}
                                className="flex-1 bg-gradient-to-l from-blue-600 to-indigo-600 text-white py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all disabled:opacity-50"
                            >
                                {saving ? 'جاري الحفظ...' : editId ? 'تحديث' : 'إضافة'}
                            </button>
                            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition">
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Client Pricing Overrides Modal */}
            {pricingClient && (
                <ClientPricingModal
                    client={pricingClient}
                    onClose={() => setPricingClient(null)}
                    addToast={addToast}
                />
            )}
        </div>
    );
}

// ─── Client Pricing Overrides Modal ───
interface PricingOverride {
    id: string;
    client_id: string;
    component_id: string | null;
    category: string | null;
    discount_percent: number;
    valid_from: string | null;
    valid_to: string | null;
    component_name?: string;
}

function ClientPricingModal({ client, onClose, addToast }: { client: Client; onClose: () => void; addToast: (type: string, msg: string) => void }) {
    const [overrides, setOverrides] = useState<PricingOverride[]>([]);
    const [components, setComponents] = useState<{ id: string; brand: string; model: string; category: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<PricingOverride | null>(null);
    const confirm = useConfirmStore(s => s.confirm);

    const loadOverrides = async () => {
        try {
            const res = await apiFetch(`/api/clients/${client.id}/pricing`);
            const data = await res.json();
            setOverrides(Array.isArray(data) ? data : []);
        } catch { setOverrides([]); }
        setLoading(false);
    };

    const loadComponents = async () => {
        try {
            const res = await apiFetch('/api/components');
            const data = await res.json();
            setComponents(Array.isArray(data) ? data.map((c: any) => ({ id: c.id, brand: c.brand, model: c.model, category: c.category })) : []);
        } catch { setComponents([]); }
    };

    React.useEffect(() => { loadOverrides(); loadComponents(); }, [client.id]);

    const handleSave = async (data: any) => {
        const isEdit = !!editItem;
        const url = isEdit ? `/api/clients/${client.id}/pricing/${editItem!.id}` : `/api/clients/${client.id}/pricing`;
        try {
            const res = await apiFetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                addToast('success', isEdit ? 'تم تحديث التسعير' : 'تم إضافة تسعير خاص');
                setShowForm(false);
                setEditItem(null);
                loadOverrides();
            } else {
                const err = await res.json();
                addToast('error', err.error || 'حدث خطأ');
            }
        } catch { addToast('error', 'حدث خطأ في الاتصال'); }
    };

    const handleDelete = async (id: string) => {
        const ok = await confirm({ title: 'حذف التسعير', message: 'هل تريد حذف هذا التسعير الخاص؟', confirmLabel: 'حذف', variant: 'danger' });
        if (!ok) return;
        try {
            const res = await apiFetch(`/api/clients/${client.id}/pricing/${id}`, { method: 'DELETE' });
            if (res.ok) { addToast('success', 'تم الحذف'); loadOverrides(); }
            else addToast('error', 'فشل الحذف');
        } catch { addToast('error', 'حدث خطأ'); }
    };

    const getCategoryLabel = (cat: string | null) => {
        const map: Record<string, string> = { battery: 'البطاريات', panel: 'الألواح', inverter: 'الانفيرترات', controller: 'وحدات الشحن' };
        return cat ? map[cat] || cat : null;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden" dir="rtl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Tag className="w-5 h-5 text-amber-500" />
                            تسعير خاص — {client.name}
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">خصومات خاصة لهذا العميل على منتجات أو فئات محددة</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
                    {loading ? (
                        <div className="text-center py-8 text-slate-400">جاري التحميل...</div>
                    ) : (
                        <>
                            {/* Existing overrides */}
                            {overrides.length === 0 ? (
                                <div className="text-center py-8">
                                    <Percent className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                    <p className="text-sm text-slate-400">لا توجد خصومات خاصة لهذا العميل</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {overrides.map(o => {
                                        const comp = o.component_id ? components.find(c => c.id === o.component_id) : null;
                                        return (
                                            <div key={o.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400">-{o.discount_percent}%</span>
                                                        <span className="text-sm text-slate-700 dark:text-slate-200">
                                                            {comp ? `${comp.brand} ${comp.model}` : o.category ? getCategoryLabel(o.category) : 'جميع المنتجات'}
                                                        </span>
                                                    </div>
                                                    {(o.valid_from || o.valid_to) && (
                                                        <p className="text-xs text-slate-400 mt-0.5">
                                                            {o.valid_from && `من ${o.valid_from}`} {o.valid_to && `إلى ${o.valid_to}`}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => { setEditItem(o); setShowForm(true); }} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition">
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => handleDelete(o.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Add/Edit Form */}
                            {showForm && (
                                <PricingOverrideForm
                                    initial={editItem}
                                    components={components}
                                    onSave={handleSave}
                                    onClose={() => { setShowForm(false); setEditItem(null); }}
                                />
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!showForm && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-700">
                        <button
                            onClick={() => { setEditItem(null); setShowForm(true); }}
                            className="flex items-center gap-2 bg-gradient-to-l from-amber-500 to-orange-500 text-slate-900 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            إضافة خصم جديد
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function PricingOverrideForm({ initial, components, onSave, onClose }: {
    initial: PricingOverride | null;
    components: { id: string; brand: string; model: string; category: string }[];
    onSave: (data: any) => void;
    onClose: () => void;
}) {
    const [mode, setMode] = useState<'all' | 'category' | 'component'>(
        initial ? (initial.component_id ? 'component' : initial.category ? 'category' : 'all') : 'all'
    );
    const [componentId, setComponentId] = useState(initial?.component_id || '');
    const [category, setCategory] = useState(initial?.category || '');
    const [discount, setDiscount] = useState(String(initial?.discount_percent || ''));
    const [validFrom, setValidFrom] = useState(initial?.valid_from || '');
    const [validTo, setValidTo] = useState(initial?.valid_to || '');
    const [saving, setSaving] = useState(false);

    const categories = [
        { value: 'battery', label: 'البطاريات' },
        { value: 'panel', label: 'الألواح الشمسية' },
        { value: 'inverter', label: 'الانفيرترات' },
        { value: 'controller', label: 'وحدات الشحن' },
    ];

    const handleSubmit = () => {
        const d = parseFloat(discount);
        if (isNaN(d) || d <= 0 || d > 50) return;
        setSaving(true);
        onSave({
            component_id: mode === 'component' ? componentId : null,
            category: mode === 'category' ? category : null,
            discount_percent: d,
            valid_from: validFrom || null,
            valid_to: validTo || null,
        });
        setSaving(false);
    };

    return (
        <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-xl p-4 space-y-3 border border-amber-200 dark:border-amber-800/30">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">{initial ? 'تعديل الخصم' : 'خصم جديد'}</h4>

            {/* Mode selector */}
            <div className="flex gap-2">
                {[
                    { id: 'all' as const, label: 'كل المنتجات' },
                    { id: 'category' as const, label: 'فئة محددة' },
                    { id: 'component' as const, label: 'منتج محدد' },
                ].map(m => (
                    <button key={m.id} onClick={() => setMode(m.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${mode === m.id ? 'bg-amber-500 text-slate-900 border-amber-500' : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-amber-300'}`}>
                        {m.label}
                    </button>
                ))}
            </div>

            {/* Category selector */}
            {mode === 'category' && (
                <select value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 dark:text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none">
                    <option value="">اختر الفئة...</option>
                    {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
            )}

            {/* Component selector */}
            {mode === 'component' && (
                <select value={componentId} onChange={e => setComponentId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 dark:text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none">
                    <option value="">اختر المنتج...</option>
                    {components.map(c => <option key={c.id} value={c.id}>{c.brand} {c.model} ({c.category})</option>)}
                </select>
            )}

            {/* Discount + dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">نسبة الخصم %</label>
                    <input type="number" min="0.1" max="50" step="0.5" value={discount} onChange={e => setDiscount(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 dark:text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
                        placeholder="5" />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">من تاريخ</label>
                    <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 dark:text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none" />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">إلى تاريخ</label>
                    <input type="date" value={validTo} onChange={e => setValidTo(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 dark:text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none" />
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
                <button onClick={handleSubmit} disabled={saving || !discount || parseFloat(discount) <= 0 || (mode === 'category' && !category) || (mode === 'component' && !componentId)}
                    className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50">
                    <Save className="w-4 h-4" /> {initial ? 'تحديث' : 'حفظ'}
                </button>
                <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                    إلغاء
                </button>
            </div>
        </div>
    );
}

function Stat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
    const colors: Record<string, string> = {
        blue: 'from-blue-500 to-indigo-600 shadow-blue-500/20',
        amber: 'from-amber-500 to-orange-500 shadow-amber-500/20',
        emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/20'
    };
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 shadow-sm">
            <div className={`w-11 h-11 bg-gradient-to-br ${colors[color]} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                {icon}
            </div>
            <div>
                <p className="text-xs text-slate-500 font-medium">{label}</p>
                <p className="text-xl font-bold text-slate-800">{value}</p>
            </div>
        </div>
    );
}

function Field({ label, icon, value, onChange, placeholder, dir }: { label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void; placeholder: string; dir?: string }) {
    return (
        <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">{label}</label>
            <div className="relative">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
                <input
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    dir={dir}
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
            </div>
        </div>
    );
}
