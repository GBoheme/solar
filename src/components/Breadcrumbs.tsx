import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, Home, Command } from 'lucide-react';

const ROUTE_NAMES: Record<string, string> = {
  '/': 'الرئيسية',
  '/quotes': 'عروض الأسعار',
  '/clients': 'العملاء',
  '/project/new': 'مشروع جديد',
  '/admin': 'لوحة التحكم',
  '/admin/catalog': 'الكاتالوج',
  '/admin/settings': 'الإعدادات المتقدمة',
};

export default function Breadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  // Build breadcrumb items
  const crumbs: { label: string; path: string }[] = [
    { label: 'الرئيسية', path: '/' },
  ];

  let accPath = '';
  for (const segment of pathSegments) {
    accPath += `/${segment}`;
    const name = ROUTE_NAMES[accPath];
    if (name && accPath !== '/') {
      crumbs.push({ label: name, path: accPath });
    } else if (!name && segment !== 'new') {
      // Dynamic segment like project/:id
      const parentName = ROUTE_NAMES[accPath.replace(`/${segment}`, '/:id')];
      if (parentName) {
        crumbs.push({ label: parentName, path: accPath });
      }
    }
  }

  // Don't show breadcrumbs on home page
  if (location.pathname === '/') return null;

  return (
    <div className="flex items-center justify-between mb-6">
      <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
        {crumbs.map((crumb, idx) => (
          <div key={crumb.path} className="flex items-center gap-1.5">
            {idx > 0 && <ChevronLeft className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />}
            {idx === crumbs.length - 1 ? (
              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                {idx === 0 && <Home className="w-3.5 h-3.5" />}
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center gap-1.5"
              >
                {idx === 0 && <Home className="w-3.5 h-3.5" />}
                {crumb.label}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Cmd+K hint */}
      <button
        onClick={() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
        }}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
      >
        <Command className="w-3 h-3" />
        <span>K</span>
        <span className="text-slate-300 dark:text-slate-600 mr-1">بحث سريع</span>
      </button>
    </div>
  );
}
