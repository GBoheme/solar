"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/client";
import { Field, Modal, Spinner, EmptyState, useToast } from "@/components/ui";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Column = { key: string; label: string; render?: (item: any) => React.ReactNode };
export type FormField = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "boolean" | "textarea" | "select" | "file";
  required?: boolean;
  hint?: string;
  optionsEntity?: string; // كيان آخر تجلب خياراته من الدليل
  optionLabel?: (item: any) => string;
  options?: { value: string; label: string }[]; // خيارات ثابتة
};

export default function CatalogManager({ entity, title, description, columns, formFields, canWrite = true }: {
  entity: string;
  title: string;
  description?: string;
  columns: Column[];
  formFields: FormField[];
  canWrite?: boolean;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [optionsCache, setOptionsCache] = useState<Record<string, any[]>>({});
  const { toast, node: toastNode } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ items: any[] }>(`/api/catalog/${entity}?q=${encodeURIComponent(q)}`);
      setItems(data.items);
    } catch (e) {
      toast(e instanceof Error ? e.message : "خطأ", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, q]);

  useEffect(() => { load(); }, [load]);

  // جلب خيارات القوائم المرتبطة
  useEffect(() => {
    const entities = [...new Set(formFields.filter((f) => f.optionsEntity).map((f) => f.optionsEntity!))];
    entities.forEach(async (e) => {
      try {
        const data = await apiGet<{ items: any[] }>(`/api/catalog/${e}`);
        setOptionsCache((c) => ({ ...c, [e]: data.items }));
      } catch { /* تجاهل */ }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNew = () => {
    const init: Record<string, any> = {};
    for (const f of formFields) if (f.type === "boolean") init[f.key] = true;
    setForm(init);
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (item: any) => {
    const init: Record<string, any> = {};
    for (const f of formFields) {
      let v = item[f.key];
      if (f.type === "date" && v) v = String(v).slice(0, 10);
      init[f.key] = v ?? (f.type === "boolean" ? false : "");
    }
    setForm(init);
    setEditing(item);
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editing) await apiPatch(`/api/catalog/${entity}/${editing.id}`, form);
      else await apiPost(`/api/catalog/${entity}`, form);
      toast(editing ? "تم حفظ التعديلات" : "تمت الإضافة بنجاح");
      setModalOpen(false);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الحفظ", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: any) => {
    if (!confirm("هل أنت متأكد من حذف هذا السجل؟ الحذف متاح للمدير فقط.")) return;
    try {
      await apiDelete(`/api/catalog/${entity}/${item.id}`);
      toast("تم الحذف");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الحذف", "error");
    }
  };

  const uploadFile = async (key: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("subdir", `uploads/${entity}`);
    try {
      const data = await apiPost<{ file_url: string }>("/api/upload", fd);
      setForm((f) => ({ ...f, [key]: data.file_url }));
      toast("تم رفع الملف");
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الرفع", "error");
    }
  };

  const renderInput = (f: FormField) => {
    const v = form[f.key] ?? "";
    const set = (val: any) => setForm((fm) => ({ ...fm, [f.key]: val }));
    switch (f.type) {
      case "textarea":
        return <textarea className="input min-h-20" value={v} onChange={(e) => set(e.target.value)} />;
      case "boolean":
        return (
          <label className="flex items-center gap-2 py-1.5 text-sm">
            <input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} className="h-4 w-4 accent-teal-700" />
            نعم
          </label>
        );
      case "select": {
        const opts = f.options
          ? f.options
          : (optionsCache[f.optionsEntity!] ?? []).map((o) => ({
              value: String(o.id),
              label: f.optionLabel ? f.optionLabel(o) : o.name ?? o.official_name ?? o.short_name ?? `#${o.id}`,
            }));
        return (
          <select className="input" value={v ?? ""} onChange={(e) => set(e.target.value || null)}>
            <option value="">— اختر —</option>
            {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        );
      }
      case "file":
        return (
          <div className="flex items-center gap-2">
            <input type="file" className="input" onChange={(e) => e.target.files?.[0] && uploadFile(f.key, e.target.files[0])} />
            {v && <a className="shrink-0 text-xs text-teal-700 underline dark:text-teal-400" href={`/api/files/${v}`} target="_blank">عرض</a>}
          </div>
        );
      default:
        return <input className="input" type={f.type} value={v} onChange={(e) => set(e.target.value)} />;
    }
  };

  const cols = useMemo(() => columns, [columns]);

  return (
    <div>
      {toastNode}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-lg font-bold">{title}</h1>
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
        <div className="flex-1" />
        <input
          className="input max-w-56"
          placeholder="بحث…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {canWrite && <button className="btn-primary" onClick={openNew}>＋ إضافة</button>}
      </div>

      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : items.length === 0 ? <EmptyState text="لا توجد سجلات" /> : (
          <table className="data">
            <thead>
              <tr>
                {cols.map((c) => <th key={c.key}>{c.label}</th>)}
                {canWrite && <th className="w-28">إجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  {cols.map((c) => (
                    <td key={c.key}>
                      {c.render ? c.render(item) : (item[c.key] ?? "—") || "—"}
                    </td>
                  ))}
                  {canWrite && (
                    <td>
                      <div className="flex gap-1.5">
                        <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => openEdit(item)}>تعديل</button>
                        <button className="btn-danger !px-2 !py-1 text-xs" onClick={() => remove(item)}>حذف</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal title={editing ? `تعديل — ${title}` : `إضافة — ${title}`} open={modalOpen} onClose={() => setModalOpen(false)} wide={formFields.length > 6}>
        <div className={`grid gap-3 ${formFields.length > 6 ? "sm:grid-cols-2" : ""}`}>
          {formFields.map((f) => (
            <Field key={f.key} label={f.label} required={f.required} hint={f.hint}>
              {renderInput(f)}
            </Field>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>إلغاء</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? "جارٍ الحفظ…" : "حفظ"}</button>
        </div>
      </Modal>
    </div>
  );
}
