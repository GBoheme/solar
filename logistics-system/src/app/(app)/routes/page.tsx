"use client";

import CatalogManager from "@/components/CatalogManager";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function RoutesPage() {
  return (
    <CatalogManager
      entity="routes"
      title="دليل المسارات"
      description="يمنع كتابة المسار يدوياً في الكتب الحساسة — يُختار المسار من هذا الدليل، ويُطابق مع مصدر التجهيز تلقائياً"
      columns={[
        { key: "code", label: "الكود" },
        { key: "official_description", label: "الصيغة الرسمية للمسار" },
        { key: "loading_source", label: "مصدر التجهيز", render: (i: any) => i.loading_source?.name ?? "—" },
        { key: "checkpoints", label: "السيطرات" },
        { key: "product", label: "المنتج" },
        { key: "governorate", label: "المحافظة" },
        { key: "is_active", label: "فعال", render: (i: any) => (i.is_active ? "✅" : "❌") },
      ]}
      formFields={[
        { key: "code", label: "كود المسار", type: "text", required: true, hint: "مثال: R-DORA-01" },
        { key: "from_location", label: "من", type: "text", required: true },
        { key: "to_location", label: "إلى", type: "text", required: true },
        { key: "official_description", label: "الصيغة الرسمية للمسار", type: "text", required: true, hint: "مثال: من مصفى الدورة إلى معمل المجموعة الوطنية" },
        { key: "loading_source_id", label: "مصدر التجهيز المطابق", type: "select", optionsEntity: "loading-sources", optionLabel: (o: any) => o.name },
        { key: "checkpoints", label: "السيطرات أو النقاط المهمة", type: "textarea" },
        { key: "governorate", label: "المحافظة", type: "text" },
        { key: "product", label: "نوع المنتج", type: "text" },
        { key: "notes", label: "ملاحظات", type: "textarea" },
        { key: "is_active", label: "المسار فعال", type: "boolean" },
      ]}
    />
  );
}
