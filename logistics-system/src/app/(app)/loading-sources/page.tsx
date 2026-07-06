"use client";

import CatalogManager from "@/components/CatalogManager";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function LoadingSourcesPage() {
  return (
    <CatalogManager
      entity="loading-sources"
      title="مصادر التجهيز"
      description="مصفى الدورة، صلاح الدين، الصمود، الصينية… مع إمكانية الإضافة والتعديل"
      columns={[
        { key: "name", label: "الاسم" },
        { key: "official_name", label: "الاسم الرسمي" },
        { key: "governorate", label: "المحافظة" },
        { key: "is_active", label: "فعال", render: (i: any) => (i.is_active ? "✅" : "❌") },
      ]}
      formFields={[
        { key: "name", label: "الاسم", type: "text", required: true },
        { key: "official_name", label: "الاسم الرسمي", type: "text" },
        { key: "governorate", label: "المحافظة", type: "text" },
        { key: "is_active", label: "فعال", type: "boolean" },
      ]}
    />
  );
}
