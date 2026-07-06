"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/client";
import { Spinner, StatusBadge, ProgressBar, useToast, Modal } from "@/components/ui";
import { FINAL_STATUSES, fmtDateTime } from "@/lib/constants";
import BasicTab from "./BasicTab";
import ContractTab from "./ContractTab";
import CutFormsTab from "./CutFormsTab";
import RoutesTab from "./RoutesTab";
import DriversTab from "./DriversTab";
import OperationLogsTab from "./OperationLogsTab";
import AttachmentsTab from "./AttachmentsTab";
import ChecklistTab from "./ChecklistTab";
import GenerateTab from "./GenerateTab";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type TabProps = {
  tx: any;
  role: string;
  canEdit: boolean;
  reload: () => Promise<void>;
  toast: (msg: string, kind?: "success" | "error") => void;
  catalogs: Record<string, any[]>;
};

const TABS = [
  { key: "basic", label: "البيانات الأساسية", icon: "📝" },
  { key: "contract", label: "العقود والضريبة", icon: "📜" },
  { key: "cutforms", label: "استمارات القطع", icon: "📋" },
  { key: "routes", label: "المسارات", icon: "🛣️" },
  { key: "drivers", label: "السائقون والسيارات", icon: "🚚" },
  { key: "oplogs", label: "سجل الاشتغال", icon: "🗒️" },
  { key: "attachments", label: "المرفقات", icon: "📎" },
  { key: "checklist", label: "قائمة التدقيق", icon: "✅" },
  { key: "generate", label: "توليد الكتاب", icon: "📄" },
];

export default function TransactionFile({ id, role }: { id: number; role: string }) {
  const [tx, setTx] = useState<any>(null);
  const [tab, setTab] = useState("basic");
  const [checkResult, setCheckResult] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [activity, setActivity] = useState<any[]>([]);
  const [statusNote, setStatusNote] = useState<{ to: string; label: string } | null>(null);
  const [catalogs, setCatalogs] = useState<Record<string, any[]>>({});
  const { toast, node: toastNode } = useToast();

  const reload = useCallback(async () => {
    const data = await apiGet<{ item: any }>(`/api/transactions/${id}`);
    setTx(data.item);
  }, [id]);

  useEffect(() => {
    reload().catch((e) => toast(e.message, "error"));
    // الأدلة المشتركة للتبويبات
    const entities = ["departments", "companies", "contracts", "tax-letters", "routes", "loading-sources"];
    entities.forEach(async (e) => {
      try {
        const d = await apiGet<{ items: any[] }>(`/api/catalog/${e}`);
        setCatalogs((c) => ({ ...c, [e]: d.items }));
      } catch { /* تجاهل */ }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (showActivity) {
      apiGet<{ items: any[] }>(`/api/audit-log?transaction_id=${id}`).then((d) => setActivity(d.items)).catch(() => {});
    }
  }, [showActivity, id, tx]);

  const runCheck = async () => {
    setChecking(true);
    try {
      const data = await apiPost<{ result: any }>(`/api/transactions/${id}/check`);
      setCheckResult(data.result);
      await reload();
      const r = data.result;
      if (r.errors.length === 0 && r.warnings.length === 0) toast("الفحص ناجح — لا أخطاء ولا تحذيرات ✅");
      else toast(`نتيجة الفحص: ${r.errors.length} خطأ حرج، ${r.warnings.length} تحذير`, r.errors.length ? "error" : "success");
      setTab("checklist");
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الفحص", "error");
    } finally {
      setChecking(false);
    }
  };

  const changeStatus = async (status: string, note?: string) => {
    try {
      await apiPost(`/api/transactions/${id}/status`, { status, note });
      toast("تم تغيير الحالة");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل تغيير الحالة", "error");
    }
  };

  if (!tx) return <Spinner />;

  const isFinal = FINAL_STATUSES.includes(tx.status) || tx.status === "CANCELLED";
  const canWrite = ["ADMIN", "DATA_ENTRY", "REVIEWER"].includes(role);
  const canReview = ["ADMIN", "REVIEWER"].includes(role);
  const canEdit = canWrite && !isFinal;

  const criticalCount = tx.validation_errors?.filter((e: any) => e.severity === "CRITICAL" && !e.is_resolved).length ?? 0;
  const warningCount = tx.validation_errors?.filter((e: any) => e.severity === "WARNING" && !e.is_resolved).length ?? 0;
  const checklistItems = tx.checklist ?? [];
  const requiredItems = checklistItems.filter((c: any) => c.checklist_item.is_required);
  const doneItems = requiredItems.filter((c: any) => c.is_done);
  const completion = checkResult?.completion ?? Math.round(
    requiredItems.length ? (doneItems.length / requiredItems.length) * 100 : 0
  );

  const tabProps: TabProps = { tx, role, canEdit, reload, toast, catalogs };

  return (
    <div className="space-y-4">
      {toastNode}

      {/* شريط الحالة العلوي — ملف القضية */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tabular-nums">{tx.internal_number}</h1>
              <StatusBadge status={tx.status} />
              {tx.correction_of && (
                <Link href={`/transactions/${tx.correction_of.id}`} className="badge bg-purple-100 text-purple-700 hover:underline dark:bg-purple-950 dark:text-purple-300">
                  تصحيح لـ {tx.correction_of.internal_number}
                </Link>
              )}
            </div>
            <div className="mt-0.5 text-sm text-slate-500">{tx.transaction_type.name} — {tx.subject}</div>
          </div>
          <div className="flex-1" />
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-secondary" onClick={() => setShowActivity(!showActivity)}>🕘 سجل النشاط</button>
            <a className="btn-secondary" href={`/api/transactions/${id}/archive`}>⬇️ أرشيف ZIP</a>
            <button className="btn-primary" onClick={runCheck} disabled={checking}>
              {checking ? "جارٍ الفحص…" : "🔍 فحص المعاملة"}
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-1 text-[11px] font-bold text-slate-500">نسبة الاكتمال</div>
            <ProgressBar value={completion} />
          </div>
          <div className="flex items-center gap-2 text-xs">
            {criticalCount > 0 && <span className="badge bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">🔴 {criticalCount} خطأ حرج</span>}
            {warningCount > 0 && <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">🟡 {warningCount} تحذير</span>}
            {criticalCount === 0 && warningCount === 0 && <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">لا أخطاء مسجلة</span>}
            <span className="text-slate-400">التدقيق: {doneItems.length}/{requiredItems.length}</span>
          </div>
        </div>

        {/* أزرار سير العمل */}
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          {canWrite && ["DRAFT", "MISSING_DATA", "MISSING_ATTACHMENTS", "RETURNED_FOR_CORRECTION"].includes(tx.status) && (
            <button className="btn-secondary text-xs" onClick={() => changeStatus("AWAITING_REVIEW")}>إحالة للتدقيق ←</button>
          )}
          {canReview && tx.status === "AWAITING_REVIEW" && (
            <>
              <button className="btn-success text-xs" onClick={() => changeStatus("REVIEWED")}>✓ اعتماد التدقيق</button>
              <button className="btn-danger text-xs" onClick={() => setStatusNote({ to: "RETURNED_FOR_CORRECTION", label: "إعادة للتصحيح" })}>↩ إعادة للتصحيح</button>
            </>
          )}
          {canReview && tx.status === "REVIEWED" && (
            <button className="btn-success text-xs" onClick={() => changeStatus("READY_TO_ISSUE")}>جاهزة للإصدار ←</button>
          )}
          {canWrite && tx.status === "ISSUED_PDF" && (
            <button className="btn-secondary text-xs" onClick={() => changeStatus("SENT")}>📤 تأشير كمرسلة</button>
          )}
          {canWrite && ["ISSUED_PDF", "SENT"].includes(tx.status) && (
            <button className="btn-secondary text-xs" onClick={() => changeStatus("ARCHIVED")}>🗄️ أرشفة</button>
          )}
          {role === "ADMIN" && !isFinal && tx.status !== "CANCELLED" && (
            <button className="btn-danger text-xs" onClick={() => { if (confirm("إلغاء المعاملة نهائياً؟")) changeStatus("CANCELLED"); }}>✕ إلغاء المعاملة</button>
          )}
          {isFinal && tx.status !== "CANCELLED" && canReview && (
            <button
              className="btn-secondary text-xs"
              onClick={async () => {
                if (!confirm("فتح نسخة تصحيحية جديدة من هذه المعاملة؟")) return;
                try {
                  const d = await apiPost<{ item: any }>(`/api/transactions/${id}/correction`);
                  location.href = `/transactions/${d.item.id}`;
                } catch (e) {
                  toast(e instanceof Error ? e.message : "فشل", "error");
                }
              }}
            >
              ✏️ فتح نسخة تصحيحية
            </button>
          )}
          {isFinal && (
            <span className="self-center text-xs text-slate-400">
              معاملة نهائية — التعديل متاح فقط عبر نسخة تصحيحية
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="min-w-0 flex-1">
          {/* التبويبات */}
          <div className="mb-3 flex flex-wrap gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900">
            {TABS.map((t) => {
              let count: number | null = null;
              if (t.key === "cutforms") count = tx.cut_forms.length;
              if (t.key === "drivers") count = tx.drivers.length;
              if (t.key === "attachments") count = tx.attachments.length;
              if (t.key === "routes") count = tx.routes.length;
              if (t.key === "oplogs") count = tx.operation_logs.length;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    tab === t.key ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{t.icon}</span>{t.label}
                  {count !== null && count > 0 && (
                    <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${tab === t.key ? "bg-white/20" : "bg-slate-200 dark:bg-slate-700"}`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {tab === "basic" && <BasicTab {...tabProps} />}
          {tab === "contract" && <ContractTab {...tabProps} />}
          {tab === "cutforms" && <CutFormsTab {...tabProps} />}
          {tab === "routes" && <RoutesTab {...tabProps} />}
          {tab === "drivers" && <DriversTab {...tabProps} />}
          {tab === "oplogs" && <OperationLogsTab {...tabProps} />}
          {tab === "attachments" && <AttachmentsTab {...tabProps} />}
          {tab === "checklist" && <ChecklistTab {...tabProps} />}
          {tab === "generate" && <GenerateTab {...tabProps} />}
        </div>

        {/* سجل النشاط الجانبي */}
        {showActivity && (
          <aside className="w-full shrink-0 xl:w-80">
            <div className="card max-h-[70vh] overflow-y-auto p-4">
              <h3 className="mb-3 text-sm font-bold">سجل النشاط</h3>
              <div className="space-y-3">
                {activity.length === 0 && <div className="text-xs text-slate-400">لا يوجد نشاط</div>}
                {activity.map((a) => (
                  <div key={a.id} className="border-r-2 border-teal-600 pr-2.5 text-xs">
                    <div className="font-semibold">{a.action}</div>
                    <div className="mt-0.5 text-[10px] text-slate-400">{a.user.name} — {fmtDateTime(a.created_at)}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* نافذة سبب الإعادة للتصحيح */}
      <Modal title={statusNote?.label ?? ""} open={!!statusNote} onClose={() => setStatusNote(null)}>
        <NoteForm
          onSubmit={(note) => {
            if (statusNote) changeStatus(statusNote.to, note);
            setStatusNote(null);
          }}
        />
      </Modal>
    </div>
  );
}

function NoteForm({ onSubmit }: { onSubmit: (note: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <div>
      <textarea className="input min-h-24" placeholder="سبب الإعادة للتصحيح…" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="mt-4 flex justify-end">
        <button className="btn-primary" onClick={() => onSubmit(note)}>تأكيد</button>
      </div>
    </div>
  );
}
