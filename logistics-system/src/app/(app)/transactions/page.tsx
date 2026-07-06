"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiGet } from "@/lib/client";
import { Spinner, StatusBadge, EmptyState } from "@/components/ui";
import { STATUSES, PRIORITIES, fmtDate } from "@/lib/constants";

/* eslint-disable @typescript-eslint/no-explicit-any */

function TransactionsList() {
  const params = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [typeId, setTypeId] = useState("");
  const [types, setTypes] = useState<any[]>([]);

  useEffect(() => {
    apiGet<{ items: any[] }>("/api/catalog/transaction-types").then((d) => setTypes(d.items)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (q) sp.set("q", q);
      if (status) sp.set("status", status);
      if (typeId) sp.set("type", typeId);
      sp.set("page", String(page));
      const data = await apiGet<{ items: any[]; total: number }>(`/api/transactions?${sp}`);
      setItems(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [q, status, typeId, page]);
  useEffect(() => { load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-bold">المعاملات <span className="text-sm font-normal text-slate-400">({total})</span></h1>
        <div className="flex-1" />
        <input className="input max-w-52" placeholder="بحث برقم أو عنوان…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="input max-w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">كل الحالات</option>
          {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input max-w-44" value={typeId} onChange={(e) => { setTypeId(e.target.value); setPage(1); }}>
          <option value="">كل الأنواع</option>
          {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <Link href="/transactions/new" className="btn-primary">＋ معاملة جديدة</Link>
      </div>

      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : items.length === 0 ? <EmptyState text="لا توجد معاملات مطابقة" /> : (
          <table className="data">
            <thead>
              <tr>
                <th>الرقم الداخلي</th><th>النوع</th><th>العنوان</th><th>الجهة المخاطبة</th><th>الشركة</th>
                <th>الحالة</th><th>الأهمية</th><th>🚚</th><th>📋</th><th>📎</th><th>⚠️</th><th>تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id}>
                  <td><Link className="font-bold text-teal-700 hover:underline dark:text-teal-400" href={`/transactions/${t.id}`}>{t.internal_number}</Link></td>
                  <td className="whitespace-nowrap">{t.transaction_type.name}</td>
                  <td className="max-w-64 truncate" title={t.subject}>{t.subject}</td>
                  <td>{t.target_department?.short_name ?? <span className="text-rose-500">غير مختارة</span>}</td>
                  <td>{t.company?.short_name ?? t.company?.official_name ?? "—"}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td className="text-xs">{(PRIORITIES as any)[t.priority] ?? t.priority}</td>
                  <td className="tabular-nums">{t._count.drivers}</td>
                  <td className="tabular-nums">{t._count.cut_forms}</td>
                  <td className="tabular-nums">{t._count.attachments}</td>
                  <td>{t._count.validation_errors > 0 ? <span className="font-bold text-rose-600">{t._count.validation_errors}</span> : "—"}</td>
                  <td className="text-xs text-slate-500">{fmtDate(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <button className="btn-secondary !px-2.5 !py-1" disabled={page <= 1} onClick={() => setPage(page - 1)}>السابق</button>
          <span className="tabular-nums">{page} / {pages}</span>
          <button className="btn-secondary !px-2.5 !py-1" disabled={page >= pages} onClick={() => setPage(page + 1)}>التالي</button>
        </div>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return <Suspense><TransactionsList /></Suspense>;
}
