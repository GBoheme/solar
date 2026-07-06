"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/client";
import { Spinner, StatusBadge } from "@/components/ui";
import { fmtDateTime } from "@/lib/constants";
import { ERROR_LABELS } from "@/lib/error-labels";

/* eslint-disable @typescript-eslint/no-explicit-any */

function StatCard({ label, value, color, href }: { label: string; value: number; color: string; href?: string }) {
  const body = (
    <div className={`card p-4 transition-shadow hover:shadow-md`}>
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="mt-1 text-xs font-semibold text-slate-500">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function BarList({ title, items }: { title: string; items: { name: string; count: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      {items.length === 0 && <div className="text-xs text-slate-400">لا توجد بيانات</div>}
      <div className="space-y-2">
        {items.slice(0, 8).map((i, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <span className="w-40 truncate font-semibold">{i.name}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-teal-600" style={{ width: `${(i.count / max) * 100}%` }} />
            </div>
            <span className="w-8 text-left font-bold tabular-nums">{i.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    apiGet("/api/dashboard").then(setData).catch(() => {});
  }, []);

  if (!data) return <Spinner />;
  const s = data.stats;

  const QUICK_ACTIONS = [
    { href: "/transactions/new", label: "معاملة جديدة", icon: "➕", primary: true },
    { href: "/transactions", label: "كل المعاملات", icon: "📁" },
    { href: "/reports", label: "التقارير", icon: "📈" },
    { href: "/templates", label: "قوالب Word", icon: "📄" },
    { href: "/settings", label: "الإعدادات والصيانة", icon: "⚙️" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold">لوحة التحكم</h1>
        <div className="flex-1" />
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.href} href={a.href} className={`${a.primary ? "btn-primary" : "btn-secondary"} !px-3 !py-1.5 text-xs`}>
            {a.icon} {a.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="معاملات مفتوحة" value={s.open} color="text-teal-700 dark:text-teal-400" href="/transactions" />
        <StatCard label="ناقصة (بيانات/مرفقات)" value={s.missing} color="text-amber-600" href="/transactions?status=MISSING_DATA" />
        <StatCard label="بانتظار التدقيق" value={s.awaiting_review} color="text-blue-600" href="/transactions?status=AWAITING_REVIEW" />
        <StatCard label="جاهزة للإصدار" value={s.ready_to_issue} color="text-emerald-600" href="/transactions?status=READY_TO_ISSUE" />
        <StatCard label="معادة للتصحيح" value={s.returned} color="text-rose-600" href="/transactions?status=RETURNED_FOR_CORRECTION" />
        <StatCard label="إجمالي المعاملات" value={s.total} color="text-slate-600 dark:text-slate-300" href="/transactions" />
      </div>

      {data.alerts.length > 0 && (
        <div className="card border-amber-300 p-4 dark:border-amber-900">
          <h3 className="mb-2 text-sm font-bold text-amber-700 dark:text-amber-400">⚠️ تنبيهات النقص والتضارب (آخر الأخطاء غير المحلولة)</h3>
          <div className="space-y-1.5">
            {data.alerts.map((a: any) => (
              <Link key={a.id} href={`/transactions/${a.transaction.id}`} className="flex items-start gap-2 rounded-lg px-2 py-1 text-xs hover:bg-amber-50 dark:hover:bg-amber-950/40">
                <span className={`badge shrink-0 ${a.severity === "CRITICAL" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                  {a.severity === "CRITICAL" ? "حرج" : "تحذير"}
                </span>
                <span className="font-semibold">{a.transaction.internal_number}:</span>
                <span className="text-slate-600 dark:text-slate-300">{a.message}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <BarList title="المعاملات حسب النوع" items={data.byType} />
        <BarList title="المعاملات حسب الجهة" items={data.byDepartment} />
        <BarList title="المعاملات حسب المسار" items={data.byRoute} />
        <BarList
          title="أكثر الأخطاء تكراراً"
          items={data.topErrors.map((e: any) => ({ name: ERROR_LABELS[e.error_type] ?? e.error_type, count: e.count }))}
        />
      </div>

      <div className="card overflow-x-auto">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold dark:border-slate-800">آخر المعاملات المنشأة</div>
        <table className="data">
          <thead>
            <tr><th>الرقم الداخلي</th><th>النوع</th><th>العنوان</th><th>الجهة</th><th>الحالة</th><th>أخطاء</th><th>آخر تعديل</th></tr>
          </thead>
          <tbody>
            {data.recent.map((t: any) => (
              <tr key={t.id}>
                <td><Link className="font-bold text-teal-700 hover:underline dark:text-teal-400" href={`/transactions/${t.id}`}>{t.internal_number}</Link></td>
                <td>{t.transaction_type.name}</td>
                <td className="max-w-72 truncate">{t.subject}</td>
                <td>{t.target_department?.short_name ?? "—"}</td>
                <td><StatusBadge status={t.status} /></td>
                <td>{t._count.validation_errors > 0 ? <span className="font-bold text-rose-600">{t._count.validation_errors}</span> : "—"}</td>
                <td className="text-xs text-slate-500">{fmtDateTime(t.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
