"use client";

import CatalogManager from "@/components/CatalogManager";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function CompaniesPage() {
  return (
    <CatalogManager
      entity="companies"
      title="الشركات"
      description="بيانات الشركات الناقلة والمتعاقدة"
      columns={[
        { key: "official_name", label: "الاسم الرسمي" },
        { key: "short_name", label: "الاسم المختصر" },
        { key: "activity_type", label: "نوع النشاط" },
        { key: "representative", label: "ممثل الشركة" },
        { key: "is_active", label: "فعالة", render: (i: any) => (i.is_active ? "✅" : "❌") },
      ]}
      formFields={[
        { key: "official_name", label: "اسم الشركة الرسمي", type: "text", required: true },
        { key: "short_name", label: "الاسم المختصر", type: "text" },
        { key: "activity_type", label: "نوع النشاط", type: "text", hint: "مثال: نقل عام" },
        { key: "representative", label: "ممثل الشركة", type: "text" },
        { key: "notes", label: "ملاحظات", type: "textarea" },
        { key: "is_active", label: "الشركة فعالة", type: "boolean" },
      ]}
    />
  );
}
