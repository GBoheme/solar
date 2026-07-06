"use client";

import CatalogManager from "@/components/CatalogManager";
import { fmtDate, fmtNum } from "@/lib/constants";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function TaxLettersPage() {
  return (
    <CatalogManager
      entity="tax-letters"
      title="كتب الضريبة"
      description="ينبه النظام تلقائياً إذا كانت المعاملة تحتاج كتاب ضريبة ولم يُربط"
      columns={[
        { key: "tax_letter_number", label: "رقم الكتاب" },
        { key: "tax_letter_date", label: "التاريخ", render: (i: any) => fmtDate(i.tax_letter_date) },
        { key: "issuing_department", label: "الجهة الصادرة", render: (i: any) => i.issuing_department?.short_name ?? "—" },
        { key: "company", label: "الشركة", render: (i: any) => i.company?.official_name ?? "—" },
        { key: "contract", label: "العقد المرتبط", render: (i: any) => i.contract?.contract_number ?? "⚠️ غير مرتبط" },
        { key: "allowed_quantity", label: "الكمية المسموح بها", render: (i: any) => fmtNum(i.allowed_quantity) },
        { key: "product", label: "المنتج" },
        {
          key: "file_url", label: "الملف",
          render: (i: any) => i.file_url ? <a className="text-teal-700 underline dark:text-teal-400" href={`/api/files/${i.file_url}`} target="_blank">عرض</a> : "—",
        },
      ]}
      formFields={[
        { key: "tax_letter_number", label: "رقم كتاب الضريبة", type: "text", required: true },
        { key: "tax_letter_date", label: "تاريخ الكتاب", type: "date" },
        { key: "issuing_department_id", label: "الجهة الصادرة", type: "select", optionsEntity: "departments", optionLabel: (o: any) => o.official_name },
        { key: "company_id", label: "الشركة", type: "select", optionsEntity: "companies", optionLabel: (o: any) => o.official_name, required: true },
        { key: "contract_id", label: "العقد المرتبط", type: "select", optionsEntity: "contracts", optionLabel: (o: any) => `${o.contract_number} — ${o.product ?? ""}`, hint: "يجب ربط كل كتاب ضريبة بعقد محدد" },
        { key: "allowed_quantity", label: "الكمية المسموح بها", type: "number" },
        { key: "product", label: "المنتج", type: "text" },
        { key: "file_url", label: "ملف الكتاب", type: "file" },
        { key: "notes", label: "ملاحظات", type: "textarea" },
      ]}
    />
  );
}
