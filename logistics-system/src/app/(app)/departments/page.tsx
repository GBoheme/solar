"use client";

import CatalogManager from "@/components/CatalogManager";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function DepartmentsPage() {
  return (
    <CatalogManager
      entity="departments"
      title="دليل الجهات الرسمية"
      description="لا تُكتب الجهة يدوياً في الحقول الحساسة — تُختار حصراً من هذا الدليل"
      columns={[
        { key: "short_name", label: "الاسم المختصر" },
        { key: "official_name", label: "الصيغة الرسمية الكاملة" },
        { key: "branch", label: "الفرع" },
        { key: "governorate", label: "المحافظة" },
        { key: "type", label: "النوع" },
        { key: "is_active", label: "فعالة", render: (i: any) => (i.is_active ? "✅" : "❌") },
      ]}
      formFields={[
        { key: "short_name", label: "الاسم المختصر", type: "text", required: true, hint: "مثال: توزيع المثنى" },
        { key: "official_name", label: "الصيغة الرسمية الكاملة", type: "text", required: true, hint: "مثال: شركة توزيع المنتجات النفطية / فرع المثنى" },
        { key: "section", label: "القسم", type: "text" },
        { key: "branch", label: "الفرع", type: "text" },
        { key: "governorate", label: "المحافظة", type: "text" },
        {
          key: "type", label: "نوع الجهة", type: "select",
          options: [
            { value: "وزارة", label: "وزارة" },
            { value: "شركة حكومية", label: "شركة حكومية" },
            { value: "فرع", label: "فرع" },
            { value: "دائرة", label: "دائرة" },
            { value: "أخرى", label: "أخرى" },
          ],
        },
        { key: "notes", label: "ملاحظات", type: "textarea" },
        { key: "is_active", label: "الجهة فعالة", type: "boolean" },
      ]}
    />
  );
}
