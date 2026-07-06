"use client";

import { useState } from "react";
import { apiPost, apiPatch, apiDelete } from "@/lib/client";
import { Field, Modal, Alert, EmptyState } from "@/components/ui";
import { ATTACHMENT_TYPES, fmtDate } from "@/lib/constants";
import type { TabProps } from "./TransactionFile";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function AttachmentsTab({ tx, canEdit, role, reload, toast }: TabProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ attachment_type: "OTHER", is_required: false });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const canReview = ["ADMIN", "REVIEWER"].includes(role);
  const requiredTypes: string[] = tx.transaction_type.required_attachment_types
    ? JSON.parse(tx.transaction_type.required_attachment_types)
    : [];
  const missingRequired = requiredTypes.filter(
    (rt) => !tx.attachments.some((a: any) => a.attachment_type === rt && a.file_url)
  );

  const save = async () => {
    if (!form.title?.trim()) return toast("عنوان المرفق إلزامي", "error");
    setSaving(true);
    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(form)) fd.append(k, String(v ?? ""));
      fd.set("is_required", form.is_required ? "1" : "0");
      if (file) fd.append("file", file);
      await apiPost(`/api/transactions/${tx.id}/attachments`, fd);
      toast("تمت إضافة المرفق");
      setOpen(false);
      setForm({ attachment_type: "OTHER", is_required: false });
      setFile(null);
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الحفظ", "error");
    } finally {
      setSaving(false);
    }
  };

  const uploadForExisting = async (att: any, f: File) => {
    const fd = new FormData();
    fd.append("file", f);
    try {
      await apiPatch(`/api/attachments/${att.id}`, fd);
      toast("تم رفع الملف");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الرفع", "error");
    }
  };

  const verify = async (att: any) => {
    try {
      await apiPatch(`/api/attachments/${att.id}`, { is_verified: !att.is_verified });
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل", "error");
    }
  };

  const remove = async (att: any) => {
    if (!confirm(`حذف المرفق (${att.title})؟${att.is_required ? " هذا مرفق إلزامي!" : ""}`)) return;
    try {
      await apiDelete(`/api/attachments/${att.id}`);
      toast("تم الحذف");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الحذف", "error");
    }
  };

  return (
    <div className="space-y-4">
      {missingRequired.length > 0 && (
        <Alert kind="error">
          ⛔ مرفقات إلزامية ناقصة لهذا النوع من المعاملات: {missingRequired.map((t) => (ATTACHMENT_TYPES as any)[t] ?? t).join("، ")} — لا يمكن إصدار PDF قبل استكمالها.
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <div className="text-sm text-slate-500">
          كل مرفق مذكور في الكتاب يجب أن يكون موجوداً هنا. حذف مرفقات المعاملات النهائية بصلاحية مدير فقط.
        </div>
        <div className="flex-1" />
        {canEdit && <button className="btn-primary" onClick={() => setOpen(true)}>＋ إضافة مرفق</button>}
      </div>

      <div className="card overflow-x-auto">
        {tx.attachments.length === 0 ? <EmptyState text="لا توجد مرفقات" /> : (
          <table className="data">
            <thead>
              <tr>
                <th>النوع</th><th>العنوان</th><th>رقم المستند</th><th>تاريخه</th><th>إلزامي</th><th>مدقق</th><th>الملف</th><th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {tx.attachments.map((a: any) => (
                <tr key={a.id}>
                  <td><span className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{(ATTACHMENT_TYPES as any)[a.attachment_type] ?? a.attachment_type}</span></td>
                  <td className="font-semibold">{a.title}</td>
                  <td>{a.document_number ?? "—"}</td>
                  <td>{fmtDate(a.document_date)}</td>
                  <td>{a.is_required ? <span className="font-bold text-rose-600">نعم</span> : "لا"}</td>
                  <td>{a.is_verified ? "✅" : <span className="text-amber-600">قيد التدقيق</span>}</td>
                  <td>
                    {a.file_url ? (
                      <a className="text-teal-700 underline dark:text-teal-400" href={`/api/files/${a.file_url}`} target="_blank">عرض</a>
                    ) : (
                      <span className="text-rose-500">غير مرفوع</span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {canEdit && !a.file_url && (
                        <label className="btn-secondary !px-2 !py-1 cursor-pointer text-xs">
                          رفع ملف
                          <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadForExisting(a, e.target.files[0])} />
                        </label>
                      )}
                      {canReview && a.file_url && (
                        <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => verify(a)}>
                          {a.is_verified ? "إلغاء التدقيق" : "✓ تدقيق"}
                        </button>
                      )}
                      {(canEdit || role === "ADMIN") && (
                        <button className="btn-danger !px-2 !py-1 text-xs" onClick={() => remove(a)}>حذف</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal title="إضافة مرفق" open={open} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <Field label="نوع المرفق" required>
            <select className="input" value={form.attachment_type} onChange={(e) => set("attachment_type", e.target.value)}>
              {Object.entries(ATTACHMENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="اسم / وصف المرفق" required>
            <input className="input" value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="رقم المرفق (إن وجد)">
              <input className="input" value={form.document_number ?? ""} onChange={(e) => set("document_number", e.target.value)} />
            </Field>
            <Field label="تاريخ المرفق (إن وجد)">
              <input className="input" type="date" value={form.document_date ?? ""} onChange={(e) => set("document_date", e.target.value)} />
            </Field>
          </div>
          <Field label="الملف" hint="PDF / Word / Excel / صورة — حتى 25MB">
            <input type="file" className="input" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          <Field label="ملاحظات">
            <input className="input" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-teal-700" checked={!!form.is_required} onChange={(e) => set("is_required", e.target.checked)} />
            مرفق إلزامي (يمنع الإصدار بدونه)
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setOpen(false)}>إلغاء</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? "جارٍ الحفظ…" : "إضافة"}</button>
        </div>
      </Modal>
    </div>
  );
}
