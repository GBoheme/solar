"use client";

import { useMemo, useRef, useState } from "react";
import { apiPost, apiPatch, apiDelete } from "@/lib/client";
import { Field, Modal, Alert, EmptyState } from "@/components/ui";
import type { TabProps } from "./TransactionFile";

/* eslint-disable @typescript-eslint/no-explicit-any */

const emptyDriver = { sequence_no: "", driver_name: "", vehicle_number: "", governorate: "", vehicle_type: "", tanker_number: "", notes: "" };

export default function DriversTab({ tx, canEdit, reload, toast }: TabProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyDriver);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any>(null); // { file, replace, report, rejected }
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const drivers = tx.drivers as any[];

  // إحصاءات تحسب تلقائياً — عدد السيارات لا يكتب يدوياً أبداً
  const stats = useMemo(() => {
    if (drivers.length === 0) return null;
    const seqs = drivers.map((d) => d.sequence_no);
    const min = Math.min(...seqs), max = Math.max(...seqs);
    const seen = new Map<string, number>();
    for (const d of drivers) {
      const k = d.vehicle_number.replace(/\s+/g, "");
      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
    const duplicates = [...seen.entries()].filter(([, c]) => c > 1).map(([v]) => v);
    const seqSet = new Set(seqs);
    const missing: number[] = [];
    for (let i = min; i <= max; i++) if (!seqSet.has(i)) missing.push(i);
    return { count: drivers.length, min, max, duplicates, missing };
  }, [drivers]);

  const mismatch =
    tx.mentioned_vehicle_count !== null &&
    tx.mentioned_vehicle_count !== undefined &&
    stats &&
    tx.mentioned_vehicle_count !== stats.count;

  const openNew = () => { setEditing(null); setForm(emptyDriver); setOpen(true); };
  const openEdit = (d: any) => {
    setEditing(d);
    setForm({
      sequence_no: d.sequence_no, driver_name: d.driver_name, vehicle_number: d.vehicle_number,
      governorate: d.governorate ?? "", vehicle_type: d.vehicle_type ?? "", tanker_number: d.tanker_number ?? "", notes: d.notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      if (editing) await apiPatch(`/api/drivers/${editing.id}`, form);
      else await apiPost(`/api/transactions/${tx.id}/drivers`, form);
      toast("تم الحفظ");
      setOpen(false);
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الحفظ", "error");
    }
  };

  const remove = async (d: any) => {
    if (!confirm(`حذف الصف (${d.sequence_no} — ${d.driver_name})؟`)) return;
    await apiDelete(`/api/drivers/${d.id}`);
    await reload();
  };

  const clearAll = async () => {
    if (!confirm(`تفريغ جدول السائقين بالكامل (${drivers.length} صف)؟`)) return;
    await apiDelete(`/api/transactions/${tx.id}/drivers`);
    await reload();
  };

  // الخطوة 1: معاينة الملف (تحليل بلا حفظ)
  const previewFile = async (file: File) => {
    setImporting(true);
    try {
      const replace = drivers.length === 0 ? false : confirm("استبدال الجدول الحالي بالملف المستورد؟ (إلغاء = إلحاق بالجدول الحالي)");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("replace", replace ? "1" : "0");
      fd.append("preview", "1");
      const d = await apiPost<{ report: any; rejected: any[] }>(`/api/transactions/${tx.id}/drivers/import`, fd);
      setImportPreview({ file, replace, report: d.report, rejected: d.rejected });
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل تحليل الملف", "error");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // الخطوة 2: التأكيد والحفظ الفعلي
  const confirmImport = async () => {
    if (!importPreview) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", importPreview.file);
      fd.append("replace", importPreview.replace ? "1" : "0");
      const d = await apiPost<{ imported: number; rejected: any[] }>(`/api/transactions/${tx.id}/drivers/import`, fd);
      toast(`تم استيراد ${d.imported} صفاً${d.rejected.length ? ` — رُفض ${d.rejected.length}` : ""}`);
      setImportPreview(null);
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الاستيراد", "error");
    } finally {
      setImporting(false);
    }
  };

  const downloadRejected = () => {
    if (!importPreview?.rejected?.length) return;
    const header = "التسلسل,اسم السائق,رقم السيارة,سبب الرفض\n";
    const rows = importPreview.rejected
      .map((r: any) => `${r.sequence_no},"${r.driver_name}","${r.vehicle_number}","${r.reason}"`)
      .join("\n");
    const blob = new Blob(["﻿" + header + rows], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "rejected-rows.csv";
    a.click();
  };

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card p-3 text-center">
            <div className="text-xl font-bold text-teal-700 dark:text-teal-400">{stats.count}</div>
            <div className="text-[11px] font-bold text-slate-500">عدد السيارات (تلقائي)</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-xl font-bold tabular-nums">{stats.min} ← {stats.max}</div>
            <div className="text-[11px] font-bold text-slate-500">يبدأ بالتسلسل وينتهي بالتسلسل</div>
          </div>
          <div className={`card p-3 text-center ${stats.duplicates.length ? "border-rose-300 dark:border-rose-900" : ""}`}>
            <div className={`text-xl font-bold ${stats.duplicates.length ? "text-rose-600" : "text-emerald-600"}`}>{stats.duplicates.length}</div>
            <div className="text-[11px] font-bold text-slate-500">أرقام سيارات مكررة</div>
          </div>
          <div className={`card p-3 text-center ${stats.missing.length ? "border-rose-300 dark:border-rose-900" : ""}`}>
            <div className={`text-xl font-bold ${stats.missing.length ? "text-rose-600" : "text-emerald-600"}`}>{stats.missing.length}</div>
            <div className="text-[11px] font-bold text-slate-500">تسلسلات ناقصة</div>
          </div>
        </div>
      )}

      {mismatch && (
        <Alert kind="error">
          ⛔ العدد المذكور في المعاملة ({tx.mentioned_vehicle_count}) لا يطابق عدد صفوف الجدول ({stats!.count}) — سيمنع النظام الإصدار حتى التصحيح.
        </Alert>
      )}
      {stats && stats.duplicates.length > 0 && (
        <Alert kind="error">أرقام سيارات مكررة: {stats.duplicates.join("، ")}</Alert>
      )}
      {stats && stats.missing.length > 0 && (
        <Alert kind="warn">تسلسلات ناقصة: {stats.missing.slice(0, 15).join("، ")}{stats.missing.length > 15 ? " …" : ""}</Alert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs text-slate-500">
          العدد يحسب تلقائياً من عدد الصفوف — يدعم الاستيراد من Excel/CSV (بما فيها جداول Access المصدرة).
        </div>
        <div className="flex-1" />
        {canEdit && (
          <>
            <input
              ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={(e) => e.target.files?.[0] && previewFile(e.target.files[0])}
            />
            <button className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={importing}>
              {importing ? "جارٍ التحليل…" : "📥 استيراد Excel"}
            </button>
            <button className="btn-primary" onClick={openNew}>＋ إضافة سائق</button>
            {drivers.length > 0 && <button className="btn-danger" onClick={clearAll}>تفريغ الجدول</button>}
          </>
        )}
      </div>

      <div className="card max-h-[60vh] overflow-auto">
        {drivers.length === 0 ? <EmptyState text="جدول السائقين فارغ — أدخل الصفوف يدوياً أو استوردها من Excel" /> : (
          <table className="data">
            <thead className="sticky top-0">
              <tr>
                <th>ت</th><th>اسم السائق</th><th>رقم السيارة</th><th>المحافظة</th><th>نوع المركبة</th><th>الحوضية</th><th>ملاحظات</th>
                {canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {drivers.map((d: any) => (
                <tr key={d.id}>
                  <td className="tabular-nums font-bold">{d.sequence_no}</td>
                  <td>{d.driver_name}</td>
                  <td className="tabular-nums">{d.vehicle_number}</td>
                  <td>{d.governorate ?? "—"}</td>
                  <td>{d.vehicle_type ?? "—"}</td>
                  <td>{d.tanker_number ?? "—"}</td>
                  <td className="max-w-40 truncate text-xs">{d.notes ?? "—"}</td>
                  {canEdit && (
                    <td>
                      <div className="flex gap-1.5">
                        <button className="btn-secondary !px-2 !py-0.5 text-xs" onClick={() => openEdit(d)}>تعديل</button>
                        <button className="btn-danger !px-2 !py-0.5 text-xs" onClick={() => remove(d)}>حذف</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* معاينة الاستيراد قبل الحفظ */}
      <Modal title="معاينة الاستيراد — لا يحفظ شيء قبل التأكيد" open={!!importPreview} onClose={() => setImportPreview(null)} wide>
        {importPreview && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[
                ["إجمالي الصفوف", importPreview.report.total_rows, ""],
                ["صالحة للاستيراد", importPreview.report.valid, "text-emerald-600"],
                ["مرفوضة (نقص بيانات)", importPreview.report.invalid, "text-rose-600"],
                ["مكررة داخل الملف", importPreview.report.duplicates_in_file, "text-amber-600"],
                ["مكررة مع الجدول الحالي", importPreview.report.duplicates_with_existing, "text-amber-600"],
              ].map(([label, val, color], i) => (
                <div key={i} className="card p-2.5 text-center">
                  <div className={`text-lg font-bold tabular-nums ${color}`}>{val}</div>
                  <div className="text-[10px] font-bold text-slate-500">{label}</div>
                </div>
              ))}
            </div>
            <div className="text-xs text-slate-500">
              النمط: <b>{importPreview.replace ? "استبدال الجدول الحالي" : "إلحاق بالجدول الحالي (يعاد ترقيم التسلسل تلقائياً)"}</b>
              {importPreview.report.issues.length > 0 && <div className="mt-1">ملاحظات التحليل: {importPreview.report.issues.slice(0, 3).join("؛ ")}</div>}
            </div>
            {importPreview.report.sample.length > 0 && (
              <div className="max-h-40 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="data">
                  <thead><tr><th>ت</th><th>اسم السائق</th><th>رقم السيارة</th><th>المحافظة</th></tr></thead>
                  <tbody>
                    {importPreview.report.sample.map((d: any, i: number) => (
                      <tr key={i}><td>{d.sequence_no}</td><td>{d.driver_name}</td><td>{d.vehicle_number}</td><td>{d.governorate ?? "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {importPreview.rejected.length > 0 && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                {importPreview.rejected.length} صفاً سيُرفض — <button className="underline" onClick={downloadRejected}>تنزيل الصفوف المرفوضة CSV</button>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setImportPreview(null)}>إلغاء الاستيراد</button>
              <button className="btn-primary" onClick={confirmImport} disabled={importing || importPreview.report.valid === 0}>
                {importing ? "جارٍ الحفظ…" : `تأكيد استيراد ${importPreview.report.valid} صفاً`}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal title={editing ? "تعديل صف سائق" : "إضافة سائق"} open={open} onClose={() => setOpen(false)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="التسلسل" hint="يترك فارغاً ليحسب تلقائياً">
            <input className="input" type="number" value={form.sequence_no} onChange={(e) => set("sequence_no", e.target.value)} />
          </Field>
          <Field label="اسم السائق" required>
            <input className="input" value={form.driver_name} onChange={(e) => set("driver_name", e.target.value)} />
          </Field>
          <Field label="رقم السيارة" required>
            <input className="input" value={form.vehicle_number} onChange={(e) => set("vehicle_number", e.target.value)} />
          </Field>
          <Field label="المحافظة">
            <input className="input" value={form.governorate} onChange={(e) => set("governorate", e.target.value)} />
          </Field>
          <Field label="نوع المركبة">
            <input className="input" value={form.vehicle_type} onChange={(e) => set("vehicle_type", e.target.value)} />
          </Field>
          <Field label="رقم الحوضية">
            <input className="input" value={form.tanker_number} onChange={(e) => set("tanker_number", e.target.value)} />
          </Field>
          <Field label="ملاحظات">
            <input className="input" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setOpen(false)}>إلغاء</button>
          <button className="btn-primary" onClick={save}>حفظ</button>
        </div>
      </Modal>
    </div>
  );
}
