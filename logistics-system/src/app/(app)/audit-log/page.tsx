"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/client";
import { Spinner, EmptyState } from "@/components/ui";
import { fmtDateTime } from "@/lib/constants";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function AuditLogPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiGet<{ items: any[]; total: number }>(`/api/audit-log?page=${page}`);
      setItems(d.items);
      setTotal(d.total);
    } finally {
      setLoading(false);
    }
  }, [page]);
  useEffect(() => { load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / 50));

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">سجل التعديلات (Audit Log)</h1>
      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : items.length === 0 ? <EmptyState text="لا يوجد نشاط" /> : (
          <table className="data">
            <thead>
              <tr><th>التاريخ</th><th>المستخدم</th><th>المعاملة</th><th>الإجراء</th></tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap text-xs tabular-nums">{fmtDateTime(a.created_at)}</td>
                  <td className="whitespace-nowrap font-semibold">{a.user.name}</td>
                  <td>
                    {a.transaction ? (
                      <Link className="font-bold text-teal-700 hover:underline dark:text-teal-400" href={`/transactions/${a.transaction_id}`}>
                        {a.transaction.internal_number}
                      </Link>
                    ) : (a.entity ?? "—")}
                  </td>
                  <td>{a.action}</td>
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
