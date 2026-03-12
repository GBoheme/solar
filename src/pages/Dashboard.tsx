import { useState, useEffect } from 'react';
import { apiFetch } from '@/src/utils/apiFetch';
import { Link } from 'react-router-dom';
import { SkeletonDashboard } from '../components/Skeleton';
import {
  FolderOpen, Users, DollarSign, Activity,
  TrendingUp, TrendingDown, Clock, Search,
  ChevronLeft, FileText, Download, Target,
  Zap, Calendar, Plus, AlertCircle, BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useCurrencyStore } from '../store/currencyStore';
import DashboardReport from '../reports/templates/DashboardReport';
import { triggerPrint } from '../reports/utils/reportHelpers';

interface DashboardStats {
  counts: { projects: number; quotes: number; clients: number; components: number };
  financial: {
    total_revenue: number;
    total_cost: number;
    total_profit: number;
    avg_margin_pct: number;
    exchange_rate: number;
    default_margin: number;
  };
  quotesByStatus: any[];
  recentQuotes: any[];
  recentClients: any[];
  monthlyRevenue: any[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { formatPrice, currency } = useCurrencyStore();

  useEffect(() => {
    apiFetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching stats", err);
        setLoading(false);
      });
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'مكتمل': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'مقبول': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'قيد التنفيذ': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'مرفوض': return 'bg-red-100 text-red-700 border-red-200';
      case 'ملغى': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200'; // draft/تحت الدراسة
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  if (loading) {
    return <SkeletonDashboard />;
  }

  if (!stats || ('error' in stats) || !stats.financial) return (
    <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl my-8 mx-auto max-w-md border border-red-200">
      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500 opacity-50" />
      <h3 className="text-lg font-bold mb-2">حدث خطأ في تحميل البيانات</h3>
      <p className="text-sm">{(stats as any)?.error || "تعذر الاتصال بالخادم. يرجى التأكد من تسجيل الدخول والمحاولة مرة أخرى."}</p>
    </div>
  );

  const today = new Date().toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20" dir="rtl">

      {/* Header Section */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-11 h-11 md:w-14 md:h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <Zap className="w-5 h-5 md:w-7 md:h-7 text-white" />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-slate-800 dark:text-white">مرحباً بك في نظام الإدارة</h1>
            <p className="text-slate-500 text-xs md:text-sm flex items-center gap-2 mt-1">
              <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
              {today}
            </p>
          </div>
        </div>
        <div className="flex gap-2 md:gap-3 w-full md:w-auto">
          <button onClick={triggerPrint} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all border border-slate-200 print:hidden">
            <Download className="w-4 h-4" /> تقرير PDF
          </button>
          <Link to="/project/new" className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-l from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-slate-900 px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold shadow-lg shadow-amber-500/25 transition-all hover:-translate-y-0.5">
            <Plus className="w-4 h-4" /> مشروع جديد
          </Link>
        </div>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
            title="إجمالي الإيرادات"
            value={formatPrice(stats.financial.total_revenue)}
            subtitle={`صافي الأرباح: ${formatPrice(stats.financial.total_profit)}`}
            icon={<DollarSign className="w-6 h-6" />}
            gradient="from-emerald-500 to-teal-500"
            trend="+12% هذا الشهر"
            trendUp={true}
          />
          <KpiCard
            title="المشاريع النشطة"
            value={stats.counts.projects.toString()}
            subtitle={`إجمالي عروض الأسعار: ${stats.counts.quotes}`}
            icon={<FolderOpen className="w-6 h-6" />}
            gradient="from-blue-500 to-indigo-600"
          />
          <KpiCard
            title="متوسط هامش الربح"
            value={`${stats.financial.avg_margin_pct}%`}
            subtitle={`التسعير الافتراضي: ${stats.financial.default_margin * 100}%`}
            icon={<Target className="w-6 h-6" />}
            gradient="from-amber-400 to-orange-500"
            trend="مستقر"
          />
          <KpiCard
            title="قاعدة العملاء"
            value={stats.counts.clients.toString()}
            subtitle={`زيادة 3 عملاء جدد`}
            icon={<Users className="w-6 h-6" />}
            gradient="from-purple-500 to-pink-500"
            trendUp={true}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Revenue Chart */}
          <motion.div variants={itemVariants} className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-amber-500" />
              الإيرادات الشهرية
            </h2>
            <div className="h-48 md:h-64" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyRevenue.map((m: any) => ({
                  month: m.month,
                  revenue: Math.round(m.revenue / 1000),
                  profit: Math.round(m.profit / 1000),
                  count: m.count
                }))}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: any, name: string) => [
                      `${value}K`,
                      name === 'revenue' ? 'الإيرادات' : 'الأرباح'
                    ]}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="revenue" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="profit" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Quote Status Pie Chart */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">حالة العروض</h2>
            <div className="h-44 md:h-52" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.quotesByStatus.map((s: any) => ({
                      name: s.status || 'draft',
                      value: s.count
                    }))}
                    cx="50%" cy="50%"
                    innerRadius={40} outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.quotesByStatus.map((_: any, i: number) => (
                      <Cell key={i} fill={['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'][i % 5]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {stats.quotesByStatus.map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'][i % 5] }} />
                    <span className="text-slate-600 dark:text-slate-400">{s.status || 'مسودة'}</span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-white">{s.count}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Exchange Rate & Margin KPI */}
        <motion.div variants={itemVariants} className="bg-gradient-to-l from-slate-900 to-slate-800 rounded-2xl md:rounded-3xl p-4 md:p-6 text-white grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-500/20 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs md:text-sm text-slate-400">سعر الصرف الحالي</p>
              <p className="text-lg md:text-2xl font-bold font-sans truncate" dir="ltr">1 USD = {stats.financial.exchange_rate.toLocaleString()} IQD</p>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-500/20 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-slate-400">هامش الربح الافتراضي</p>
              <p className="text-lg md:text-2xl font-bold font-sans" dir="ltr">{stats.financial.default_margin}%</p>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/20 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-slate-400">متوسط هامش الربح الفعلي</p>
              <p className="text-lg md:text-2xl font-bold font-sans" dir="ltr">{stats.financial.avg_margin_pct}%</p>
            </div>
          </div>
        </motion.div>

        {/* Two Column Layout for Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Recent Quotes */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col print:shadow-none print:border print:border-slate-200 print:break-inside-avoid">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 print:bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                أحدث عروض الأسعار
              </h2>
              <Link to="/quotes" className="text-sm text-blue-600 hover:text-blue-700 font-bold hover:underline">عرض الكل</Link>
            </div>
            <div className="flex-1 p-2">
              {stats.recentQuotes.length === 0 ? (
                <EmptyState icon={<FileText />} message="لا توجد عروض أسعار حديثة" actionLabel="إنشاء حسبة جديدة" actionPath="/project/new" />
              ) : (
                <div className="space-y-1">
                  {stats.recentQuotes.map((q, i) => (
                    <Link key={i} to={`/quote/${q.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{q.customer_name}</p>
                          <p className="text-xs text-slate-500 font-sans mt-0.5">{q.quote_number}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-800 text-sm" dir="ltr">{formatPrice(q.total_selling_price)}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusColor(q.status)}`}>
                          {q.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Recent Clients */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col print:shadow-none print:border print:border-slate-200 print:break-inside-avoid">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 print:bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                أحدث العملاء
              </h2>
              <Link to="/clients" className="text-sm text-blue-600 hover:text-blue-700 font-bold hover:underline">عرض الكل</Link>
            </div>
            <div className="flex-1 p-2">
              {stats.recentClients.length === 0 ? (
                <EmptyState icon={<Users />} message="لا يوجد عملاء حالياً" actionLabel="إضافة عميل جديد" actionPath="/clients" />
              ) : (
                <div className="space-y-1">
                  {stats.recentClients.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold shadow-inner">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{c.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5 relative pr-3">
                            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                            {c.city || 'المدينة غير محددة'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-xs text-slate-500 mb-0.5">عروض</p>
                          <p className="font-bold text-slate-700 text-sm">{c.quotes_count}</p>
                        </div>
                        {c.phone && (
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </motion.div>

      {/* Professional A4 report — hidden on screen, shown when printing */}
      <DashboardReport
        printOnly
        data={{
          counts: stats.counts,
          financial: stats.financial,
          quotesByStatus: stats.quotesByStatus,
          recentQuotes: stats.recentQuotes,
          recentClients: stats.recentClients,
          monthlyRevenue: stats.monthlyRevenue,
          formatPrice,
        }}
      />
    </div>
  );
}

function KpiCard({ title, value, subtitle, icon, gradient, trend, trendUp }: any) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group hover:shadow-md transition-shadow print:shadow-none print:border print:border-slate-200 print:break-inside-avoid">
      {/* Decorative gradient blob */}
      <div className={`absolute -left-6 -top-6 w-24 h-24 bg-gradient-to-br ${gradient} rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity print:hidden`}></div>

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg print:border print:border-slate-200 print:bg-white print:text-slate-800 print:!bg-none print:shadow-none`}>
          {icon}
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
            {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </span>
        )}
      </div>

      <div className="relative z-10">
        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{title}</h3>
        <p className="text-lg md:text-2xl font-bold text-slate-800 dark:text-white leading-none mb-2 font-sans truncate" dir="ltr">{value}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-sans">{subtitle}</p>
      </div>
    </motion.div>
  );
}

function EmptyState({ icon, message, actionLabel, actionPath }: { icon: any; message: string; actionLabel?: string; actionPath?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center h-full">
      <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800 rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-600 mb-3 shadow-sm">
        {icon}
      </div>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">{message}</p>
      {actionLabel && actionPath && (
        <Link to={actionPath} className="text-amber-600 dark:text-amber-400 text-sm font-bold hover:underline">
          {actionLabel} ←
        </Link>
      )}
    </div>
  );
}
