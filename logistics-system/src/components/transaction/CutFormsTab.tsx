"use client";

import { useState } from "react";
import { apiPost, apiPatch, apiDelete } from "@/lib/client";
import { Field, Modal, EmptyState } from "@/components/ui";
import { CUT_FORM_STATUSES, fmtDate, fmtNum } from "@/lib/constants";
import type { TabProps } from "./TransactionFile";

/* eslint-disable @typescript-eslint/no-explicit-any */

const emptyForm = {
  form_number: "", form_date: "", loading_source_id: "", loading_site: "",
  product: "", cut_quantity: "", loaded_quantity: "0", route_id: "", status: "OPEN", notes: "", file_url: "",
};

export default function CutFormsTab({ tx, canEdit, reload, toast, catalogs }: TabProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const sources = catalogs["loading-sources"] ?? [];
  const routes = catalogs["routes"] ?? [];

  const cut = Number(form.cut_quantity) || 0;
  const loaded = Number(form.loaded_quantity) || 0;
  const remaining = form.cut_quantity !== "" ? cut - loaded : null;

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, product: tx.product ?? "" }); setOpen(true); };
  const openEdit = (cf: any) => {
    setEditing(cf);
    setForm({
      form_number: cf.form_number, form_date: cf.form_date?.slice(0, 10) ?? "",
      loading_source_id: cf.loading_source_id ?? "", loading_site: cf.loading_site ?? "",
      product: cf.product ?? "", cut_quantity: cf.cut_quantity ?? "", loaded_quantity: cf.loaded_quantity ?? 0,
      route_id: cf.route_id ?? "", status: cf.status, notes: cf.notes ?? "", file_url: cf.file_url ?? "",
    });
    setOpen(true);
  };

  const uploadFile = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("subdir", `uploads/${tx.internal_number}`);
    try {
      const d = await apiPost<{ file_url: string }>("/api/upload", fd);
      set("file_url", d.file_url);
      toast("تم رفع نسخة الاستمارة");
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الرفع", "error");
    }
  };

  const save = async (confirmReuse = false) => {
    if (loaded > cut && form.cut_quantity !== "") {
      return toast("الكمية المجهزة أكبر من الكمية المقطوعة — غير مسموح", "error");
    }
    setSaving(true);
    try {
      if (editing) {
        await apiPatch(`/api/cut-forms/${editing.id}`, form);
      } else {
        await apiPost(`/api/transactions/${tx.id}/cut-forms`, { ...form, confirm_reuse: confirmReuse });
      }
      toast("تم الحفظ");
      setOpen(false);
      await reload();
    } catch (e: any) {
      if (e?.status === 409 && !confirmReuse && !editing && e.message?.includes("مستخدمة سابقاً")) {
        if (confirm(`${e.message}\n\nهل تريد المتابعة رغم ذلك؟`)) {
          setSaving(false);
          return save(true);
        }
      } else {
        toast(e instanceof Error ? e.message : "فشل الحفظ", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (cf: any) => {
    if (!confirm(`حذف استمارة القطع (${cf.form_number})؟`)) return;
    try {
      await apiDelete(`/api/cut-forms/${cf.id}`);
      toast("تم الحذف");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الحذف", "error");
    }
  };

  const totals = tx.cut_forms.reduce(
    (a: any, cf: any) => ({
      cut: a.cut + (cf.cut_quantity ?? 0),
      loaded: a.loaded + (cf.loaded_quantity ?? 0),
      remaining: a.remaining + (cf.remaining_quantity ?? 0),
    }),
    { cut: 0, loaded: 0, remaining: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="text-sm text-slate-500">
          الكمية المتبقية تحسب تلقائياً (المقطوعة − المجهزة) ولا يمكن أن تكون سالبة.
        </div>
        <div className="flex-1" />
        {canEdit && <button className="btn-primary" onClick={openNew}>＋ ربط استمارة قطع</button>}
      </div>

      <div className="card overflow-x-auto">
        {tx.cut_forms.length === 0 ? <EmptyState text="لا توجد استمارات قطع مربوطة" /> : (
          <table className="data">
            <thead>
              <tr>
                <th>رقم الاستمارة</th><th>التاريخ</th><th>مصدر التجهيز</th><th>المنتج</th>
                <th>المقطوعة</th><th>المجهزة</th><th>المتبقية</th><th>الحالة</th><th>الملف</th>
                {canEdit && <th>إجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {tx.cut_forms.map((cf: any) => (
                <tr key={cf.id}>
                  <td className="font-bold">{cf.form_number}</td>
                  <td>{cf.form_date ? fmtDate(cf.form_date) : <span className="text-rose-500">مفقود</span>}</td>
                  <td>{cf.loading_source?.name ?? <span className="text-rose-500">بلا مصدر</span>}</td>
                  <td>{cf.product ?? "—"}</td>
                  <td className="tabular-nums">{fmtNum(cf.cut_quantity)}</td>
                  <td className="tabular-nums">{fmtNum(cf.loaded_quantity)}</td>
                  <td className={`tabular-nums font-bold ${(cf.remaining_quantity ?? 0) < 0 ? "text-rose-600" : ""}`}>{fmtNum(cf.remaining_quantity)}</td>
                  <td><span className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{(CUT_FORM_STATUSES as any)[cf.status] ?? cf.status}</span></td>
                  <td>{cf.file_url ? <a className="text-teal-700 underline dark:text-teal-400" href={`/api/files/${cf.file_url}`} target="_blank">عرض</a> : <span className="text-amber-600">غير مرفقة</span>}</td>
                  {canEdit && (
                    <td>
                      <div className="flex gap-1.5">
                        <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => openEdit(cf)}>تعديل</button>
                        <button className="btn-danger !px-2 !py-1 text-xs" onClick={() => remove(cf)}>حذف</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold dark:bg-slate-800/60">
                <td colSpan={4}>المجموع</td>
                <td className="tabular-nums">{fmtNum(totals.cut)}</td>
                <td className="tabular-nums">{fmtNum(totals.loaded)}</td>
                <td className="tabular-nums">{fmtNum(totals.remaining)}</td>
                <td colSpan={canEdit ? 3 : 2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <Modal title={editing ? `تعديل الاستمارة ${editing.form_number}` : "ربط استمارة قطع جديدة"} open={open} onClose={() => setOpen(false)} wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="رقم استمارة القطع" required>
            <input className="input" value={form.form_number} onChange={(e) => set("form_number", e.target.value)} />
          </Field>
          <Field label="تاريخ الاستمارة" required>
            <input className="input" type="date" value={form.form_date} onChange={(e) => set("form_date", e.target.value)} />
          </Field>
          <Field label="مصدر التجهيز" required>
            <select className="input" value={form.loading_source_id} onChange={(e) => set("loading_source_id", e.target.value)}>
              <option value="">— اختر —</option>
              {sources.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="موقع التحميل">
            <input className="input" value={form.loading_site} onChange={(e) => set("loading_site", e.target.value)} />
          </Field>
          <Field label="المنتج">
            <input className="input" value={form.product} onChange={(e) => set("product", e.target.value)} />
          </Field>
          <Field label="المسار المرتبط">
            <select className="input" value={form.route_id} onChange={(e) => set("route_id", e.target.value)}>
              <option value="">— بدون —</option>
              {routes.map((r: any) => <option key={r.id} value={r.id}>{r.official_description}</option>)}
            </select>
          </Field>
          <Field label="الكمية المقطوعة" required>
            <input className="input" type="number" value={form.cut_quantity} onChange={(e) => set("cut_quantity", e.target.value)} />
          </Field>
          <Field label="الكمية المجهزة">
            <input className="input" type="number" value={form.loaded_quantity} onChange={(e) => set("loaded_quantity", e.target.value)} />
          </Field>
          <Field label="الكمية المتبقية (تلقائية)">
            <input
              className={`input ${remaining !== null && remaining < 0 ? "!border-rose-500 text-rose-600" : ""}`}
              value={remaining === null ? "" : remaining}
              disabled
            />
          </Field>
          <Field label="حالة الاستمارة">
            <select className="input" value={form.status} onChange={(e) => set("status", e.target.value)}>
              {Object.entries(CUT_FORM_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="نسخة الاستمارة (ملف)" hint="الاستمارة المذكورة يجب أن تكون مرفقة أو موثقة">
            <div className="flex items-center gap-2">
              <input type="file" className="input" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
              {form.file_url && <a className="shrink-0 text-xs text-teal-700 underline dark:text-teal-400" href={`/api/files/${form.file_url}`} target="_blank">عرض</a>}
            </div>
          </Field>
          <Field label="ملاحظات">
            <input className="input" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
        {remaining !== null && loaded > cut && (
          <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            ⛔ الكمية المجهزة أكبر من المقطوعة — لن يقبل النظام هذا الإدخال.
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setOpen(false)}>إلغاء</button>
          <button className="btn-primary" onClick={() => save()} disabled={saving || (form.cut_quantity !== "" && loaded > cut)}>
            {saving ? "جارٍ الحفظ…" : "حفظ"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
