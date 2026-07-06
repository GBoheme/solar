"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/client";
import { Field, Modal, Spinner, EmptyState, useToast } from "@/components/ui";

/* eslint-disable @typescript-eslint/no-explicit-any */

const PLACEHOLDERS = [
  "{{BookNumber}}", "{{BookDate}}", "{{TargetDepartment}}", "{{BookSubject}}", "{{CompanyName}}",
  "{{Product}}", "{{PreviousBookNumber}}", "{{PreviousBookDate}}", "{{ContractNumber}}", "{{ContractDate}}",
  "{{TaxLetterNumber}}", "{{TaxLetterDate}}", "{{RouteName}}", "{{RoutesList}}", "{{CutFormsList}}",
  "{{DriversStartSeq}}", "{{DriversEndSeq}}", "{{DriversCount}}", "{{AttachmentsList}}", "{{FinalRequest}}",
];

export default function TemplatesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [typeId, setTypeId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { toast, node } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, ty] = await Promise.all([
        apiGet<{ items: any[] }>("/api/templates"),
        apiGet<{ items: any[] }>("/api/catalog/transaction-types"),
      ]);
      setItems(t.items);
      setTypes(ty.items);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const upload = async () => {
    if (!name.trim() || !file) return toast("أدخل اسم القالب وملف DOCX", "error");
    const fd = new FormData();
    fd.append("name", name);
    fd.append("file", file);
    if (typeId) fd.append("transaction_type_id", typeId);
    try {
      await apiPost("/api/templates", fd);
      toast("تم رفع القالب");
      setOpen(false); setName(""); setFile(null); setTypeId("");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الرفع", "error");
    }
  };

  const toggle = async (item: any) => {
    await apiPatch(`/api/templates/${item.id}`, { is_active: !item.is_active });
    load();
  };
  const remove = async (item: any) => {
    if (!confirm("حذف القالب؟")) return;
    try {
      await apiDelete(`/api/templates/${item.id}`);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الحذف", "error");
    }
  };

  return (
    <div>
      {node}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-lg font-bold">قوالب Word</h1>
          <p className="text-xs text-slate-500">قوالب DOCX رسمية لكل نوع معاملة — تولد الكتب منها تلقائياً</p>
        </div>
        <div className="flex-1" />
        <button className="btn-primary" onClick={() => setOpen(true)}>＋ رفع قالب</button>
      </div>

      <div className="card mb-4 p-4">
        <div className="mb-2 text-sm font-bold">الحقول المدعومة داخل القالب (placeholders):</div>
        <div className="flex flex-wrap gap-1.5" dir="ltr">
          {PLACEHOLDERS.map((p) => (
            <code key={p} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] dark:bg-slate-800">{p}</code>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          للجداول المتكررة استخدم حلقات داخل صف الجدول: <code dir="ltr">{"{{#Drivers}} … {{/Drivers}}"}</code> و <code dir="ltr">{"{{#CutForms}} … {{/CutForms}}"}</code> و <code dir="ltr">{"{{#Attachments}} … {{/Attachments}}"}</code>
        </p>
      </div>

      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : items.length === 0 ? <EmptyState text="لا توجد قوالب" /> : (
          <table className="data">
            <thead>
              <tr>
                <th>اسم القالب</th><th>نوع المعاملة</th><th>النسخة</th><th>فعال</th><th>الملف</th><th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id}>
                  <td className="font-semibold">{t.name}</td>
                  <td>{t.transaction_type?.name ?? "عام"}</td>
                  <td>v{t.version}</td>
                  <td>{t.is_active ? "✅" : "❌"}</td>
                  <td><a className="text-teal-700 underline dark:text-teal-400" href={`/api/files/${t.file_url}?download=1`}>تنزيل DOCX</a></td>
                  <td>
                    <div className="flex gap-1.5">
                      <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => toggle(t)}>{t.is_active ? "تعطيل" : "تفعيل"}</button>
                      <button className="btn-danger !px-2 !py-1 text-xs" onClick={() => remove(t)}>حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal title="رفع قالب Word جديد" open={open} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <Field label="اسم القالب" required><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="نوع المعاملة المرتبط">
            <select className="input" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
              <option value="">— قالب عام —</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="ملف DOCX" required hint="يجب أن يحتوي القالب على placeholders بصيغة {{Field}}">
            <input type="file" accept=".docx" className="input" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setOpen(false)}>إلغاء</button>
          <button className="btn-primary" onClick={upload}>رفع</button>
        </div>
      </Modal>
    </div>
  );
}
