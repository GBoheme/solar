import { apiFetch } from '@/src/utils/apiFetch';
import { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Users, Package, BarChart3, PieChart as PieChartIcon,
  AlertTriangle, DollarSign, Target, RefreshCw, Calendar, Award, ShoppingCart, Clock, Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { useCurrencyStore } from '../store/currencyStore';
import { triggerPrint } from '../reports/utils/reportHelpers';

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];
const SEGMENT_COLORS: Record<string, string> = {
  vip: '#f59e0b', regular: '#10b981', inactive: '#94a3b8', prospect: '#3b82f6'
};
const SEGMENT_LABELS: Record<string, string> = {
  vip: 'VIP', regular: 'عادي', inactive: 'غير نشط', prospect: 'محتمل'
};
const RISK_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
};

function Card({ title, icon: Icon, children, className = '' }: any) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 md:p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-amber-500" />
        <h3 className="font-bold text-slate-800 dark:text-white text-base md:text-lg">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function KPICard({ label, value, icon: Icon, color, subtitle }: any) {
  return (
    <div className="bg-white/80 dark:bg-slate-800 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-3 md:p-5 flex items-center gap-3 md:gap-4">
      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 md:w-6 md:h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium truncate">{label}</p>
        <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">{value}</p>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}

type TabId = 'profitability' | 'team' | 'funnel' | 'customers' | 'inventory' | 'forecast' | 'margins';

export default function AnalyticsPage() {
  const { formatPrice, exchangeRate } = useCurrencyStore();
  const [activeTab, setActiveTab] = useState<TabId>('profitability');
  const [loading, setLoading] = useState(true);
  const [profitData, setProfitData] = useState<any>(null);
  const [teamData, setTeamData] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [inventoryData, setInventoryData] = useState<any>(null);
  const [forecastData, setForecastData] = useState<any>(null);
  const [marginData, setMarginData] = useState<any>(null);

  const loadTab = async (tab: TabId) => {
    setLoading(true);
    try {
      switch (tab) {
        case 'profitability': {
          const res = await apiFetch('/api/admin/analytics/profitability');
          setProfitData(await res.json());
          break;
        }
        case 'team': {
          const res = await apiFetch('/api/admin/analytics/team-performance');
          setTeamData(await res.json());
          break;
        }
        case 'funnel': {
          const res = await apiFetch('/api/admin/analytics/quote-funnel?days=90');
          setFunnelData(await res.json());
          break;
        }
        case 'customers': {
          const res = await apiFetch('/api/admin/analytics/customer-segments');
          setCustomerData(await res.json());
          break;
        }
        case 'inventory': {
          const res = await apiFetch('/api/admin/analytics/inventory');
          setInventoryData(await res.json());
          break;
        }
        case 'forecast': {
          const res = await apiFetch('/api/admin/analytics/demand-forecast?weeks_ahead=12');
          setForecastData(await res.json());
          break;
        }
        case 'margins': {
          const res = await apiFetch('/api/admin/margin-recommendations');
          setMarginData(await res.json());
          break;
        }
      }
    } catch (err) {
      console.error('Analytics load error', err);
    }
    setLoading(false);
  };

  useEffect(() => { loadTab(activeTab); }, [activeTab]);

  const TABS = [
    { id: 'profitability' as TabId, label: 'الربحية', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'team' as TabId, label: 'أداء الفريق', icon: <Users className="w-4 h-4" /> },
    { id: 'funnel' as TabId, label: 'قمع التحويل', icon: <Target className="w-4 h-4" /> },
    { id: 'customers' as TabId, label: 'تقسيم العملاء', icon: <Users className="w-4 h-4" /> },
    { id: 'inventory' as TabId, label: 'المخزون', icon: <Package className="w-4 h-4" /> },
    { id: 'forecast' as TabId, label: 'توقع الطلب', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'margins' as TabId, label: 'تحسين الهوامش', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-20" dir="rtl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white mb-2">التحليلات والذكاء الاصطناعي</h1>
          <p className="text-slate-500 dark:text-slate-400">تحليل شامل للأعمال مع توقعات وتوصيات ذكية</p>
        </div>
        <button
          onClick={triggerPrint}
          className="no-print flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl text-sm font-bold hover:border-amber-300 hover:text-amber-600 transition-all shrink-0"
        >
          <Download className="w-4 h-4" />
          طباعة
        </button>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1 scrollbar-hide">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all border ${activeTab === tab.id
              ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-300'
            }`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={activeTab}>

          {/* === PROFITABILITY === */}
          {activeTab === 'profitability' && profitData && (
            <div className="space-y-6">
              {/* KPI Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <KPICard label="إجمالي الإيرادات" value={formatPrice((profitData.summary?.total_revenue || 0) / exchangeRate)} icon={DollarSign} color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
                <KPICard label="إجمالي الربح" value={formatPrice((profitData.summary?.total_profit || 0) / exchangeRate)} icon={TrendingUp} color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" />
                <KPICard label="متوسط الهامش" value={`${profitData.summary?.avg_margin_pct || 0}%`} icon={BarChart3} color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" />
                <KPICard label="عروض الأسعار" value={profitData.summary?.total_quotes || 0} icon={ShoppingCart} color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Category Chart */}
                <Card title="الربحية حسب الفئة" icon={BarChart3}>
                  {profitData.byCategory?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={profitData.byCategory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${(v/1000000).toFixed(1)}M`} />
                        <Tooltip formatter={(v: number) => formatPrice(v / exchangeRate)} />
                        <Bar dataKey="total_revenue" name="الإيرادات" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="total_profit" name="الربح" fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-slate-400 text-center py-8">لا توجد بيانات</p>}
                </Card>

                {/* Top Components */}
                <Card title="أكثر المنتجات ربحاً" icon={Award}>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto">
                    {profitData.topComponents?.map((c: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-700 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-400 w-6">#{i + 1}</span>
                          <div>
                            <p className="font-bold text-sm text-slate-800 dark:text-white">{c.brand} {c.model}</p>
                            <p className="text-xs text-slate-400">{c.category} — بيع {c.times_sold}×</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-emerald-600">{formatPrice((c.total_profit || 0) / exchangeRate)}</p>
                          <p className="text-xs text-slate-400">هامش {c.avg_margin}%</p>
                        </div>
                      </div>
                    ))}
                    {(!profitData.topComponents || profitData.topComponents.length === 0) && (
                      <p className="text-slate-400 text-center py-4">لا توجد بيانات</p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Low Margin Alerts */}
              {profitData.lowMarginProducts?.length > 0 && (
                <Card title="تنبيه: منتجات بهامش منخفض" icon={AlertTriangle} className="border-amber-200 dark:border-amber-800">
                  <div className="space-y-2">
                    {profitData.lowMarginProducts.map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 rounded-xl px-4 py-3">
                        <span className="font-medium text-sm text-slate-800 dark:text-white">{p.brand} {p.model}</span>
                        <span className="text-sm font-bold text-amber-600">{p.margin_percent}% هامش</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* === TEAM PERFORMANCE === */}
          {activeTab === 'team' && (
            <Card title="أداء فريق المبيعات" icon={Users}>
              {teamData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700">
                        <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500">الموظف</th>
                        <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500">العروض</th>
                        <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500 hidden sm:table-cell">محولة</th>
                        <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500">التحويل</th>
                        <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500 hidden md:table-cell">متوسط الصفقة</th>
                        <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500 hidden lg:table-cell">الإيرادات</th>
                        <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500 hidden lg:table-cell">آخر عرض</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamData.map((p: any, i: number) => (
                        <tr key={i} className="border-b border-slate-50 dark:border-slate-700">
                          <td className="px-2 md:px-4 py-3 font-bold text-slate-800 dark:text-white text-sm">{p.user_name}</td>
                          <td className="px-2 md:px-4 py-3 text-slate-600 dark:text-slate-400 font-sans text-sm">{p.total_quotes}</td>
                          <td className="px-2 md:px-4 py-3 text-emerald-600 font-bold font-sans text-sm hidden sm:table-cell">{p.converted}</td>
                          <td className="px-2 md:px-4 py-3">
                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${p.conversion_rate >= 50 ? 'bg-emerald-100 text-emerald-700' : p.conversion_rate >= 25 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                              {p.conversion_rate}%
                            </span>
                          </td>
                          <td className="px-2 md:px-4 py-3 text-slate-600 dark:text-slate-400 font-sans text-sm hidden md:table-cell">{formatPrice((p.avg_deal_size || 0) / exchangeRate)}</td>
                          <td className="px-2 md:px-4 py-3 font-bold text-slate-800 dark:text-white font-sans text-sm hidden lg:table-cell">{formatPrice((p.total_revenue || 0) / exchangeRate)}</td>
                          <td className="px-2 md:px-4 py-3 text-xs text-slate-400 font-sans hidden lg:table-cell">{p.last_quote_date ? new Date(p.last_quote_date).toLocaleDateString('ar-EG') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-slate-400 text-center py-8">لا توجد بيانات</p>}
            </Card>
          )}

          {/* === QUOTE FUNNEL === */}
          {activeTab === 'funnel' && funnelData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="قمع تحويل العروض (آخر 90 يوم)" icon={Target}>
                  {funnelData.funnel?.length > 0 ? (
                    <div className="space-y-3">
                      {funnelData.funnel.map((f: any, i: number) => {
                        const statusLabels: Record<string, string> = { draft: 'مسودة', sent: 'مرسل', approved: 'معتمد', converted: 'محول', expired: 'منتهي' };
                        const maxCount = Math.max(...funnelData.funnel.map((ff: any) => ff.count));
                        const width = maxCount > 0 ? (f.count / maxCount) * 100 : 0;
                        return (
                          <div key={i}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-slate-700 dark:text-slate-300">{statusLabels[f.status] || f.status}</span>
                              <span className="font-bold text-slate-800 dark:text-white">{f.count} ({f.percentage}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-4">
                              <div className="h-4 rounded-full transition-all" style={{ width: `${width}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <p className="text-slate-400 text-center py-8">لا توجد بيانات</p>}
                </Card>

                <Card title="توزيع الحالات" icon={PieChartIcon}>
                  {funnelData.funnel?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={funnelData.funnel.map((f: any) => ({ name: f.status, value: f.count }))} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                          {funnelData.funnel.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-slate-400 text-center py-8">لا توجد بيانات</p>}
                </Card>
              </div>
            </div>
          )}

          {/* === CUSTOMER SEGMENTS === */}
          {activeTab === 'customers' && customerData && (
            <div className="space-y-6">
              {/* Segment KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(customerData.counts || {}).map(([seg, count]) => (
                  <KPICard key={seg} label={SEGMENT_LABELS[seg] || seg} value={count as number}
                    icon={seg === 'vip' ? Award : seg === 'inactive' ? Clock : Users}
                    color={`${seg === 'vip' ? 'bg-amber-100 text-amber-600' : seg === 'regular' ? 'bg-emerald-100 text-emerald-600' : seg === 'inactive' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-600'} dark:opacity-80`}
                  />
                ))}
              </div>

              <Card title="قائمة العملاء حسب الشريحة" icon={Users}>
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700">
                        <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500">العميل</th>
                        <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500">الشريحة</th>
                        <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500 hidden sm:table-cell">الطلبات</th>
                        <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500 hidden md:table-cell">إجمالي الإنفاق</th>
                        <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500 hidden lg:table-cell">آخر طلب</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerData.customers?.slice(0, 20).map((c: any, i: number) => (
                        <tr key={i} className="border-b border-slate-50 dark:border-slate-700">
                          <td className="px-2 md:px-4 py-3">
                            <p className="font-bold text-sm text-slate-800 dark:text-white">{c.name}</p>
                            <p className="text-xs text-slate-400">{c.city || '—'}</p>
                          </td>
                          <td className="px-2 md:px-4 py-3">
                            <span className="px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: `${SEGMENT_COLORS[c.segment]}20`, color: SEGMENT_COLORS[c.segment] }}>
                              {SEGMENT_LABELS[c.segment]}
                            </span>
                          </td>
                          <td className="px-2 md:px-4 py-3 text-slate-600 dark:text-slate-400 font-sans hidden sm:table-cell">{c.total_orders}</td>
                          <td className="px-2 md:px-4 py-3 font-bold text-slate-800 dark:text-white font-sans hidden md:table-cell">{formatPrice((c.total_spent || 0) / exchangeRate)}</td>
                          <td className="px-2 md:px-4 py-3 text-xs text-slate-400 font-sans hidden lg:table-cell">{c.days_since_last != null ? `قبل ${c.days_since_last} يوم` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* === INVENTORY === */}
          {activeTab === 'inventory' && inventoryData && (
            <div className="space-y-6">
              {/* Stock Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="ملخص المخزون حسب الفئة" icon={Package}>
                  {inventoryData.stockSummary?.length > 0 ? (
                    <div className="space-y-3">
                      {inventoryData.stockSummary.map((s: any, i: number) => (
                        <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-3">
                          <div>
                            <p className="font-bold text-sm text-slate-800 dark:text-white">{s.category}</p>
                            <p className="text-xs text-slate-400">{s.unique_products} منتج — {s.total_units} وحدة</p>
                          </div>
                          <div className="flex gap-2">
                            {s.out_of_stock > 0 && <span className="px-2 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700">{s.out_of_stock} نفد</span>}
                            {s.low_stock > 0 && <span className="px-2 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-700">{s.low_stock} منخفض</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-slate-400 text-center py-8">لا توجد بيانات</p>}
                </Card>

                <Card title="الأكثر مبيعاً (آخر 90 يوم)" icon={TrendingUp}>
                  <div className="space-y-3">
                    {inventoryData.topSelling?.map((c: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-700 last:border-0">
                        <div>
                          <p className="font-bold text-sm text-slate-800 dark:text-white">{c.brand} {c.model}</p>
                          <p className="text-xs text-slate-400">{c.category} — مخزون: {c.stock_qty}</p>
                        </div>
                        <span className="text-sm font-bold text-amber-600">{c.total_sold} وحدة</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Slow Moving */}
              {inventoryData.slowMoving?.length > 0 && (
                <Card title="مخزون بطيء الحركة (60+ يوم بدون طلب)" icon={AlertTriangle} className="border-amber-200 dark:border-amber-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-700">
                          <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500">المنتج</th>
                          <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500 hidden sm:table-cell">الفئة</th>
                          <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500">المخزون</th>
                          <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500">أيام بدون حركة</th>
                          <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500 hidden md:table-cell">قيمة المخزون</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryData.slowMoving.map((s: any, i: number) => (
                          <tr key={i} className="border-b border-slate-50 dark:border-slate-700">
                            <td className="px-2 md:px-4 py-3 font-bold text-sm text-slate-800 dark:text-white">{s.brand} {s.model}</td>
                            <td className="px-2 md:px-4 py-3 text-xs text-slate-400 hidden sm:table-cell">{s.category}</td>
                            <td className="px-2 md:px-4 py-3 font-sans">{s.stock_qty}</td>
                            <td className="px-2 md:px-4 py-3 font-sans text-amber-600 font-bold">{s.days_idle} يوم</td>
                            <td className="px-2 md:px-4 py-3 font-sans hidden md:table-cell">{formatPrice(s.stock_value_usd || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* === DEMAND FORECAST === */}
          {activeTab === 'forecast' && forecastData && (
            <div className="space-y-6">
              {/* Risk KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                <KPICard label="خطر مرتفع (إعادة طلب فوري)" value={forecastData.high_risk || 0} icon={AlertTriangle} color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" />
                <KPICard label="خطر متوسط (مراقبة)" value={forecastData.medium_risk || 0} icon={TrendingDown} color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
                <KPICard label="فترة التوقع" value={`${forecastData.weeks_ahead || 12} أسبوع`} icon={Calendar} color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" />
              </div>

              <Card title="توقعات الطلب لكل منتج" icon={TrendingUp}>
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700">
                        <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500">المنتج</th>
                        <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500">المخزون</th>
                        <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500 hidden sm:table-cell">طلب أسبوعي</th>
                        <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500 hidden md:table-cell">الاتجاه</th>
                        <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500 hidden lg:table-cell">أسابيع المخزون</th>
                        <th className="px-2 md:px-4 py-3 text-xs font-bold text-slate-500">المخاطر</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecastData.forecasts?.map((f: any, i: number) => (
                        <tr key={i} className="border-b border-slate-50 dark:border-slate-700">
                          <td className="px-2 md:px-4 py-3">
                            <p className="font-bold text-sm text-slate-800 dark:text-white">{f.brand} {f.model}</p>
                            <p className="text-xs text-slate-400">{f.category}</p>
                          </td>
                          <td className="px-2 md:px-4 py-3 font-sans">{f.stock_qty}</td>
                          <td className="px-2 md:px-4 py-3 font-sans hidden sm:table-cell">{f.avg_weekly_demand}</td>
                          <td className="px-2 md:px-4 py-3 hidden md:table-cell">
                            <span className={`flex items-center gap-1 text-xs font-bold ${f.trend_percent > 0 ? 'text-emerald-600' : f.trend_percent < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                              {f.trend_percent > 0 ? <TrendingUp className="w-3 h-3" /> : f.trend_percent < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                              {f.trend_percent > 0 ? '+' : ''}{f.trend_percent}%
                            </span>
                          </td>
                          <td className="px-2 md:px-4 py-3 font-sans font-bold hidden lg:table-cell">{f.stock_weeks_remaining > 100 ? '∞' : f.stock_weeks_remaining}</td>
                          <td className="px-2 md:px-4 py-3">
                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${RISK_COLORS[f.risk_level]}`}>
                              {f.risk_level === 'high' ? 'مرتفع' : f.risk_level === 'medium' ? 'متوسط' : 'منخفض'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(!forecastData.forecasts || forecastData.forecasts.length === 0) && (
                        <tr><td colSpan={6} className="text-center py-8 text-slate-400">لا توجد بيانات كافية للتوقع</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* === MARGIN RECOMMENDATIONS === */}
          {activeTab === 'margins' && marginData && (
            <div className="space-y-6">
              {/* Recommendations */}
              {marginData.recommendations?.length > 0 && (
                <Card title="توصيات تحسين الهوامش" icon={Target}>
                  <div className="space-y-3">
                    {marginData.recommendations.map((r: any, i: number) => (
                      <div key={i} className={`flex items-start gap-2 md:gap-3 p-3 md:p-4 rounded-xl ${r.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                        <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${r.type === 'warning' ? 'text-amber-500' : 'text-blue-500'}`} />
                        <div>
                          <p className="font-medium text-sm text-slate-800 dark:text-white">{r.message}</p>
                          <p className="text-xs text-slate-500 mt-1">{r.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Margins */}
                <Card title="متوسط الهامش حسب الفئة" icon={BarChart3}>
                  {marginData.category_margins?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={marginData.category_margins}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} unit="%" />
                        <Tooltip formatter={(v: number) => `${v}%`} />
                        <Bar dataKey="avg_margin" name="متوسط الهامش" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-slate-400 text-center py-8">لا توجد بيانات</p>}
                </Card>

                {/* Seasonal Margins */}
                <Card title="الهامش الموسمي (شهري)" icon={Calendar}>
                  {marginData.seasonal_margins?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={marginData.seasonal_margins}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} unit="%" />
                        <Tooltip formatter={(v: number) => `${v}%`} />
                        <Line type="monotone" dataKey="avg_margin" name="الهامش" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <p className="text-slate-400 text-center py-8">لا توجد بيانات</p>}
                </Card>
              </div>

              {/* Below Default */}
              {marginData.below_default?.length > 0 && (
                <Card title={`منتجات بهامش أقل من الافتراضي (${marginData.default_margin}%)`} icon={AlertTriangle} className="border-amber-200 dark:border-amber-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {marginData.below_default.map((p: any, i: number) => (
                      <div key={i} className="bg-amber-50 dark:bg-amber-900/20 rounded-xl px-4 py-3 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-sm text-slate-800 dark:text-white">{p.brand} {p.model}</p>
                          <p className="text-xs text-slate-400">{p.category}</p>
                        </div>
                        <span className="text-sm font-bold text-amber-600">{p.margin_percent}%</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

        </motion.div>
      )}
    </div>
  );
}
