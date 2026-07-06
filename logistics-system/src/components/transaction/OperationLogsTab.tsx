"use client";

import { useState } from "react";
import { apiPost, apiPatch, apiDelete } from "@/lib/client";
import { Field, Modal, EmptyState } from "@/components/ui";
import { fmtDate, fmtNum } from "@/lib/constants";
import type { TabProps } from "./TransactionFile";

/* eslint-disable @typescript-eslint/no-explicit-any */

const empty = { log_number: "", log_date: "", station: "", quantity: "", loading_source_id: "", responsible_name: "", has_signatures: false, linked_cut_form_id: "", notes: "", file_url: "" };

export default function OperationLogsTab({ tx, canEdit, reload, toast, catalogs }: TabProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const sources = catalogs["loading-sources"] ?? [];

  const uploadFile = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("subdir", `uploads/${tx.internal_number}`);
    try {
      const d = await apiPost<{ file_url: string }>("/api/upload", fd);
      set("file_url", d.file_url);
      toast("تم رفع نسخة السجل");
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الرفع", "error");
    }
  };

  const save = async () => {
    try {
      if (editing) await apiPatch(`/api/operation-logs/${editing.id}`, form);
      else await apiPost(`/api/transactions/${tx.id}/operation-logs`, form);
      toast("تم الحفظ");
      setOpen(false);
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الحفظ", "error");
    }
  };

  const remove = async (log: any) => {
    if (!confirm(`حذف سجل الاشتغال (${log.log_number})؟`)) return;
    await apiDelete(`/api/operation-logs/${log.id}`);
    await reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="text-sm text-slate-500">سجل الاشتغال والكشف — يمكن ربطه باستمارة قطع محددة.</div>
        <div className="flex-1" />
        {canEdit && (
          <button className="btn-primary" onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}>＋ إضافة سجل</button>
        )}
      </div>

      <div className="card overflow-x-auto">
        {tx.operation_logs.length === 0 ? <EmptyState text="لا توجد سجلات اشتغال" /> : (
          <table className="data">
            <thead>
              <tr>
                <th>رقم السجل</th><th>التاريخ</th><th>الجهة/المحطة</th><th>الكمية</th><th>مصدر التجهيز</th>
                <th>المسؤول</th><th>تواقيع/ختم</th><th>استمارة مرتبطة</th><th>الملف</th>{canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {tx.operation_logs.map((log: any) => (
                <tr key={log.id}>
                  <td className="font-bold">{log.log_number}</td>
                  <td>{fmtDate(log.log_date)}</td>
                  <td>{log.station ?? "—"}</td>
                  <td className="tabular-nums">{fmtNum(log.quantity)}</td>
                  <td>{log.loading_source?.name ?? "—"}</td>
                  <td>{log.responsible_name ?? "—"}</td>
                  <td>{log.has_signatures ? "✅" : "—"}</td>
                  <td>{log.linked_cut_form?.form_number ?? "—"}</td>
                  <td>{log.file_url ? <a className="text-teal-700 underline dark:text-teal-400" href={`/api/files/${log.file_url}`} target="_blank">عرض</a> : "—"}</td>
                  {canEdit && (
                    <td>
                      <div className="flex gap-1.5">
                        <button
                          className="btn-secondary !px-2 !py-1 text-xs"
                          onClick={() => {
                            setEditing(log);
                            setForm({
                              log_number: log.log_number, log_date: log.log_date?.slice(0, 10) ?? "",
                              station: log.station ?? "", quantity: log.quantity ?? "",
                              loading_source_id: log.loading_source_id ?? "", responsible_name: log.responsible_name ?? "",
                              has_signatures: log.has_signatures, linked_cut_form_id: log.linked_cut_form_id ?? "",
                              notes: log.notes ?? "", file_url: log.file_url ?? "",
                            });
                            setOpen(true);
                          }}
                        >تعديل</button>
                        <button className="btn-danger !px-2 !py-1 text-xs" onClick={() => remove(log)}>حذف</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal title={editing ? "تعديل سجل اشتغال" : "إضافة سجل اشتغال"} open={open} onClose={() => setOpen(false)} wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="رقم السجل أو الاستمارة" required>
            <input className="input" value={form.log_number} onChange={(e) => set("log_number", e.target.value)} />
          </Field>
          <Field label="التاريخ">
            <input className="input" type="date" value={form.log_date} onChange={(e) => set("log_date", e.target.value)} />
          </Field>
          <Field label="الجهة أو المحطة">
            <input className="input" value={form.station} onChange={(e) => set("station", e.target.value)} />
          </Field>
          <Field label="الكمية">
            <input className="input" type="number" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
          </Field>
          <Field label="مصدر التجهيز">
            <select className="input" value={form.loading_source_id} onChange={(e) => set("loading_source_id", e.target.value)}>
              <option value="">— اختر —</option>
              {sources.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="اسم المسؤول أو المخول">
            <input className="input" value={form.responsible_name} onChange={(e) => set("responsible_name", e.target.value)} />
          </Field>
          <Field label="ربط باستمارة قطع">
            <select className="input" value={form.linked_cut_form_id} onChange={(e) => set("linked_cut_form_id", e.target.value)}>
              <option value="">— بدون —</option>
              {tx.cut_forms.map((cf: any) => <option key={cf.id} value={cf.id}>{cf.form_number}</option>)}
            </select>
          </Field>
          <Field label="نسخة السجل (صورة أو PDF)">
            <div className="flex items-center gap-2">
              <input type="file" className="input" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
              {form.file_url && <a className="shrink-0 text-xs text-teal-700 underline dark:text-teal-400" href={`/api/files/${form.file_url}`} target="_blank">عرض</a>}
            </div>
          </Field>
          <Field label="الملاحظات المكتوبة">
            <input className="input" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-teal-700" checked={!!form.has_signatures} onChange={(e) => set("has_signatures", e.target.checked)} />
            يحتوي تواقيع / ختم
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setOpen(false)}>إلغاء</button>
          <button className="btn-primary" onClick={save}>حفظ</button>
        </div>
      </Modal>
    </div>
  );
}
