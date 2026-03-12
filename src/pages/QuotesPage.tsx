import { apiFetch } from '@/src/utils/apiFetch';
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, FolderOpen, Activity, CheckCircle2, Clock, RefreshCw, Trash2, FileText, Zap, Filter, X, CalendarDays, ArrowUpDown, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfirmStore } from '../store/confirmStore';
import { useToastStore } from '../store/toastStore';
import { useCurrencyStore } from '../store/currencyStore';
import { SkeletonStats, SkeletonTable } from '../components/Skeleton';

interface QuoteFilters {
    status: string;
    customer_name: string;
    from_date: string;
    to_date: string;
    min_total: string;
    max_total: string;
    sort_by: string;
    order: string;
}

const defaultFilters: QuoteFilters = {
    status: '', customer_name: '', from_date: '', to_date: '',
    min_total: '', max_total: '', sort_by: 'date', order: 'desc'
};

export default function QuotesPage() {
    const [quotes, setQuotes] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<QuoteFilters>(defaultFilters);
    const [totalCount, setTotalCount] = useState(0);
    const navigate = useNavigate();
    const confirm = useConfirmStore(s => s.confirm);
    const addToast = useToastStore(s => s.addToast);
    const { formatPrice } = useCurrencyStore();

    const buildQueryString = useCallback(() => {
        const params = new URLSearchParams();
        params.set('limit', '200');
        if (filters.status) params.set('status', filters.status);
        if (filters.customer_name) params.set('customer_name', filters.customer_name);
        if (filters.from_date) params.set('from_date', filters.from_date);
        if (filters.to_date) params.set('to_date', filters.to_date);
        if (filters.min_total) params.set('min_total', filters.min_total);
        if (filters.max_total) params.set('max_total', filters.max_total);
        if (filters.sort_by) params.set('sort_by', filters.sort_by);
        if (filters.order) params.set('order', filters.order);
        return params.toString();
    }, [filters]);

    const fetchQuotes = useCallback(() => {
        setLoading(true);
        apiFetch(`/api/quotes?${buildQueryString()}`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch quotes');
                return res.json();
            })
            .then(result => {
                const data = Array.isArray(result) ? result : (result.data || []);
                setQuotes(data);
                setTotalCount(result.total || data.length);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching quotes", err);
                addToast('error', 'فشل تحميل عروض الأسعار');
                setLoading(false);
            });
    }, [buildQueryString, addToast]);

    useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

    const convertToProject = async (quoteId: number) => {
        const ok = await confirm({
            title: 'تحويل إلى مشروع',
            message: 'سيتم تحويل عرض السعر هذا إلى مشروع نشط. هل تريد المتابعة؟',
            confirmLabel: 'تحويل',
            variant: 'info',
        });
        if (!ok) return;
        try {
            const res = await apiFetch(`/api/quotes/${quoteId}/convert`, { method: 'POST' });
            if (!res.ok) throw new Error('فشل التحويل');
            const project = await res.json();
            addToast('success', 'تم تحويل العرض إلى مشروع بنجاح');
            navigate(`/project/${project.id}`);
        } catch {
            addToast('error', 'حدث خطأ أثناء تحويل عرض السعر');
        }
    };

    const expireQuote = async (quoteId: number) => {
        const ok = await confirm({
            title: 'إنهاء صلاحية العرض',
            message: 'سيتم إنهاء صلاحية عرض السعر ولن يمكن تحويله لاحقاً. هل أنت متأكد؟',
            confirmLabel: 'إنهاء الصلاحية',
            variant: 'warning',
        });
        if (!ok) return;
        try {
            const res = await apiFetch(`/api/quotes/${quoteId}/expire`, { method: 'PUT' });
            if (!res.ok) throw new Error('فشل التحديث');
            addToast('success', 'تم إنهاء صلاحية العرض');
            fetchQuotes();
        } catch {
            addToast('error', 'حدث خطأ أثناء التحديث');
        }
    };

    const deleteQuote = async (quoteId: string) => {
        const ok = await confirm({
            title: 'حذف عرض السعر',
            message: 'سيتم حذف عرض السعر نهائياً ولا يمكن استرجاعه. هل أنت متأكد؟',
            confirmLabel: 'حذف نهائياً',
            variant: 'danger',
        });
        if (!ok) return;
        try {
            const res = await apiFetch(`/api/quotes/${quoteId}`, { method: 'DELETE' });
            if (!res.ok) {
                addToast('error', 'لا يمكن الحذف — مرتبط ببيانات أخرى');
                return;
            }
            addToast('success', 'تم حذف عرض السعر');
            fetchQuotes();
        } catch {
            addToast('error', 'حدث خطأ أثناء الحذف');
        }
    };

    // Client-side quick search (on top of server-side filters)
    const filteredQuotes = quotes.filter(q =>
        !searchQuery || (
            (q.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
            (q.customer_phone?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
        )
    );

    const totalQuotes = quotes.length;
    const activeQuotes = quotes.filter(q => q.status === 'valid' || q.status === 'draft').length;
    const convertedQuotes = quotes.filter(q => q.status === 'converted').length;

    const activeFilterCount = Object.entries(filters).filter(([k, v]) => v && k !== 'sort_by' && k !== 'order' && v !== defaultFilters[k as keyof QuoteFilters]).length;

    const clearFilters = () => {
        setFilters(defaultFilters);
        setSearchQuery('');
    };

    const updateFilter = (key: keyof QuoteFilters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'valid':
            case 'draft':
                return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-bold flex items-center justify-center gap-1 w-max"><CheckCircle2 className="w-3 h-3" /> ساري</span>;
            case 'converted':
                return <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs font-bold flex items-center justify-center gap-1 w-max"><FolderOpen className="w-3 h-3" /> تم التحويل</span>;
            case 'expired':
                return <span className="px-3 py-1 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400 rounded-full text-xs font-bold flex items-center justify-center gap-1 w-max"><Clock className="w-3 h-3" /> منتهي</span>;
            case 'approved':
                return <span className="px-3 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full text-xs font-bold flex items-center justify-center gap-1 w-max"><CheckCircle2 className="w-3 h-3" /> معتمد</span>;
            default:
                return <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold w-max">{status}</span>;
        }
    };

    const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

    return (
        <div className="max-w-6xl mx-auto pb-20">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-2xl md:text-4xl font-bold text-slate-800 dark:text-white mb-2">عروض الأسعار</h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        نظرة عامة على جميع عروض الأسعار
                        {totalCount > 0 && <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full mr-2">{totalCount} عرض</span>}
                    </p>
                </div>
                <Link to="/project/new" className="bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 text-slate-900 font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                    <Plus className="w-5 h-5" />
                    حسبة جديدة
                </Link>
            </motion.div>

            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
                {/* Stats Row */}
                {loading ? (
                    <SkeletonStats count={3} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <motion.div variants={itemVariants} className="bg-white/80 dark:bg-slate-800 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                <FolderOpen className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">إجمالي العروض</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white">{totalQuotes}</p>
                            </div>
                        </motion.div>
                        <motion.div variants={itemVariants} className="bg-white/80 dark:bg-slate-800 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">عروض سارية</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white">{activeQuotes}</p>
                            </div>
                        </motion.div>
                        <motion.div variants={itemVariants} className="bg-white/80 dark:bg-slate-800 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                                <Activity className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">عروض محولة</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white">{convertedQuotes}</p>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Search and Filters */}
                <motion.div variants={itemVariants} className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-700 overflow-hidden">
                    {/* Search Bar + Filter Toggle */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <FolderOpen className="w-5 h-5 text-amber-500" />
                                قائمة عروض الأسعار
                            </h2>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <div className="relative w-full sm:w-72 flex-1">
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <Search className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="بحث سريع بالاسم أو الهاتف..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="block w-full pl-3 pr-10 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl leading-5 bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:text-sm transition-all"
                                    />
                                </div>
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`p-2.5 border rounded-xl transition-colors flex items-center gap-1.5 text-sm font-medium whitespace-nowrap ${showFilters || activeFilterCount > 0
                                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-400'
                                        : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-amber-300'
                                    }`}
                                >
                                    <Filter className="w-4 h-4" />
                                    فلترة
                                    {activeFilterCount > 0 && (
                                        <span className="bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeFilterCount}</span>
                                    )}
                                </button>
                                <button onClick={fetchQuotes} className="p-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-amber-600 transition-colors">
                                    <RefreshCw className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Advanced Filters Panel */}
                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="bg-white dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 p-5 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {/* Status Filter */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">الحالة</label>
                                                <select
                                                    value={filters.status}
                                                    onChange={e => updateFilter('status', e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-400"
                                                >
                                                    <option value="">الكل</option>
                                                    <option value="draft">مسودة</option>
                                                    <option value="valid">ساري</option>
                                                    <option value="approved">معتمد</option>
                                                    <option value="converted">محول</option>
                                                    <option value="expired">منتهي</option>
                                                </select>
                                            </div>

                                            {/* Customer Name */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">اسم العميل</label>
                                                <input
                                                    type="text"
                                                    value={filters.customer_name}
                                                    onChange={e => updateFilter('customer_name', e.target.value)}
                                                    placeholder="بحث..."
                                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-400"
                                                />
                                            </div>

                                            {/* Date Range */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">من تاريخ</label>
                                                <input
                                                    type="date"
                                                    value={filters.from_date}
                                                    onChange={e => updateFilter('from_date', e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-400"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">إلى تاريخ</label>
                                                <input
                                                    type="date"
                                                    value={filters.to_date}
                                                    onChange={e => updateFilter('to_date', e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-400"
                                                />
                                            </div>

                                            {/* Price Range */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">الحد الأدنى للمبلغ</label>
                                                <input
                                                    type="number"
                                                    value={filters.min_total}
                                                    onChange={e => updateFilter('min_total', e.target.value)}
                                                    placeholder="0"
                                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-400"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">الحد الأقصى للمبلغ</label>
                                                <input
                                                    type="number"
                                                    value={filters.max_total}
                                                    onChange={e => updateFilter('max_total', e.target.value)}
                                                    placeholder="∞"
                                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-400"
                                                />
                                            </div>

                                            {/* Sort */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">ترتيب حسب</label>
                                                <select
                                                    value={filters.sort_by}
                                                    onChange={e => updateFilter('sort_by', e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-400"
                                                >
                                                    <option value="date">التاريخ</option>
                                                    <option value="total">المبلغ</option>
                                                    <option value="customer">العميل</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">الاتجاه</label>
                                                <select
                                                    value={filters.order}
                                                    onChange={e => updateFilter('order', e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-400"
                                                >
                                                    <option value="desc">تنازلي</option>
                                                    <option value="asc">تصاعدي</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Filter Actions */}
                                        <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-600">
                                            {activeFilterCount > 0 && (
                                                <button
                                                    onClick={clearFilters}
                                                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 font-medium flex items-center gap-1"
                                                >
                                                    <X className="w-3.5 h-3.5" /> مسح الفلاتر
                                                </button>
                                            )}
                                            <span className="text-xs text-slate-400">{filteredQuotes.length} نتيجة</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-slate-50/80 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                    <th className="px-3 md:px-6 py-3 md:py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">العميل</th>
                                    <th className="px-3 md:px-6 py-3 md:py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">الهاتف</th>
                                    <th className="px-3 md:px-6 py-3 md:py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">تاريخ الإصدار</th>
                                    <th className="px-3 md:px-6 py-3 md:py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">المبلغ</th>
                                    <th className="px-3 md:px-6 py-3 md:py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">الحالة</th>
                                    <th className="px-3 md:px-6 py-3 md:py-4 text-xs font-bold text-slate-500 dark:text-slate-400">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                {loading ? (
                                    <SkeletonTable rows={5} cols={6} />
                                ) : filteredQuotes.length > 0 ? (
                                    filteredQuotes.map((q, idx) => (
                                        <motion.tr
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            key={q.id}
                                            className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors group"
                                        >
                                            <td className="px-3 md:px-6 py-3 md:py-4 font-bold text-slate-800 dark:text-white text-sm">{q.customer_name || '—'}</td>
                                            <td className="px-3 md:px-6 py-3 md:py-4 text-slate-600 dark:text-slate-400 font-sans hidden md:table-cell">{q.customer_phone || '—'}</td>
                                            <td className="px-3 md:px-6 py-3 md:py-4 text-slate-500 dark:text-slate-400 text-sm font-sans font-medium hidden lg:table-cell">
                                                {new Date(q.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </td>
                                            <td className="px-3 md:px-6 py-3 md:py-4 font-bold text-slate-800 dark:text-white font-sans text-sm">
                                                {formatPrice(q.quote_data?.sale_price || q.total_sell_iqd || q.total_selling_price || 0)}
                                            </td>
                                            <td className="px-3 md:px-6 py-3 md:py-4 hidden sm:table-cell">{getStatusBadge(q.status)}</td>
                                            <td className="px-2 md:px-6 py-3 md:py-4 text-left">
                                                <div className="flex flex-wrap justify-end gap-1 md:gap-2">
                                                    {(q.status === 'valid' || q.status === 'draft') && (
                                                        <>
                                                            <button
                                                                onClick={() => convertToProject(q.id)}
                                                                className="text-white bg-amber-500 hover:bg-amber-600 px-2 md:px-3 py-1.5 rounded-lg text-[11px] md:text-xs font-bold transition-all shadow-sm active:scale-95"
                                                            >
                                                                تحويل
                                                            </button>
                                                            <button
                                                                onClick={() => expireQuote(q.id)}
                                                                className="text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 px-2 md:px-3 py-1.5 rounded-lg text-[11px] md:text-xs font-bold transition-all hidden sm:inline-flex"
                                                            >
                                                                إنهاء
                                                            </button>
                                                        </>
                                                    )}
                                                    <Link to={`/quote/${q.id}`} className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-2 md:px-3 py-1.5 rounded-lg text-[11px] md:text-xs font-bold transition-all">
                                                        عرض
                                                    </Link>
                                                    <button
                                                        onClick={() => deleteQuote(q.id)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                        title="حذف العرض"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center">
                                            <div className="max-w-xs mx-auto text-center">
                                                <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                                    <FileText className="w-9 h-9 text-amber-500" />
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                                                    {searchQuery || activeFilterCount > 0 ? 'لا توجد نتائج' : 'لا توجد عروض أسعار'}
                                                </h3>
                                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                                                    {searchQuery || activeFilterCount > 0
                                                        ? 'جرب تعديل معايير البحث أو الفلاتر'
                                                        : 'ابدأ بإنشاء حسبة جديدة لإصدار أول عرض سعر'
                                                    }
                                                </p>
                                                {!searchQuery && activeFilterCount === 0 && (
                                                    <Link
                                                        to="/project/new"
                                                        className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-5 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/25"
                                                    >
                                                        <Zap className="w-4 h-4" />
                                                        إنشاء حسبة جديدة
                                                    </Link>
                                                )}
                                                {activeFilterCount > 0 && (
                                                    <button
                                                        onClick={clearFilters}
                                                        className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold px-5 py-2.5 rounded-xl transition-all hover:bg-slate-200"
                                                    >
                                                        <X className="w-4 h-4" />
                                                        مسح الفلاتر
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
