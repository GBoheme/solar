"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/client";
import { Field, Alert, useToast } from "@/components/ui";
import { PRIORITIES, ATTACHMENT_TYPES } from "@/lib/constants";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function NewTransactionPage() {
  const router = useRouter();
  const { toast, node } = useToast();
  const [types, setTypes] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ priority: "NORMAL" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<{ items: any[] }>("/api/catalog/transaction-types?active=1").then((d) => setTypes(d.items)).catch(() => {});
    apiGet<{ items: any[] }>("/api/catalog/departments?active=1").then((d) => setDepartments(d.items)).catch(() => {});
    apiGet<{ items: any[] }>("/api/catalog/companies?active=1").then((d) => setCompanies(d.items)).catch(() => {});
  }, []);

  const selectedType = useMemo(
    () => types.find((t) => String(t.id) === String(form.transaction_type_id)),
    [types, form.transaction_type_id]
  );

  const requirements = useMemo(() => {
    if (!selectedType) return [];
    const reqs: string[] = [];
    if (selectedType.requires_drivers) reqs.push("جدول سائقين وسيارات (يحسب العدد تلقائياً)");
    if (selectedType.requires_route) reqs.push("اختيار مسار من دليل المسارات");
    if (selectedType.requires_contract) reqs.push("ربط عقد");
    if (selectedType.requires_tax_letter) reqs.push("ربط كتاب ضريبة");
    if (selectedType.requires_cut_forms) reqs.push("ربط استمارات قطع");
    if (selectedType.requires_previous_book) reqs.push("رقم وتاريخ الكتاب السابق");
    const att: string[] = selectedType.required_attachment_types ? JSON.parse(selectedType.required_attachment_types) : [];
    for (const a of att) reqs.push(`مرفق إلزامي: ${(ATTACHMENT_TYPES as any)[a] ?? a}`);
    return reqs;
  }, [selectedType]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.transaction_type_id) return toast("اختر نوع المعاملة أولاً", "error");
    setSaving(true);
    try {
      const data = await apiPost<{ item: any }>("/api/transactions", form);
      toast("تم إنشاء المعاملة — أكمل البيانات من التبويبات");
      router.push(`/transactions/${data.item.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الإنشاء", "error");
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      {node}
      <h1 className="mb-4 text-lg font-bold">إنشاء معاملة جديدة</h1>

      <div className="card space-y-4 p-5">
        <Field label="نوع المعاملة" required hint="يحدد النوع المتطلبات وقائمة التدقيق والقالب تلقائياً">
          <select
            className="input"
            value={form.transaction_type_id ?? ""}
            onChange={(e) => {
              const t = types.find((x) => String(x.id) === e.target.value);
              setForm({ ...form, transaction_type_id: e.target.value, subject: t?.default_subject ?? "" });
            }}
          >
            <option value="">— اختر نوع المعاملة —</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>

        {selectedType && (
          <>
            <Alert kind="info">
              <b>متطلبات هذا النوع:</b>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
                {requirements.length === 0 && <li>لا متطلبات خاصة</li>}
                {requirements.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </Alert>

            <Field label="عنوان الكتاب" required hint="العنوان الافتراضي حسب النوع — تعديله يتطلب تأكيداً عند الفحص">
              <input className="input" value={form.subject ?? ""} onChange={(e) => set("subject", e.target.value)} />
            </Field>
            {form.subject?.trim() && selectedType.default_subject && form.subject.trim() !== selectedType.default_subject && (
              <label className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                <input type="checkbox" className="h-4 w-4 accent-teal-700" checked={!!form.subject_confirmed} onChange={(e) => set("subject_confirmed", e.target.checked)} />
                أؤكد أن العنوان المخصص مقصود ولا يطابق العنوان الافتراضي
              </label>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الجهة المخاطبة" required hint="تختار من دليل الجهات حصراً">
                <select className="input" value={form.target_department_id ?? ""} onChange={(e) => set("target_department_id", e.target.value || null)}>
                  <option value="">— اختر من الدليل —</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.official_name}</option>)}
                </select>
              </Field>
              <Field label="الجهة صاحبة العلاقة (نسخة إلى)">
                <select className="input" value={form.related_department_id ?? ""} onChange={(e) => set("related_department_id", e.target.value || null)}>
                  <option value="">— بدون —</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.official_name}</option>)}
                </select>
              </Field>
              <Field label="الشركة">
                <select className="input" value={form.company_id ?? ""} onChange={(e) => set("company_id", e.target.value || null)}>
                  <option value="">— اختر —</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.official_name}</option>)}
                </select>
              </Field>
              <Field label="المنتج">
                <input className="input" value={form.product ?? ""} onChange={(e) => set("product", e.target.value)} placeholder="زيت الوقود / الإسفلت المؤكسد / …" />
              </Field>
              {selectedType.requires_previous_book && (
                <>
                  <Field label="رقم الكتاب السابق" required>
                    <input className="input" value={form.previous_book_number ?? ""} onChange={(e) => set("previous_book_number", e.target.value)} />
                  </Field>
                  <Field label="تاريخ الكتاب السابق" required>
                    <input className="input" type="date" value={form.previous_book_date ?? ""} onChange={(e) => set("previous_book_date", e.target.value)} />
                  </Field>
                </>
              )}
              {selectedType.requires_drivers && (
                <Field label="عدد السيارات المذكور في المعاملة (اختياري)" hint="يطابقه النظام مع جدول السائقين — العدد النهائي يحسب من الجدول تلقائياً">
                  <input className="input" type="number" value={form.mentioned_vehicle_count ?? ""} onChange={(e) => set("mentioned_vehicle_count", e.target.value)} />
                </Field>
              )}
              <Field label="درجة الأهمية">
                <select className="input" value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                  {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="آخر موعد">
                <input className="input" type="date" value={form.deadline ?? ""} onChange={(e) => set("deadline", e.target.value)} />
              </Field>
            </div>

            <Field label="ملاحظات / وصف المعاملة">
              <textarea className="input min-h-20" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
            </Field>

            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => router.back()}>إلغاء</button>
              <button className="btn-primary" onClick={save} disabled={saving}>
                {saving ? "جارٍ الإنشاء…" : "إنشاء المعاملة وفتح ملفها"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
