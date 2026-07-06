"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch } from "@/lib/client";
import { Field, Modal, Spinner, useToast } from "@/components/ui";
import { ROLES, fmtDate } from "@/lib/constants";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function UsersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({});
  const { toast, node } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ items: any[] }>("/api/users");
      setItems(data.items);
    } catch (e) {
      toast(e instanceof Error ? e.message : "خطأ", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      if (editing) await apiPatch(`/api/users/${editing.id}`, form);
      else await apiPost("/api/users", form);
      toast("تم الحفظ");
      setOpen(false);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الحفظ", "error");
    }
  };

  return (
    <div>
      {node}
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-lg font-bold">المستخدمون والصلاحيات</h1>
        <div className="flex-1" />
        <button className="btn-primary" onClick={() => { setEditing(null); setForm({ role: "DATA_ENTRY" }); setOpen(true); }}>＋ مستخدم جديد</button>
      </div>
      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : (
          <table className="data">
            <thead><tr><th>الاسم</th><th>البريد</th><th>الدور</th><th>فعال</th><th>تاريخ الإنشاء</th><th>إجراءات</th></tr></thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold">{u.name}</td>
                  <td dir="ltr" className="!text-left">{u.email}</td>
                  <td>{(ROLES as any)[u.role] ?? u.role}</td>
                  <td>{u.is_active ? "✅" : "❌"}</td>
                  <td>{fmtDate(u.created_at)}</td>
                  <td>
                    <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => { setEditing(u); setForm({ name: u.name, role: u.role, is_active: u.is_active }); setOpen(true); }}>تعديل</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal title={editing ? "تعديل مستخدم" : "مستخدم جديد"} open={open} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <Field label="الاسم" required><input className="input" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          {!editing && (
            <Field label="البريد الإلكتروني" required><input className="input" dir="ltr" type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          )}
          <Field label={editing ? "كلمة مرور جديدة (اتركها فارغة للإبقاء)" : "كلمة المرور"} required={!editing}>
            <input className="input" dir="ltr" type="password" value={form.password ?? ""} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="الدور">
            <select className="input" value={form.role ?? "DATA_ENTRY"} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          {editing && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-teal-700" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              الحساب فعال
            </label>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setOpen(false)}>إلغاء</button>
          <button className="btn-primary" onClick={save}>حفظ</button>
        </div>
      </Modal>
    </div>
  );
}
