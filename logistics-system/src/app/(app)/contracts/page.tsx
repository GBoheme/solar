"use client";

import CatalogManager from "@/components/CatalogManager";
import { fmtDate, fmtNum } from "@/lib/constants";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ContractsPage() {
  return (
    <CatalogManager
      entity="contracts"
      title="العقود"
      description="كل كتاب ضريبة يجب أن يرتبط بعقد محدد"
      columns={[
        { key: "contract_number", label: "رقم العقد" },
        { key: "contract_date", label: "التاريخ", render: (i: any) => fmtDate(i.contract_date) },
        { key: "company_rel", label: "الشركة", render: (i: any) => i.company_rel?.official_name ?? "—" },
        { key: "company", label: "الجهة المتعاقدة", render: (i: any) => i.company?.short_name ?? "—" },
        { key: "product", label: "المنتج" },
        { key: "total_quantity", label: "الكمية المتعاقد عليها", render: (i: any) => fmtNum(i.total_quantity) },
        { key: "tax_letters", label: "كتب الضريبة", render: (i: any) => i.tax_letters?.length ?? 0 },
        {
          key: "file_url", label: "الملف",
          render: (i: any) => i.file_url ? <a className="text-teal-700 underline dark:text-teal-400" href={`/api/files/${i.file_url}`} target="_blank">عرض</a> : "—",
        },
      ]}
      formFields={[
        { key: "contract_number", label: "رقم العقد", type: "text", required: true },
        { key: "contract_date", label: "تاريخ العقد", type: "date" },
        { key: "company_id", label: "الشركة", type: "select", optionsEntity: "companies", optionLabel: (o: any) => o.official_name, required: true },
        { key: "contracting_department_id", label: "الجهة المتعاقدة", type: "select", optionsEntity: "departments", optionLabel: (o: any) => o.official_name },
        { key: "product", label: "المنتج", type: "text" },
        { key: "total_quantity", label: "الكمية المتعاقد عليها", type: "number" },
        { key: "duration", label: "مدة العقد", type: "text" },
        { key: "file_url", label: "ملف العقد", type: "file" },
        { key: "notes", label: "ملاحظات", type: "textarea" },
        { key: "is_active", label: "العقد فعال", type: "boolean" },
      ]}
    />
  );
}
