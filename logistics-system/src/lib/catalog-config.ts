// إعدادات الدليل العام: كيانات CRUD الموحدة (جهات، شركات، عقود، مسارات…)

export type FieldType = "string" | "number" | "int" | "date" | "boolean" | "json";

export type CatalogEntity = {
  model: string; // اسم موديل Prisma (delegate)
  fields: Record<string, FieldType>;
  required: string[];
  searchFields: string[];
  include?: Record<string, unknown>;
  orderBy?: Record<string, "asc" | "desc">;
  adminOnlyWrite?: boolean;
  label: string;
};

export const CATALOG: Record<string, CatalogEntity> = {
  departments: {
    model: "department",
    label: "الجهات الرسمية",
    fields: {
      short_name: "string", official_name: "string", branch: "string", section: "string",
      governorate: "string", type: "string", notes: "string", is_active: "boolean",
    },
    required: ["short_name", "official_name"],
    searchFields: ["short_name", "official_name", "branch", "governorate"],
    orderBy: { short_name: "asc" },
  },
  companies: {
    model: "company",
    label: "الشركات",
    fields: {
      official_name: "string", short_name: "string", activity_type: "string",
      representative: "string", notes: "string", is_active: "boolean",
    },
    required: ["official_name"],
    searchFields: ["official_name", "short_name", "representative"],
    orderBy: { official_name: "asc" },
  },
  contracts: {
    model: "contract",
    label: "العقود",
    fields: {
      contract_number: "string", contract_date: "date", company_id: "int",
      contracting_department_id: "int", product: "string", total_quantity: "number",
      duration: "string", file_url: "string", notes: "string", is_active: "boolean",
    },
    required: ["contract_number", "company_id"],
    searchFields: ["contract_number", "product"],
    include: { company_rel: true, company: true, tax_letters: true },
    orderBy: { id: "desc" },
  },
  "tax-letters": {
    model: "taxLetter",
    label: "كتب الضريبة",
    fields: {
      tax_letter_number: "string", tax_letter_date: "date", issuing_department_id: "int",
      company_id: "int", contract_id: "int", allowed_quantity: "number",
      product: "string", file_url: "string", notes: "string",
    },
    required: ["tax_letter_number", "company_id"],
    searchFields: ["tax_letter_number", "product"],
    include: { company: true, contract: true, issuing_department: true },
    orderBy: { id: "desc" },
  },
  routes: {
    model: "route",
    label: "المسارات",
    fields: {
      code: "string", from_location: "string", to_location: "string",
      official_description: "string", checkpoints: "string", governorate: "string",
      product: "string", loading_source_id: "int", is_active: "boolean", notes: "string",
    },
    required: ["code", "from_location", "to_location", "official_description"],
    searchFields: ["code", "from_location", "to_location", "official_description"],
    include: { loading_source: true },
    orderBy: { code: "asc" },
  },
  "loading-sources": {
    model: "loadingSource",
    label: "مصادر التجهيز",
    fields: { name: "string", official_name: "string", governorate: "string", is_active: "boolean" },
    required: ["name"],
    searchFields: ["name", "official_name"],
    orderBy: { name: "asc" },
  },
  "transaction-types": {
    model: "transactionType",
    label: "أنواع المعاملات",
    fields: {
      code: "string", name: "string", default_subject: "string", description: "string",
      requires_route: "boolean", requires_drivers: "boolean", requires_contract: "boolean",
      requires_tax_letter: "boolean", requires_cut_forms: "boolean", requires_previous_book: "boolean",
      required_attachment_types: "json", default_template_id: "int", is_active: "boolean",
    },
    required: ["code", "name", "default_subject"],
    searchFields: ["name", "code"],
    adminOnlyWrite: true,
    orderBy: { id: "asc" },
  },
};

export function coerce(type: FieldType, v: unknown): unknown {
  if (v === undefined) return undefined;
  if (v === null || v === "") return type === "boolean" ? undefined : null;
  switch (type) {
    case "string": return String(v);
    case "number": { const n = Number(v); return isNaN(n) ? null : n; }
    case "int": { const n = Number(v); return isNaN(n) ? null : Math.trunc(n); }
    case "date": { const d = new Date(String(v)); return isNaN(d.getTime()) ? null : d; }
    case "boolean": return v === true || v === "true" || v === 1 || v === "1";
    case "json": return typeof v === "string" ? v : JSON.stringify(v);
  }
}
