"use client";

import CatalogManager from "@/components/CatalogManager";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function TransactionTypesPage() {
  return (
    <CatalogManager
      entity="transaction-types"
      title="أنواع المعاملات"
      description="كل نوع يحدد المتطلبات الإلزامية وقواعد التحقق والمرفقات المتوقعة"
      columns={[
        { key: "code", label: "الكود" },
        { key: "name", label: "النوع" },
        { key: "default_subject", label: "عنوان الكتاب الافتراضي" },
        {
          key: "requires", label: "المتطلبات",
          render: (i: any) => [
            i.requires_route && "مسار",
            i.requires_drivers && "سائقون",
            i.requires_contract && "عقد",
            i.requires_tax_letter && "ضريبة",
            i.requires_cut_forms && "استمارات قطع",
            i.requires_previous_book && "كتاب سابق",
          ].filter(Boolean).join("، ") || "—",
        },
        { key: "is_active", label: "فعال", render: (i: any) => (i.is_active ? "✅" : "❌") },
      ]}
      formFields={[
        { key: "code", label: "الكود", type: "text", required: true },
        { key: "name", label: "اسم النوع", type: "text", required: true },
        { key: "default_subject", label: "عنوان الكتاب الافتراضي", type: "text", required: true },
        { key: "description", label: "الوصف", type: "textarea" },
        { key: "requires_route", label: "يتطلب مساراً", type: "boolean" },
        { key: "requires_drivers", label: "يتطلب جدول سائقين", type: "boolean" },
        { key: "requires_contract", label: "يتطلب عقداً", type: "boolean" },
        { key: "requires_tax_letter", label: "يتطلب كتاب ضريبة", type: "boolean" },
        { key: "requires_cut_forms", label: "يتطلب استمارات قطع", type: "boolean" },
        { key: "requires_previous_book", label: "يتطلب كتاباً سابقاً", type: "boolean" },
        { key: "is_active", label: "النوع فعال", type: "boolean" },
      ]}
    />
  );
}
