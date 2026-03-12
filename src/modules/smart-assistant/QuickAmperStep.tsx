import { apiFetch } from '@/src/utils/apiFetch';
import { useEffect, useState } from 'react';
import { useAmperQuoteStore } from '../../store/amperQuoteStore';
import { useProjectStore } from '../../store/projectStore';
import { Zap, Activity, Info, ChevronRight, Package, Loader2, Save, User, Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

export default function QuickAmperStep() {
    const {
        requestedAmps,
        sunHours,
        dayHours,
        result,
        isLoading,
        error,
        packages,
        setRequestedAmps,
        setSunHours,
        setDayHours,
        generateQuote,
        fetchPackages
    } = useAmperQuoteStore();

    const { region, advancedSettings } = useProjectStore();
    const navigate = useNavigate();

    const [showSaveForm, setShowSaveForm] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [quoteSaved, setQuoteSaved] = useState(false);
    const [savingQuote, setSavingQuote] = useState(false);
    const [saveError, setSaveError] = useState('');

    const handleSaveQuote = async () => {
        if (!result) return;
        if (!customerName || !customerPhone) {
            setSaveError('يرجى إدخال اسم ورقم هاتف العميل');
            return;
        }
        setSavingQuote(true);
        setSaveError('');
        try {
            const payload = {
                amps: requestedAmps,
                sun_hours: sunHours,
                advancedSettings,
                customer_name: customerName,
                customer_phone: customerPhone,
                pricing_layer: 'retail',
                quote_data: {
                    material_cost: result.pricing.totalCost,
                    wholesale_total: result.pricing.wholesalePrice || result.pricing.totalCost,
                    retail_total: result.pricing.retailPrice,
                    profit: result.pricing.retailPrice - (result.pricing.wholesalePrice || result.pricing.totalCost),
                    panels: { count: result.recommendation.panels.count, item: result.recommendation.panels.item },
                    batteries: { count: result.recommendation.batteries.count, item: result.recommendation.batteries.item },
                    inverter: { item: result.recommendation.inverter.item }
                }
            };

            const res = await apiFetch('/api/quotes/from-abpe', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

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

    useEffect(() => {
        if (region?.sun_hours) {
            setSunHours(region.sun_hours);
        }
    }, [region, setSunHours]);

    useEffect(() => {
        fetchPackages();
    }, [sunHours, fetchPackages]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (requestedAmps > 0) {
                generateQuote();
            }
        }, 400);
        return () => clearTimeout(timeoutId);
    }, [requestedAmps, sunHours, dayHours, generateQuote]);

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl mb-6 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-bold text-lg">إصدار قديم (مُهمَل)</h4>
                    <p className="text-sm mt-1">
                        هذه الواجهة سيتم إيقافها قريباً. يرجى البدء باستخدام <Link to="/workspace" className="font-bold underline text-amber-900">مساحة التسعير الجديدة (Workspace)</Link> للحصول على حسابات أدق، تحكم أفضل في المكونات، وتجربة أسرع.
                    </p>
                </div>
            </div>

            <div className="mb-8 opacity-70">
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                        <Zap className="w-6 h-6 text-amber-600" />
                    </div>
                    التسعير السريع بالأمبير (ABPE)
                </h1>
                <p className="text-slate-500 mt-2 text-lg">أدخل الأمبير المطلوب لحساب النظام فوراً</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Input Pane */}
                <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 h-fit">
                    <label className="block text-sm font-bold text-slate-700 mb-3">الأمبير المطلوب</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={requestedAmps}
                            onChange={(e) => setRequestedAmps(Number(e.target.value))}
                            className="w-full text-3xl font-black text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-2xl py-4 px-6 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 transition-all text-center"
                            min="1"
                        />
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xl">A</span>
                    </div>

                    <label className="block text-sm font-bold text-slate-700 mt-6 mb-3">ساعات التشغيل نهاراً</label>
                    <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <input
                            type="range"
                            min="0"
                            max="24"
                            step="1"
                            value={dayHours}
                            onChange={(e) => setDayHours(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <span className="font-bold text-slate-700 w-12 text-left">{dayHours}h</span>
                    </div>

                    <div className="mt-6 flex items-start gap-3 bg-amber-50 p-4 rounded-2xl">
                        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800 leading-relaxed">
                            هذه الحاسبة تعتمد على إعدادات تسعير الشركة الافتراضية للجهد ومعامل القدرة.
                            {result?.settingsRef && (
                                <span className="block mt-2 pt-2 border-t border-amber-200/50 text-xs font-bold font-mono text-amber-700/80">
                                    [ {result.settingsRef.abpe_voltage}V • {result.settingsRef.abpe_phase === 'three' ? '3 Phase' : 'Single Phase'} • PF: {result.settingsRef.abpe_pf} ]
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Results Pane */}
                <div className="md:col-span-2 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 font-medium flex items-center gap-2">
                            <Info className="w-5 h-5" />
                            {error}
                        </div>
                    )}

                    {isLoading && !result && (
                        <div className="bg-white rounded-3xl p-12 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center justify-center">
                            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-4" />
                            <p className="text-slate-500 font-medium">جاري معالجة المتطلبات الهندسية...</p>
                        </div>
                    )}

                    {result && !isLoading && (
                        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col gap-6">
                            <div>
                                <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">تفاصيل النظام المقترح</h3>
                                        <p className="text-sm text-slate-500 mt-1">
                                            طاقة مستمرة: <span className="font-bold text-emerald-600">{(result.engineering.peak_continuous_w / 1000).toFixed(1)} kW</span>
                                        </p>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-slate-500 mb-1">سعر البيع (تجزئة)</p>
                                        <p className="text-3xl font-black text-amber-500">
                                            ${result.pricing.retailPrice.toLocaleString()}
                                        </p>
                                        <p className="text-xs font-bold text-slate-400 mt-1">تلكفة المواد: ${result.pricing.totalCost.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                        <p className="text-xs font-bold text-slate-500 mb-2">الإنفيرتر</p>
                                        <p className="font-bold text-slate-800">{result.recommendation.inverter.item.brand} {result.recommendation.inverter.item.model}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                        <p className="text-xs font-bold text-slate-500 mb-2">البطاريات</p>
                                        <p className="font-bold text-slate-800">{result.recommendation.batteries.count}x {result.recommendation.batteries.item.model}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                        <p className="text-xs font-bold text-slate-500 mb-2">الألواح</p>
                                        <p className="font-bold text-slate-800">{result.recommendation.panels.count}x {result.recommendation.panels.item.model}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 border-t border-slate-100">
                                {!quoteSaved ? (
                                    <>
                                        <AnimatePresence>
                                            {showSaveForm && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 mb-4 overflow-hidden">
                                                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                                        <Save className="w-4 h-4 text-amber-600" />
                                                        حفظ كعرض سعر سريع
                                                    </h4>
                                                    {saveError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{saveError}</div>}
                                                    <div className="space-y-3">
                                                        <div className="relative">
                                                            <User className="w-5 h-5 absolute right-3 top-3 text-slate-400" />
                                                            <input type="text" placeholder="اسم العميل" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
                                                        </div>
                                                        <div className="relative">
                                                            <Phone className="w-5 h-5 absolute right-3 top-3 text-slate-400" />
                                                            <input type="text" placeholder="رقم الهاتف" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
                                                        </div>
                                                        <div className="flex gap-2 pt-2">
                                                            <button onClick={handleSaveQuote} disabled={savingQuote} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg transition-colors flex justify-center items-center gap-2">
                                                                {savingQuote ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'تأكيد الحفظ'}
                                                            </button>
                                                            <button onClick={() => setShowSaveForm(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-lg font-medium transition-colors">
                                                                إلغاء
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        {!showSaveForm && (
                                            <button onClick={() => setShowSaveForm(true)} className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
                                                <Save className="w-5 h-5" />
                                                حفظ مخرج الحسبة كعرض سعر
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-6 bg-amber-100 text-amber-800 rounded-xl flex flex-col items-center justify-center gap-3 text-center border border-amber-200">
                                        <CheckCircle2 className="w-10 h-10 text-amber-600" />
                                        <h3 className="font-bold text-lg">تم حفظ عرض السعر بنجاح!</h3>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    )}

                    {packages && packages.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                                <Package className="w-5 h-5 text-amber-500" /> الباقات الجاهزة
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {packages.map((pkg: any) => (
                                    <button
                                        key={pkg.amps}
                                        onClick={() => setRequestedAmps(pkg.amps)}
                                        className={`p-4 rounded-2xl border-2 text-right transition-all group ${requestedAmps === pkg.amps
                                            ? 'bg-amber-50 border-amber-500 shadow-md shadow-amber-500/10'
                                            : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-md'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-xl font-black ${requestedAmps === pkg.amps ? 'text-amber-600' : 'text-slate-700'}`}>
                                                {pkg.amps}A
                                            </span>
                                            <ChevronRight className={`w-4 h-4 transition-transform ${requestedAmps === pkg.amps ? 'text-amber-500' : 'text-slate-300 group-hover:text-amber-400 group-hover:-translate-x-1'}`} />
                                        </div>
                                        <p className="text-sm font-bold text-slate-500">${pkg.pricing.retailPrice.toLocaleString()}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
