import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Sun, LayoutDashboard, FolderPlus, Package, Settings, BarChart3, ChevronDown, ChevronUp, Users, Moon, SunMedium, Menu, X, Brain, Sparkles, DollarSign, Wallet } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useCurrencyStore } from '../store/currencyStore';
import Breadcrumbs from './Breadcrumbs';
import { brandConfig } from '../reports/config/brandConfig';

export default function Layout() {
  const location = useLocation();
  const { isDark, toggleTheme } = useThemeStore();
  const [adminOpen, setAdminOpen] = useState(
    location.pathname.startsWith('/admin')
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currency, exchangeRate, setCurrency, setExchangeRate } = useCurrencyStore();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 transition-colors" dir="rtl">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
            <Sun className="w-4 h-4 text-slate-900" />
          </div>
          <span className="font-bold text-sm">{brandConfig.company.nameAr}</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-slate-800">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 right-0 z-50 w-72 md:w-64 bg-slate-900 dark:bg-slate-950 text-white flex flex-col transform transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        {/* Logo */}
        <div className="hidden md:flex items-center gap-3 px-6 py-5 border-b border-slate-800">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center">
            <Sun className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">{brandConfig.company.nameAr}</h1>
            <p className="text-xs text-slate-400">{brandConfig.company.sidebarSubtitleAr}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavItem to="/" icon={<LayoutDashboard className="w-4 h-4" />} label="المشاريع" active={isActive('/')} onClick={() => setSidebarOpen(false)} />
          <NavItem to="/quotes" icon={<FolderPlus className="w-4 h-4" />} label="عروض الأسعار" active={isActive('/quotes')} onClick={() => setSidebarOpen(false)} />
          <NavItem to="/clients" icon={<Users className="w-4 h-4" />} label="العملاء" active={isActive('/clients')} onClick={() => setSidebarOpen(false)} />
          <NavItem to="/project/new" icon={<FolderPlus className="w-4 h-4" />} label="مشروع جديد" active={isActive('/project/new')} onClick={() => setSidebarOpen(false)} />
          <NavItem to="/workspace" icon={<LayoutDashboard className="w-4 h-4 text-emerald-500" />} label="مساحة التسعير الذكية" active={isActive('/workspace')} onClick={() => setSidebarOpen(false)} />
          <NavItem to="/ai-assistant" icon={<Sparkles className="w-4 h-4 text-amber-500" />} label="المساعد الذكي" active={isActive('/ai-assistant')} onClick={() => setSidebarOpen(false)} />

          {/* Divider */}
          <div className="pt-3 pb-1">
            <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">الإدارة</p>
          </div>

          <NavItem to="/admin" icon={<BarChart3 className="w-4 h-4" />} label="لوحة التحكم" active={location.pathname === '/admin'} onClick={() => setSidebarOpen(false)} />

          <button
            onClick={() => setAdminOpen(v => !v)}
            className={`relative w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 group ${adminOpen ? 'text-amber-400 bg-slate-800/50' : 'text-slate-400 hover:text-white hover:bg-slate-800/80'}`}
          >
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5" />
              <span>المنتجات والإعدادات</span>
            </div>
            {adminOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {adminOpen && (
            <div className="mr-5 border-r-2 border-slate-800 pr-3 space-y-1 mt-1 mb-2">
              <NavItem to="/admin/catalog" icon={<Package className="w-4 h-4" />} label="الكاتالوج" active={isActive('/admin/catalog')} sub onClick={() => setSidebarOpen(false)} />
              <NavItem to="/admin/analytics" icon={<Brain className="w-4 h-4" />} label="التحليلات والذكاء" active={isActive('/admin/analytics')} sub onClick={() => setSidebarOpen(false)} />
              <NavItem to="/admin/settings" icon={<Settings className="w-4 h-4" />} label="الإعدادات المتقدمة" active={isActive('/admin/settings')} sub onClick={() => setSidebarOpen(false)} />
            </div>
          )}
        </nav>

        {/* Footer — theme toggle + version */}
        <div className="px-4 py-4 border-t border-slate-800 space-y-3">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {isDark ? <SunMedium className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
          </button>

          {/* Global Currency Toggle */}
          <div className="bg-slate-800/40 rounded-xl p-2 space-y-2">
            <div className="flex bg-slate-900/50 rounded-lg p-1">
              <button
                onClick={() => setCurrency('USD')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold transition-all ${
                  currency === 'USD' 
                    ? 'bg-amber-500 text-slate-900 shadow-sm' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                USD
              </button>
              <button
                onClick={() => setCurrency('IQD')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold transition-all ${
                  currency === 'IQD' 
                    ? 'bg-amber-500 text-slate-900 shadow-sm' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                IQD
              </button>
            </div>
            
            {currency === 'IQD' && (
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-[10px] text-slate-400 font-medium">سعر الصرف:</span>
                <div className="flex items-center gap-1 bg-slate-900/50 px-2 py-0.5 rounded-md border border-slate-700">
                  <span className="text-[10px] text-slate-500">1$ =</span>
                  <input 
                    type="number" 
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(Number(e.target.value))}
                    className="w-12 bg-transparent text-xs font-bold text-white text-center outline-none"
                    dir="ltr"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Admin badge */}
          <div className="flex items-center justify-center bg-slate-800/50 rounded-xl px-3 py-2.5">
            <p className="text-xs font-medium text-amber-400">المسؤول — وصول مباشر</p>
          </div>

          <p className="text-center text-[10px] text-slate-600">{brandConfig.company.nameAr} {brandConfig.version}</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 px-3 py-4 md:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
        <Breadcrumbs />
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, icon, label, active, sub, onClick }: { to: string; icon: React.ReactNode; label: string; active: boolean; sub?: boolean; onClick?: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 overflow-hidden group ${active
        ? 'bg-gradient-to-l from-amber-500 to-amber-400 text-slate-900 shadow-lg shadow-amber-500/20'
        : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
        } ${sub && !active ? 'opacity-80 text-[13px] py-2.5' : ''}`}
    >
      {active && (
        <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
      )}
      <div className={`relative z-10 transition-transform duration-300 ${!active && 'group-hover:scale-110 group-hover:text-amber-400'}`}>
        {icon}
      </div>
      <span className="relative z-10">{label}</span>
    </Link>
  );
}
