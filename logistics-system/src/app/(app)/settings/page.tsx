"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch } from "@/lib/client";
import { Field, Alert, Spinner, Modal, useToast } from "@/components/ui";
import { APP_VERSION } from "@/lib/version";

/* eslint-disable @typescript-eslint/no-explicit-any */

const CONFIRM_PHRASE = "أفهم أن هذا سيحذف بيانات التطبيق";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [resetMode, setResetMode] = useState<"demo" | "full" | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);
  const { toast, node } = useToast();

  useEffect(() => {
    apiGet<{ settings: any }>("/api/settings").then((d) => setSettings(d.settings)).catch(() => {});
  }, []);

  const set = (k: string, v: string) => setSettings((s: any) => ({ ...s, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const d = await apiPatch<{ settings: any }>("/api/settings", settings);
      setSettings(d.settings);
      toast("تم حفظ الإعدادات — حدّث الصفحة لتطبيق الاسم في الشريط الجانبي");
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الحفظ", "error");
    } finally {
      setSaving(false);
    }
  };

  const doReset = async () => {
    if (confirmText.trim() !== CONFIRM_PHRASE) {
      return toast("عبارة التأكيد غير مطابقة — انسخها حرفياً", "error");
    }
    setResetting(true);
    try {
      const d = await apiPost<{ deleted: any; kept: string[] }>("/api/maintenance/reset", {
        mode: resetMode,
        confirmation: confirmText.trim(),
      });
      toast(`تمت إعادة التعيين — حُذفت ${d.deleted.transactions} معاملة و${d.deleted.attachments} مرفقاً`);
      setResetMode(null);
      setConfirmText("");
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشلت إعادة التعيين", "error");
    } finally {
      setResetting(false);
    }
  };

  if (!settings) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {node}
      <div>
        <h1 className="text-lg font-bold">الإعدادات والصيانة</h1>
        <p className="text-xs text-slate-500">العلامة والهوية، النسخ الاحتياطي، وإعادة تعيين البيانات — الإصدار {APP_VERSION}</p>
      </div>

      {/* ===== العلامة والهوية ===== */}
      <div className="card space-y-4 p-5">
        <h2 className="text-sm font-bold">العلامة والهوية</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم التطبيق (عربي)" required>
            <input className="input" value={settings.app_name ?? ""} onChange={(e) => set("app_name", e.target.value)} />
          </Field>
          <Field label="اسم التطبيق (إنجليزي)">
            <input className="input" dir="ltr" value={settings.app_name_en ?? ""} onChange={(e) => set("app_name_en", e.target.value)} />
          </Field>
          <Field label="اسم المالك" required hint="يستخدم كهوية موحدة في سجل التدقيق والكتب: أعدّه / دققه / أصدره">
            <input className="input" value={settings.owner_name ?? ""} onChange={(e) => set("owner_name", e.target.value)} />
          </Field>
          <Field label="المنتج الافتراضي">
            <input className="input" value={settings.default_product ?? ""} onChange={(e) => set("default_product", e.target.value)} />
          </Field>
        </div>
        <Field label="تذييل التقارير (عربي)" hint="يظهر أسفل الكتب والتقارير المولدة">
          <input className="input" value={settings.report_footer ?? ""} onChange={(e) => set("report_footer", e.target.value)} />
        </Field>
        <Field label="تذييل المستندات (إنجليزي)">
          <input className="input" dir="ltr" value={settings.doc_footer ?? ""} onChange={(e) => set("doc_footer", e.target.value)} />
        </Field>
        <div className="flex justify-end">
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? "جارٍ الحفظ…" : "حفظ الإعدادات"}</button>
        </div>
      </div>

      {/* ===== النسخ الاحتياطي ===== */}
      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-bold">النسخ الاحتياطي</h2>
        <p className="text-xs text-slate-500">
          نسخة ZIP كاملة تشمل: قاعدة البيانات، كل المرفقات، الكتب المولدة، القوالب، وملف <code dir="ltr">backup-info.json</code> بمعلومات النسخة.
          خذ نسخة دائماً قبل أي إعادة تعيين.
        </p>
        <a className="btn-secondary w-fit" href="/api/maintenance/backup">📦 تنزيل نسخة احتياطية كاملة</a>
      </div>

      {/* ===== إعادة التعيين ===== */}
      <div className="card space-y-4 border-rose-200 p-5 dark:border-rose-900">
        <h2 className="text-sm font-bold text-rose-700 dark:text-rose-400">إعادة التعيين / بداية نظيفة</h2>
        <Alert kind="warn">
          حذف البيانات لا رجعة فيه. خذ نسخة احتياطية أولاً. كل عملية تتطلب كتابة عبارة تأكيد حرفية.
        </Alert>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <h3 className="mb-1 text-sm font-bold">مسح البيانات التجريبية/التشغيلية</h3>
            <p className="mb-3 text-xs text-slate-500">
              يحذف: المعاملات والسائقين واستمارات القطع والمرفقات والكتب المولدة وسجلات الاشتغال.
              <br />يبقي: الإعدادات، القوالب، الجهات، الشركات، العقود، الضريبة، المسارات، مصادر التجهيز، وسجل التدقيق.
            </p>
            <button className="btn-secondary text-xs" onClick={() => { setResetMode("demo"); setConfirmText(""); }}>مسح البيانات التشغيلية…</button>
          </div>
          <div className="rounded-lg border border-rose-200 p-4 dark:border-rose-900">
            <h3 className="mb-1 text-sm font-bold text-rose-700 dark:text-rose-400">تصفير كامل</h3>
            <p className="mb-3 text-xs text-slate-500">
              يحذف كل البيانات التشغيلية والأدلة (جهات، شركات، عقود، ضريبة، مسارات، مصادر) وسجل التدقيق.
              <br />يبقي: بنية قاعدة البيانات، الإعدادات، هوية المالك، أنواع المعاملات، والقوالب.
            </p>
            <button className="btn-danger text-xs" onClick={() => { setResetMode("full"); setConfirmText(""); }}>تصفير كامل…</button>
          </div>
        </div>
      </div>

      {/* ===== حول ===== */}
      <div className="card p-5 text-xs text-slate-500">
        <div className="font-bold text-slate-700 dark:text-slate-300">{settings.app_name} — {settings.app_name_en}</div>
        <div className="mt-1">الإصدار {APP_VERSION} • نمط الاستخدام الشخصي (بلا تسجيل دخول) • قاعدة بيانات SQLite محلية</div>
        <div className="mt-1">المالك: {settings.owner_name}</div>
      </div>

      {/* نافذة التأكيد المشدد */}
      <Modal
        title={resetMode === "full" ? "تأكيد التصفير الكامل" : "تأكيد مسح البيانات التشغيلية"}
        open={!!resetMode}
        onClose={() => setResetMode(null)}
      >
        <div className="space-y-3">
          <Alert kind="error">
            {resetMode === "full"
              ? "سيحذف هذا كل المعاملات والمرفقات والأدلة وسجل التدقيق نهائياً."
              : "سيحذف هذا كل المعاملات والمرفقات والكتب المولدة نهائياً."}
          </Alert>
          <a className="btn-secondary w-full !justify-center text-xs" href="/api/maintenance/backup">📦 تنزيل نسخة احتياطية أولاً (منصوح به بشدة)</a>
          <div>
            <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
              اكتب العبارة التالية حرفياً للتأكيد:
            </span>
            <div className="mb-2 select-all rounded-lg bg-slate-100 px-3 py-2 text-center text-sm font-bold dark:bg-slate-800">{CONFIRM_PHRASE}</div>
            <input className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="اكتب عبارة التأكيد هنا…" />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setResetMode(null)}>إلغاء</button>
            <button
              className="btn-danger"
              disabled={confirmText.trim() !== CONFIRM_PHRASE || resetting}
              onClick={doReset}
            >
              {resetting ? "جارٍ الحذف…" : resetMode === "full" ? "تنفيذ التصفير الكامل" : "تنفيذ المسح"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
