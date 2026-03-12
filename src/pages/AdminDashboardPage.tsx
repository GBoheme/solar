import { apiFetch } from '@/src/utils/apiFetch';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sun, Battery, Zap, Package, TrendingUp, AlertTriangle,
  FolderOpen, Plus, ChevronLeft, BarChart3, Activity, Boxes
} from 'lucide-react';

interface Stats {
  projectCount: number;
  componentCount: number;
  stockValue: number;
  recentProjects: any[];
  byCategory: { category: string; count: number }[];
  lowStock: any[];
}

const categoryLabels: Record<string, string> = {
  battery: 'البطاريات',
  panel: 'الألواح',
  inverter: 'الانفيرترات',
  controller: 'وحدات الشحن',
};

const categoryColors: Record<string, string> = {
  battery: 'bg-blue-500',
  panel: 'bg-amber-500',
  inverter: 'bg-emerald-500',
  controller: 'bg-purple-500',
};

const categoryIcons: Record<string, any> = {
  battery: Battery,
  panel: Sun,
  inverter: Zap,
  controller: Activity,
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8" dir="rtl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">لوحة التحكم</h1>
          <p className="text-slate-500 mt-1 text-sm">نظرة عامة على المنظومة والمخزون</p>
        </div>
        <Link
          to="/project/new"
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-4 md:px-5 py-2 md:py-2.5 rounded-xl transition-colors shadow-sm text-sm"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          مشروع جديد
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          icon={<FolderOpen className="w-6 h-6 text-amber-600" />}
          bg="bg-amber-50"
          label="إجمالي المشاريع"
          value={stats?.projectCount ?? 0}
          unit="مشروع"
        />
        <StatCard
          icon={<Boxes className="w-6 h-6 text-blue-600" />}
          bg="bg-blue-50"
          label="المنتجات في الكاتالوج"
          value={stats?.componentCount ?? 0}
          unit="منتج"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6 text-emerald-600" />}
          bg="bg-emerald-50"
          label="قيمة المخزون"
          value={`$${(stats?.stockValue ?? 0).toLocaleString()}`}
          unit=""
          large
        />
        <StatCard
          icon={<AlertTriangle className="w-6 h-6 text-red-500" />}
          bg="bg-red-50"
          label="تحذيرات المخزون"
          value={stats?.lowStock?.length ?? 0}
          unit="منتج منخفض"
          alert={Boolean(stats?.lowStock?.length)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-bold text-slate-800">توزيع الكاتالوج</h2>
          </div>
          <div className="space-y-4">
            {(stats?.byCategory || []).map(cat => {
              const Icon = categoryIcons[cat.category] || Package;
              const total = stats?.componentCount || 1;
              const pct = Math.round((cat.count / total) * 100);
              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">
                        {categoryLabels[cat.category] || cat.category}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-slate-800">{cat.count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${categoryColors[cat.category] || 'bg-slate-400'} transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {(stats?.byCategory || []).length === 0 && (
              <p className="text-slate-400 text-sm text-center py-4">لا توجد بيانات</p>
            )}
          </div>
        </div>

        {/* Recent Projects */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-slate-500" />
              <h2 className="text-lg font-bold text-slate-800">آخر المشاريع</h2>
            </div>
            <Link to="/" className="text-amber-600 text-sm font-medium hover:underline flex items-center gap-1">
              عرض الكل <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {(stats?.recentProjects || []).map(p => (
              <Link
                key={p.id}
                to={`/project/${p.id}`}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-amber-300 hover:bg-amber-50 transition-all group"
              >
                <div>
                  <p className="font-semibold text-slate-800 group-hover:text-amber-700">{p.name || 'بدون اسم'}</p>
                  <p className="text-sm text-slate-500">{p.customer_name || '—'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{p.status}</span>
                  <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-amber-500" />
                </div>
              </Link>
            ))}
            {(stats?.recentProjects || []).length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">لا توجد مشاريع بعد</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Warning */}
      {(stats?.lowStock || []).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold text-red-700">تحذير: منتجات منخفضة المخزون</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(stats?.lowStock || []).map((c: any) => (
              <div key={c.id} className="bg-white border border-red-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{c.brand} {c.model}</p>
                  <p className="text-xs text-slate-500">{categoryLabels[c.category] || c.category}</p>
                </div>
                <span className={`text-lg font-bold ${c.stock_qty === 0 ? 'text-red-600' : 'text-orange-500'}`}>
                  {c.stock_qty}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        {[
          { to: '/admin/catalog', icon: <Package className="w-5 h-5 md:w-6 md:h-6" />, label: 'إدارة الكاتالوج', color: 'text-blue-600 bg-blue-50 border-blue-200' },
          { to: '/admin/settings', icon: <Activity className="w-5 h-5 md:w-6 md:h-6" />, label: 'الإعدادات العامة', color: 'text-purple-600 bg-purple-50 border-purple-200' },
          { to: '/project/new', icon: <Plus className="w-5 h-5 md:w-6 md:h-6" />, label: 'مشروع جديد', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
          { to: '/', icon: <FolderOpen className="w-5 h-5 md:w-6 md:h-6" />, label: 'كل المشاريع', color: 'text-amber-600 bg-amber-50 border-amber-200' },
        ].map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-col items-center gap-2 md:gap-3 p-3 md:p-5 rounded-2xl border ${item.color} hover:shadow-md transition-all`}
          >
            {item.icon}
            <span className="text-xs md:text-sm font-semibold text-center">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, bg, label, value, unit, large, alert }: any) {
  return (
    <div className={`bg-white rounded-2xl border ${alert ? 'border-red-200' : 'border-slate-200'} shadow-sm p-6`}>
      <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className={`font-bold text-slate-800 ${large ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'}`}>{value}</p>
      {unit && <p className="text-xs text-slate-400 mt-1">{unit}</p>}
    </div>
  );
}
