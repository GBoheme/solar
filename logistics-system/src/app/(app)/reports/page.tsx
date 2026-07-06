"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/client";
import { Spinner, EmptyState } from "@/components/ui";

/* eslint-disable @typescript-eslint/no-explicit-any */

const REPORTS: { key: string; label: string; group: string }[] = [
  { key: "today", label: "معاملات اليوم", group: "المعاملات" },
  { key: "week", label: "معاملات هذا الأسبوع", group: "المعاملات" },
  { key: "awaiting-review", label: "بانتظار التدقيق", group: "المعاملات" },
  { key: "monthly", label: "الإنجاز الشهري", group: "المعاملات" },
  { key: "by-department", label: "حسب الجهة", group: "المعاملات" },
  { key: "by-company", label: "حسب الشركة", group: "المعاملات" },
  { key: "by-route", label: "حسب المسار", group: "المعاملات" },
  { key: "by-source", label: "حسب مصدر التجهيز", group: "الكميات" },
  { key: "cut-forms-open", label: "استمارات القطع المفتوحة", group: "الكميات" },
  { key: "cut-forms-closed", label: "استمارات القطع المغلقة", group: "الكميات" },
  { key: "quantities", label: "إجمالي الكميات", group: "الكميات" },
  { key: "drivers", label: "السيارات والسائقون", group: "الكميات" },
  { key: "missing-attachments", label: "المرفقات الناقصة", group: "الجودة" },
  { key: "top-errors", label: "أكثر الأخطاء تكراراً", group: "الجودة" },
  { key: "errors-by-user", label: "أخطاء حسب المستخدم", group: "الجودة" },
  { key: "errors-by-type", label: "أخطاء حسب نوع المعاملة", group: "الجودة" },
];

export default function ReportsPage() {
  const [type, setType] = useState("today");
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiGet<{ report: any }>(`/api/reports?type=${type}`);
      setReport(d.report);
    } finally {
      setLoading(false);
    }
  }, [type]);
  useEffect(() => { load(); }, [load]);

  const groups = [...new Set(REPORTS.map((r) => r.group))];

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-56">
        <div className="card p-3">
          {groups.map((g) => (
            <div key={g} className="mb-2">
              <div className="mb-1 px-2 text-[10px] font-bold text-slate-400">{g}</div>
              {REPORTS.filter((r) => r.group === g).map((r) => (
                <button
                  key={r.key}
                  onClick={() => setType(r.key)}
                  className={`mb-0.5 block w-full rounded-lg px-2.5 py-1.5 text-right text-xs font-semibold ${
                    type === r.key ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center gap-3">
          <h1 className="text-lg font-bold">{report?.title ?? "التقارير"}</h1>
          <div className="flex-1" />
          <a className="btn-secondary" href={`/api/reports?type=${type}&format=xlsx`}>📥 تصدير Excel</a>
        </div>
        <div className="card overflow-x-auto">
          {loading ? <Spinner /> : !report || report.rows.length === 0 ? <EmptyState text="لا توجد بيانات لهذا التقرير" /> : (
            <table className="data">
              <thead>
                <tr>{report.headers.map((h: string, i: number) => <th key={i}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {report.rows.map((row: any[], ri: number) => (
                  <tr key={ri}>{row.map((c, ci) => <td key={ci}>{c ?? "—"}</td>)}</tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
