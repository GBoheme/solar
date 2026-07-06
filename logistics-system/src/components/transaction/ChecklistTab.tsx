"use client";

import { useState } from "react";
import { apiPost } from "@/lib/client";
import { Alert, EmptyState, Modal } from "@/components/ui";
import { ERROR_LABELS } from "@/lib/error-labels";
import { fmtDateTime } from "@/lib/constants";
import type { TabProps } from "./TransactionFile";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ChecklistTab({ tx, canEdit, role, reload, toast }: TabProps) {
  const [overriding, setOverriding] = useState<any>(null);
  const [reason, setReason] = useState("");

  const errors = tx.validation_errors.filter((e: any) => e.severity === "CRITICAL" && !e.is_resolved);
  const warnings = tx.validation_errors.filter((e: any) => e.severity === "WARNING" && !e.is_resolved);
  const overridden = tx.validation_errors.filter((e: any) => e.override_reason);

  const toggle = async (item: any) => {
    try {
      await apiPost(`/api/transactions/${tx.id}/checklist`, { item_id: item.id, is_done: !item.is_done });
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل", "error");
    }
  };

  const doOverride = async () => {
    if (!reason.trim()) return toast("سبب التجاوز إلزامي", "error");
    try {
      await apiPost(`/api/transactions/${tx.id}/override`, { error_id: overriding.id, reason });
      toast("تم تجاوز التحذير وتسجيل السبب");
      setOverriding(null);
      setReason("");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل التجاوز", "error");
    }
  };

  return (
    <div className="space-y-4">
      {/* نتائج محرك التدقيق */}
      <div className="card p-5">
        <h3 className="mb-3 text-sm font-bold">نتائج محرك التدقيق الذكي</h3>
        {errors.length === 0 && warnings.length === 0 ? (
          <Alert kind="success">لا توجد أخطاء أو تحذيرات مسجلة — اضغط «فحص المعاملة» أعلاه لإعادة الفحص الشامل.</Alert>
        ) : (
          <div className="space-y-2">
            {errors.map((e: any) => (
              <div key={e.id} className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm dark:border-rose-900 dark:bg-rose-950/40">
                <span className="badge shrink-0 bg-rose-600 text-white">حرج</span>
                <div>
                  <div className="font-semibold text-rose-800 dark:text-rose-200">{e.message}</div>
                  <div className="text-[11px] text-rose-500">{ERROR_LABELS[e.error_type] ?? e.error_type} — الحقل: {e.field_name}</div>
                </div>
              </div>
            ))}
            {warnings.map((e: any) => (
              <div key={e.id} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900 dark:bg-amber-950/40">
                <span className="badge shrink-0 bg-amber-500 text-white">تحذير</span>
                <div className="flex-1">
                  <div className="font-semibold text-amber-800 dark:text-amber-200">{e.message}</div>
                  <div className="text-[11px] text-amber-600">{ERROR_LABELS[e.error_type] ?? e.error_type}</div>
                </div>
                {role === "ADMIN" && (
                  <button className="btn-secondary shrink-0 !px-2 !py-1 text-xs" onClick={() => setOverriding(e)}>تجاوز بصلاحية مدير</button>
                )}
              </div>
            ))}
          </div>
        )}
        {overridden.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="text-xs font-bold text-slate-500">تحذيرات متجاوزة (بصلاحية مدير):</div>
            {overridden.map((e: any) => (
              <div key={e.id} className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-500 dark:bg-slate-800/60">
                <s>{e.message}</s> — سبب التجاوز: <b>{e.override_reason}</b>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* قائمة المهام الذكية */}
      <div className="card p-5">
        <h3 className="mb-1 text-sm font-bold">قائمة المهام الذكية</h3>
        <p className="mb-3 text-xs text-slate-400">تولد تلقائياً حسب نوع المعاملة، والبنود الشرطية تظهر وتختفي حسب البيانات المدخلة.</p>
        {tx.checklist.length === 0 ? <EmptyState text="لا توجد بنود — اضغط «فحص المعاملة» لمزامنة القائمة" /> : (
          <div className="space-y-1.5">
            {tx.checklist.map((c: any) => (
              <label
                key={c.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition-colors ${
                  c.is_done
                    ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30"
                    : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-emerald-600"
                  checked={c.is_done}
                  disabled={!canEdit}
                  onChange={() => toggle(c)}
                />
                <div className="flex-1">
                  <div className={`text-sm font-semibold ${c.is_done ? "text-emerald-800 line-through dark:text-emerald-300" : ""}`}>
                    {c.checklist_item.title}
                    {c.checklist_item.is_required && <span className="mr-1 text-rose-500">*</span>}
                  </div>
                  {c.checklist_item.description && <div className="text-[11px] text-slate-400">{c.checklist_item.description}</div>}
                  {c.is_done && c.checker && (
                    <div className="mt-0.5 text-[10px] text-slate-400">✓ {c.checker.name} — {fmtDateTime(c.checked_at)}</div>
                  )}
                </div>
                <span className={`badge shrink-0 ${
                  c.checklist_item.severity === "CRITICAL"
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    : c.checklist_item.severity === "WARNING"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}>
                  {c.checklist_item.severity === "CRITICAL" ? "إلزامي" : c.checklist_item.severity === "WARNING" ? "مهم" : "اختياري"}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <Modal title="تجاوز تحذير — بصلاحية مدير" open={!!overriding} onClose={() => setOverriding(null)}>
        {overriding && (
          <div className="space-y-3">
            <Alert kind="warn">{overriding.message}</Alert>
            <div>
              <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">سبب التجاوز (يسجل في سجل التعديلات) *</span>
              <textarea className="input min-h-20" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setOverriding(null)}>إلغاء</button>
              <button className="btn-danger" onClick={doOverride}>تأكيد التجاوز</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
