"use client";

import { useState } from "react";
import { apiPost, apiDelete } from "@/lib/client";
import { Alert, EmptyState } from "@/components/ui";
import type { TabProps } from "./TransactionFile";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function RoutesTab({ tx, canEdit, reload, toast, catalogs }: TabProps) {
  const [routeId, setRouteId] = useState("");
  const routes = catalogs["routes"] ?? [];
  const linkedIds = new Set(tx.routes.map((r: any) => r.route.id));

  const link = async () => {
    if (!routeId) return toast("اختر مساراً من الدليل", "error");
    try {
      await apiPost(`/api/transactions/${tx.id}/routes`, { route_id: Number(routeId) });
      toast("تم ربط المسار");
      setRouteId("");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الربط", "error");
    }
  };

  const unlink = async (rid: number) => {
    try {
      await apiDelete(`/api/transactions/${tx.id}/routes`, { route_id: rid });
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل", "error");
    }
  };

  // تحذير مطابقة مصدر التجهيز
  const cutSources = new Set(tx.cut_forms.map((cf: any) => cf.loading_source_id).filter(Boolean));
  const routeSources = new Set(tx.routes.map((r: any) => r.route.loading_source_id).filter(Boolean));
  const mismatch =
    cutSources.size > 0 && routeSources.size > 0 &&
    [...cutSources].some((s) => !routeSources.has(s));

  return (
    <div className="space-y-4">
      <Alert kind="info">
        المسار حقل خطر — يُختار حصراً من دليل المسارات ولا يُكتب يدوياً. يطابق النظام مصدر التجهيز مع بداية المسار تلقائياً.
      </Alert>

      {mismatch && (
        <Alert kind="warn">⚠️ يوجد استمارة قطع بمصدر تجهيز لا يطابق أياً من مسارات المعاملة — راجع تبويب استمارات القطع.</Alert>
      )}

      {canEdit && (
        <div className="card flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-64 flex-1">
            <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">اختيار مسار من الدليل</span>
            <select className="input" value={routeId} onChange={(e) => setRouteId(e.target.value)}>
              <option value="">— اختر —</option>
              {routes.filter((r: any) => !linkedIds.has(r.id)).map((r: any) => (
                <option key={r.id} value={r.id}>
                  [{r.code}] {r.official_description}{!r.is_active ? " (غير فعال)" : ""}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary" onClick={link}>ربط المسار</button>
        </div>
      )}

      <div className="card overflow-x-auto">
        {tx.routes.length === 0 ? <EmptyState text="لا توجد مسارات مرتبطة — اختر من دليل المسارات" /> : (
          <table className="data">
            <thead>
              <tr><th>الكود</th><th>الصيغة الرسمية</th><th>مصدر التجهيز</th><th>السيطرات</th><th>المنتج</th><th>فعال</th>{canEdit && <th></th>}</tr>
            </thead>
            <tbody>
              {tx.routes.map((tr: any) => (
                <tr key={tr.id}>
                  <td className="font-bold">{tr.route.code}</td>
                  <td>{tr.route.official_description}</td>
                  <td>{tr.route.loading_source?.name ?? "—"}</td>
                  <td className="max-w-52 truncate text-xs">{tr.route.checkpoints ?? "—"}</td>
                  <td>{tr.route.product ?? "—"}</td>
                  <td>{tr.route.is_active ? "✅" : <span className="text-rose-600">غير فعال</span>}</td>
                  {canEdit && (
                    <td><button className="btn-danger !px-2 !py-1 text-xs" onClick={() => unlink(tr.route.id)}>فك الربط</button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
