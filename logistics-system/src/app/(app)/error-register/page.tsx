"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/client";
import { Field, Modal, Spinner, EmptyState, useToast } from "@/components/ui";
import { fmtDate } from "@/lib/constants";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ErrorRegisterPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const { toast, node } = useToast();
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiGet<{ items: any[] }>("/api/error-register");
      setItems(d.items);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      await apiPost("/api/error-register", form);
      toast("تم توثيق الخطأ");
      setOpen(false);
      setForm({});
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الحفظ", "error");
    }
  };

  return (
    <div>
      {node}
      <div className="mb-4 flex items-center gap-3">
        <div>
          <h1 className="text-lg font-bold">سجل الأخطاء</h1>
          <p className="text-xs text-slate-500">توثيق الأخطاء وأسبابها وطرق الوقاية — للتعلم ومنع التكرار</p>
        </div>
        <div className="flex-1" />
        <button className="btn-primary" onClick={() => setOpen(true)}>＋ توثيق خطأ</button>
      </div>

      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : items.length === 0 ? <EmptyState text="لا توجد أخطاء موثقة" /> : (
          <table className="data">
            <thead>
              <tr><th>التاريخ</th><th>المعاملة</th><th>نوع الخطأ</th><th>الوصف</th><th>السبب</th><th>الأثر</th><th>طريقة الوقاية</th><th>وثقه</th></tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap text-xs">{fmtDate(e.error_date)}</td>
                  <td>
                    {e.transaction ? (
                      <Link className="font-bold text-teal-700 hover:underline dark:text-teal-400" href={`/transactions/${e.transaction.id}`}>
                        {e.transaction.internal_number}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="font-semibold">{e.error_type}</td>
                  <td className="max-w-56">{e.error_description}</td>
                  <td className="max-w-40 text-xs">{e.cause ?? "—"}</td>
                  <td className="max-w-40 text-xs">{e.impact ?? "—"}</td>
                  <td className="max-w-48 text-xs">{e.prevention_method ?? "—"}</td>
                  <td className="text-xs">{e.creator.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal title="توثيق خطأ جديد" open={open} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <Field label="نوع الخطأ" required>
            <input className="input" value={form.error_type ?? ""} onChange={(e) => set("error_type", e.target.value)} placeholder="خطأ عدد سيارات / خطأ مسار / بيانات منسوخة…" />
          </Field>
          <Field label="وصف الخطأ" required>
            <textarea className="input min-h-16" value={form.error_description ?? ""} onChange={(e) => set("error_description", e.target.value)} />
          </Field>
          <Field label="السبب">
            <input className="input" value={form.cause ?? ""} onChange={(e) => set("cause", e.target.value)} />
          </Field>
          <Field label="الأثر">
            <input className="input" value={form.impact ?? ""} onChange={(e) => set("impact", e.target.value)} />
          </Field>
          <Field label="طريقة الوقاية مستقبلاً">
            <input className="input" value={form.prevention_method ?? ""} onChange={(e) => set("prevention_method", e.target.value)} />
          </Field>
          <Field label="رقم المعاملة المرتبطة (ID اختياري)">
            <input className="input" type="number" value={form.transaction_id ?? ""} onChange={(e) => set("transaction_id", e.target.value)} />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setOpen(false)}>إلغاء</button>
          <button className="btn-primary" onClick={save}>توثيق</button>
        </div>
      </Modal>
    </div>
  );
}
