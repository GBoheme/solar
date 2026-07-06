"use client";

import { useState } from "react";
import { apiPatch } from "@/lib/client";
import { Field } from "@/components/ui";
import { PRIORITIES } from "@/lib/constants";
import type { TabProps } from "./TransactionFile";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function BasicTab({ tx, canEdit, reload, toast, catalogs }: TabProps) {
  const [form, setForm] = useState<any>({
    subject: tx.subject ?? "",
    subject_confirmed: tx.subject_confirmed,
    target_department_id: tx.target_department_id ?? "",
    related_department_id: tx.related_department_id ?? "",
    company_id: tx.company_id ?? "",
    product: tx.product ?? "",
    previous_book_number: tx.previous_book_number ?? "",
    previous_book_date: tx.previous_book_date?.slice(0, 10) ?? "",
    mentioned_vehicle_count: tx.mentioned_vehicle_count ?? "",
    requested_quantity: tx.requested_quantity ?? "",
    final_request: tx.final_request ?? "",
    priority: tx.priority,
    deadline: tx.deadline?.slice(0, 10) ?? "",
    notes: tx.notes ?? "",
    book_number: tx.book_number ?? "",
    book_date: tx.book_date?.slice(0, 10) ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await apiPatch(`/api/transactions/${tx.id}`, form);
      toast("تم حفظ البيانات الأساسية");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الحفظ", "error");
    } finally {
      setSaving(false);
    }
  };

  const departments = catalogs["departments"] ?? [];
  const companies = catalogs["companies"] ?? [];
  const subjectIsCustom =
    form.subject?.trim() &&
    tx.transaction_type.default_subject &&
    form.subject.trim() !== tx.transaction_type.default_subject.trim();

  return (
    <div className="card space-y-4 p-5">
      <fieldset disabled={!canEdit} className="space-y-4">
        <Field label="عنوان الكتاب (م /)" required hint={`الافتراضي لنوع «${tx.transaction_type.name}»: ${tx.transaction_type.default_subject}`}>
          <input className="input" value={form.subject} onChange={(e) => set("subject", e.target.value)} />
        </Field>
        {subjectIsCustom && (
          <label className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <input type="checkbox" className="h-4 w-4 accent-teal-700" checked={!!form.subject_confirmed} onChange={(e) => set("subject_confirmed", e.target.checked)} />
            أؤكد أن العنوان المخصص مقصود (بدون التأكيد سيظهر تحذير عند الفحص)
          </label>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الجهة المخاطبة" required hint="حقل خطر — يختار من دليل الجهات حصراً">
            <select className="input" value={form.target_department_id} onChange={(e) => set("target_department_id", e.target.value)}>
              <option value="">— اختر من الدليل —</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>{d.official_name}{!d.is_active ? " (غير فعالة)" : ""}</option>
              ))}
            </select>
          </Field>
          <Field label="الجهة صاحبة العلاقة (نسخة إلى)">
            <select className="input" value={form.related_department_id} onChange={(e) => set("related_department_id", e.target.value)}>
              <option value="">— بدون —</option>
              {departments.map((d: any) => <option key={d.id} value={d.id}>{d.official_name}</option>)}
            </select>
          </Field>
          <Field label="الشركة">
            <select className="input" value={form.company_id} onChange={(e) => set("company_id", e.target.value)}>
              <option value="">— اختر —</option>
              {companies.map((c: any) => <option key={c.id} value={c.id}>{c.official_name}</option>)}
            </select>
          </Field>
          <Field label="المنتج">
            <input className="input" value={form.product} onChange={(e) => set("product", e.target.value)} />
          </Field>
          <Field label="رقم الكتاب السابق">
            <input className="input" value={form.previous_book_number} onChange={(e) => set("previous_book_number", e.target.value)} />
          </Field>
          <Field label="تاريخ الكتاب السابق">
            <input className="input" type="date" value={form.previous_book_date} onChange={(e) => set("previous_book_date", e.target.value)} />
          </Field>
          <Field label="العدد المذكور للسيارات (اختياري)" hint="حقل خطر — العدد الفعلي يحسب تلقائياً من جدول السائقين ويطابق مع هذا الحقل">
            <input className="input" type="number" value={form.mentioned_vehicle_count} onChange={(e) => set("mentioned_vehicle_count", e.target.value)} />
          </Field>
          <Field label="الكمية المطلوبة" hint="تقارن بالكمية المسموح بها في كتاب الضريبة">
            <input className="input" type="number" value={form.requested_quantity} onChange={(e) => set("requested_quantity", e.target.value)} />
          </Field>
          <Field label="درجة الأهمية">
            <select className="input" value={form.priority} onChange={(e) => set("priority", e.target.value)}>
              {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="آخر موعد">
            <input className="input" type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
          </Field>
          <Field label="رقم الكتاب الصادر (العدد)" hint="يملأ عند الإصدار الرسمي">
            <input className="input" value={form.book_number} onChange={(e) => set("book_number", e.target.value)} />
          </Field>
          <Field label="تاريخ الكتاب الصادر">
            <input className="input" type="date" value={form.book_date} onChange={(e) => set("book_date", e.target.value)} />
          </Field>
        </div>

        <Field label="الطلب الختامي في الكتاب">
          <textarea className="input min-h-16" value={form.final_request} onChange={(e) => set("final_request", e.target.value)} placeholder="للتفضل بالاطلاع واتخاذ ما يلزم مع التقدير." />
        </Field>
        <Field label="ملاحظات">
          <textarea className="input min-h-16" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </fieldset>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="text-xs text-slate-400">
          المنشئ: {tx.creator?.name} — المدقق: {tx.reviewer?.name ?? "—"}
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "جارٍ الحفظ…" : "حفظ البيانات"}
          </button>
        )}
      </div>
    </div>
  );
}
