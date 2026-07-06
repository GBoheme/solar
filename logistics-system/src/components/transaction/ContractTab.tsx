"use client";

import { useState } from "react";
import { apiPatch } from "@/lib/client";
import { Field, Alert } from "@/components/ui";
import { fmtDate, fmtNum } from "@/lib/constants";
import type { TabProps } from "./TransactionFile";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ContractTab({ tx, canEdit, reload, toast, catalogs }: TabProps) {
  const [contractId, setContractId] = useState<string>(tx.contract_id ? String(tx.contract_id) : "");
  const [taxLetterId, setTaxLetterId] = useState<string>(tx.tax_letter_id ? String(tx.tax_letter_id) : "");
  const [saving, setSaving] = useState(false);

  const contracts = catalogs["contracts"] ?? [];
  const taxLetters = catalogs["tax-letters"] ?? [];

  const selectedContract = contracts.find((c: any) => String(c.id) === contractId);
  const selectedTax = taxLetters.find((t: any) => String(t.id) === taxLetterId);
  const mismatch =
    selectedContract && selectedTax && selectedTax.contract_id && String(selectedTax.contract_id) !== contractId;

  const save = async () => {
    setSaving(true);
    try {
      await apiPatch(`/api/transactions/${tx.id}`, {
        contract_id: contractId || null,
        tax_letter_id: taxLetterId || null,
      });
      toast("تم حفظ الربط");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الحفظ", "error");
    } finally {
      setSaving(false);
    }
  };

  const needsContract = tx.transaction_type.requires_contract;
  const needsTax = tx.transaction_type.requires_tax_letter;

  return (
    <div className="space-y-4">
      {(needsContract || needsTax) && (
        <Alert kind="info">
          هذا النوع من المعاملات يتطلب: {[needsContract && "ربط عقد", needsTax && "ربط كتاب ضريبة"].filter(Boolean).join(" و ")}.
          {needsTax && " ينبه النظام إذا لم يطابق كتاب الضريبة العقد المرتبط."}
        </Alert>
      )}

      <div className="card space-y-4 p-5">
        <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
          <Field label={`العقد ${needsContract ? "(إلزامي)" : ""}`} required={needsContract}>
            <select className="input" value={contractId} onChange={(e) => setContractId(e.target.value)}>
              <option value="">— غير مرتبط —</option>
              {contracts.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.contract_number} — {c.company_rel?.official_name ?? ""} — {c.product ?? ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`كتاب الضريبة ${needsTax ? "(إلزامي)" : ""}`} required={needsTax}>
            <select className="input" value={taxLetterId} onChange={(e) => setTaxLetterId(e.target.value)}>
              <option value="">— غير مرتبط —</option>
              {taxLetters.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.tax_letter_number} — {t.company?.official_name ?? ""} — مسموح: {fmtNum(t.allowed_quantity)}
                </option>
              ))}
            </select>
          </Field>
        </fieldset>

        {mismatch && (
          <Alert kind="warn">
            ⚠️ كتاب الضريبة المختار مرتبط بعقد مختلف ({selectedTax.contract?.contract_number ?? selectedTax.contract_id}) — سيمنع هذا الإصدار حتى التصحيح.
          </Alert>
        )}

        {canEdit && (
          <div className="flex justify-end">
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? "جارٍ الحفظ…" : "حفظ الربط"}</button>
          </div>
        )}
      </div>

      {selectedContract && (
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-bold">تفاصيل العقد المرتبط</h3>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-slate-400">رقم العقد</dt><dd className="font-semibold">{selectedContract.contract_number}</dd></div>
            <div><dt className="text-xs text-slate-400">التاريخ</dt><dd>{fmtDate(selectedContract.contract_date)}</dd></div>
            <div><dt className="text-xs text-slate-400">الشركة</dt><dd>{selectedContract.company_rel?.official_name ?? "—"}</dd></div>
            <div><dt className="text-xs text-slate-400">المنتج</dt><dd>{selectedContract.product ?? "—"}</dd></div>
            <div><dt className="text-xs text-slate-400">الكمية المتعاقد عليها</dt><dd>{fmtNum(selectedContract.total_quantity)}</dd></div>
            <div>
              <dt className="text-xs text-slate-400">الملف</dt>
              <dd>{selectedContract.file_url ? <a className="text-teal-700 underline dark:text-teal-400" href={`/api/files/${selectedContract.file_url}`} target="_blank">عرض العقد</a> : "غير مرفوع"}</dd>
            </div>
          </dl>
        </div>
      )}

      {selectedTax && (
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-bold">تفاصيل كتاب الضريبة المرتبط</h3>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-slate-400">رقم الكتاب</dt><dd className="font-semibold">{selectedTax.tax_letter_number}</dd></div>
            <div><dt className="text-xs text-slate-400">التاريخ</dt><dd>{fmtDate(selectedTax.tax_letter_date)}</dd></div>
            <div><dt className="text-xs text-slate-400">الكمية المسموح بها</dt><dd>{fmtNum(selectedTax.allowed_quantity)}</dd></div>
            <div><dt className="text-xs text-slate-400">العقد المرتبط به</dt><dd>{selectedTax.contract?.contract_number ?? "⚠️ غير مرتبط بعقد"}</dd></div>
            <div><dt className="text-xs text-slate-400">المنتج</dt><dd>{selectedTax.product ?? "—"}</dd></div>
            <div>
              <dt className="text-xs text-slate-400">الملف</dt>
              <dd>{selectedTax.file_url ? <a className="text-teal-700 underline dark:text-teal-400" href={`/api/files/${selectedTax.file_url}`} target="_blank">عرض الكتاب</a> : "غير مرفوع"}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
