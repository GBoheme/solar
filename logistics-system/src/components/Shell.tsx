"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION } from "@/lib/version";

type NavItem = { href: string; label: string; icon: string };

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "العمل اليومي",
    items: [
      { href: "/dashboard", label: "لوحة التحكم", icon: "📊" },
      { href: "/transactions", label: "المعاملات", icon: "📁" },
      { href: "/transactions/new", label: "معاملة جديدة", icon: "➕" },
      { href: "/reports", label: "التقارير", icon: "📈" },
    ],
  },
  {
    section: "الأدلة والسجلات",
    items: [
      { href: "/departments", label: "دليل الجهات", icon: "🏛️" },
      { href: "/routes", label: "دليل المسارات", icon: "🛣️" },
      { href: "/companies", label: "الشركات", icon: "🏢" },
      { href: "/contracts", label: "العقود", icon: "📜" },
      { href: "/tax-letters", label: "كتب الضريبة", icon: "🧾" },
      { href: "/loading-sources", label: "مصادر التجهيز", icon: "🏭" },
    ],
  },
  {
    section: "الإدارة",
    items: [
      { href: "/templates", label: "قوالب Word", icon: "📄" },
      { href: "/error-register", label: "سجل الأخطاء", icon: "⚠️" },
      { href: "/audit-log", label: "سجل التعديلات", icon: "🕘" },
      { href: "/transaction-types", label: "أنواع المعاملات", icon: "🗂️" },
      { href: "/settings", label: "الإعدادات والصيانة", icon: "⚙️" },
    ],
  },
];

export default function Shell({ user, appName, children }: {
  user: { name: string };
  appName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const toggleTheme = () => {
    const el = document.documentElement;
    const dark = el.classList.toggle("dark");
    localStorage.theme = dark ? "dark" : "light";
  };

  const sidebar = (
    <nav className="flex h-full flex-col overflow-y-auto p-3">
      <div className="mb-4 flex items-center gap-2 px-2 pt-1">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-lg text-white">🛢️</div>
        <div className="text-[13px] font-bold leading-tight">{appName}</div>
      </div>
      {NAV.map((group) => (
        <div key={group.section} className="mb-3">
          <div className="mb-1 px-2 text-[10px] font-bold text-slate-400">{group.section}</div>
          {group.items.map((item) => {
            const active = item.href === "/transactions"
              ? pathname === "/transactions" || (pathname.startsWith("/transactions/") && pathname !== "/transactions/new")
              : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors ${
                  active
                    ? "bg-teal-700 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
      <div className="mt-auto border-t border-slate-100 px-2 pt-3 text-[10px] text-slate-400 dark:border-slate-800">
        <div className="font-bold">{user.name}</div>
        <div>الإصدار {APP_VERSION} — نمط الاستخدام الشخصي</div>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* الشريط الجانبي - حاسوب */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
        {sidebar}
      </aside>
      {/* الشريط الجانبي - موبايل */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside className="absolute right-0 h-full w-64 bg-white dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <button className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={() => setOpen(true)}>☰</button>
          <div className="flex-1" />
          <Link href="/transactions/new" className="btn-primary !px-3 !py-1.5 text-xs">＋ معاملة جديدة</Link>
          <button onClick={toggleTheme} className="rounded-lg p-2 text-lg hover:bg-slate-100 dark:hover:bg-slate-800" title="الوضع الليلي / النهاري">
            <span className="dark:hidden">🌙</span>
            <span className="hidden dark:inline">☀️</span>
          </button>
          <div className="text-left leading-tight">
            <div className="text-[13px] font-bold">{user.name}</div>
            <div className="text-[11px] text-slate-400">مالك النظام</div>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
