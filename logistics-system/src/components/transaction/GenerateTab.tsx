"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/client";
import { Alert, EmptyState } from "@/components/ui";
import { DOC_KINDS, fmtDateTime } from "@/lib/constants";
import type { TabProps } from "./TransactionFile";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function GenerateTab({ tx, role, reload, toast }: TabProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    apiGet<{ items: any[] }>("/api/templates").then((d) => {
      const relevant = d.items.filter(
        (t) => t.is_active && (!t.transaction_type_id || t.transaction_type_id === tx.transaction_type_id)
      );
      setTemplates(relevant);
    }).catch(() => {});
  }, [tx.transaction_type_id]);

  const canWrite = ["ADMIN", "DATA_ENTRY", "REVIEWER"].includes(role);
  const canReview = ["ADMIN", "REVIEWER"].includes(role);

  const errors = tx.validation_errors.filter((e: any) => e.severity === "CRITICAL" && !e.is_resolved);
  const warnings = tx.validation_errors.filter((e: any) => e.severity === "WARNING" && !e.is_resolved);
  const requiredItems = tx.checklist.filter((c: any) => c.checklist_item.is_required);
  const doneItems = requiredItems.filter((c: any) => c.is_done);
  const checklistComplete = requiredItems.length > 0 && doneItems.length === requiredItems.length;

  const canGenerateWord = errors.length === 0 && canWrite && !["ARCHIVED", "CANCELLED"].includes(tx.status);
  const pdfEligibleStatus = ["REVIEWED", "READY_TO_ISSUE", "ISSUED_WORD"].includes(tx.status);
  const canIssuePdf = canReview && pdfEligibleStatus && errors.length === 0 && warnings.length === 0 && checklistComplete;

  const generateWord = async () => {
    setGenerating(true);
    try {
      await apiPost(`/api/transactions/${tx.id}/generate`, templateId ? { template_id: Number(templateId) } : {});
      toast("تم توليد كتاب Word — النسخة محفوظة في الأسفل");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل التوليد", "error");
    } finally {
      setGenerating(false);
    }
  };

  const issuePdf = async () => {
    if (!confirm("إصدار PDF النهائي؟ ستتحول المعاملة إلى حالة نهائية ولا يمكن تعديلها بعدها إلا بنسخة تصحيحية.")) return;
    setIssuing(true);
    try {
      await apiPost(`/api/transactions/${tx.id}/pdf`);
      toast("تم إصدار PDF النهائي ✅");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الإصدار", "error");
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* شروط الإصدار */}
      <div className="card p-5">
        <h3 className="mb-3 text-sm font-bold">بوابة الإصدار — لا يصدر الكتاب قبل اكتمال التدقيق</h3>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <GateItem ok={errors.length === 0} label={`أخطاء حرجة: ${errors.length}`} />
          <GateItem ok={warnings.length === 0} label={`تحذيرات غير متجاوزة: ${warnings.length}`} />
          <GateItem ok={checklistComplete} label={`قائمة التدقيق: ${doneItems.length}/${requiredItems.length}`} />
          <GateItem ok={pdfEligibleStatus} label="الحالة: مدققة / جاهزة للإصدار / صادرة Word (شرط PDF)" />
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="min-w-56">
            <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">القالب</span>
            <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">القالب الافتراضي للنوع</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name} (v{t.version})</option>)}
            </select>
          </div>
          {canGenerateWord ? (
            <button className="btn-primary" onClick={generateWord} disabled={generating}>
              {generating ? "جارٍ التوليد…" : "📄 توليد كتاب Word"}
            </button>
          ) : (
            <div className="text-xs text-slate-400">
              {errors.length > 0 ? "زر توليد Word يظهر بعد حل الأخطاء الحرجة (شغّل فحص المعاملة)" : "توليد Word غير متاح لهذه الحالة/الصلاحية"}
            </div>
          )}
          {canIssuePdf && (
            <button className="btn-success" onClick={issuePdf} disabled={issuing}>
              {issuing ? "جارٍ الإصدار…" : "🏁 إصدار PDF نهائي"}
            </button>
          )}
          {!canIssuePdf && canReview && (
            <div className="text-xs text-slate-400">زر إصدار PDF النهائي يظهر فقط بعد اكتمال التدقيق الكامل واعتماد المعاملة</div>
          )}
        </div>
      </div>

      {tx.status === "ISSUED_PDF" && (
        <Alert kind="success">✅ صدر PDF النهائي — يمكن تأشير المعاملة كمرسلة ثم أرشفتها من الشريط العلوي.</Alert>
      )}

      {/* الكتب المولدة — كل نسخة تحفظ ولا تستبدل */}
      <div className="card overflow-x-auto">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold dark:border-slate-800">
          الكتب المولدة (Versioning — كل نسخة تحفظ ولا تستبدل القديمة)
        </div>
        {tx.generated_documents.length === 0 ? <EmptyState text="لم يولد أي كتاب بعد" /> : (
          <table className="data">
            <thead>
              <tr><th>النسخة</th><th>التسمية</th><th>النوع</th><th>القالب</th><th>ولدها</th><th>التاريخ</th><th>Word</th><th>PDF</th></tr>
            </thead>
            <tbody>
              {tx.generated_documents.map((d: any) => (
                <tr key={d.id}>
                  <td className="tabular-nums font-bold">v{d.version}</td>
                  <td className="font-semibold">{d.label}</td>
                  <td>
                    <span className={`badge ${d.kind === "FINAL" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                      {(DOC_KINDS as any)[d.kind] ?? d.kind}
                    </span>
                  </td>
                  <td>{d.template?.name ?? "—"}</td>
                  <td>{d.generator.name}</td>
                  <td className="text-xs">{fmtDateTime(d.generated_at)}</td>
                  <td>{d.word_url ? <a className="btn-secondary !px-2 !py-1 text-xs" href={`/api/files/${d.word_url}?download=1`}>⬇ DOCX</a> : "—"}</td>
                  <td>{d.pdf_url ? <a className="btn-secondary !px-2 !py-1 text-xs" href={`/api/files/${d.pdf_url}`} target="_blank">📄 PDF</a> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function GateItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${ok ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"}`}>
      <span>{ok ? "✅" : "⛔"}</span>
      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
}
