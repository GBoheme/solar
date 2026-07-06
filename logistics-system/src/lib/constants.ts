// الثوابت والتسميات العربية الموحدة في النظام

export const ROLES = {
  ADMIN: "مدير النظام",
  DATA_ENTRY: "مدخل بيانات",
  REVIEWER: "مدقق",
  VIEWER: "مطالع",
} as const;
export type Role = keyof typeof ROLES;

export const STATUSES = {
  DRAFT: "مسودة",
  MISSING_DATA: "ناقصة بيانات",
  MISSING_ATTACHMENTS: "ناقصة مرفقات",
  AWAITING_REVIEW: "بانتظار التدقيق",
  REVIEWED: "مدققة",
  READY_TO_ISSUE: "جاهزة للإصدار",
  ISSUED_WORD: "صادرة Word",
  ISSUED_PDF: "صادرة PDF",
  SENT: "مرسلة",
  ARCHIVED: "مؤرشفة",
  RETURNED_FOR_CORRECTION: "معادة للتصحيح",
  CANCELLED: "ملغاة",
} as const;
export type Status = keyof typeof STATUSES;

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
  MISSING_DATA: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  MISSING_ATTACHMENTS: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  AWAITING_REVIEW: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
  REVIEWED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200",
  READY_TO_ISSUE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  ISSUED_WORD: "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200",
  ISSUED_PDF: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
  SENT: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200",
  ARCHIVED: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  RETURNED_FOR_CORRECTION: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
};

export const PRIORITIES = {
  LOW: "منخفضة",
  NORMAL: "اعتيادية",
  HIGH: "مهمة",
  URGENT: "عاجلة",
} as const;

export const ATTACHMENT_TYPES = {
  CONTRACT: "عقد",
  TAX_LETTER: "كتاب ضريبة",
  TRANSFER_BOOK: "كتاب تحويل",
  VEHICLES_TABLE: "جدول سيارات",
  DRIVERS_TABLE: "جدول سائقين",
  CUT_FORM: "استمارة قطع",
  OPERATION_LOG: "سجل اشتغال",
  LICENSE: "إجازة",
  PREVIOUS_BOOK: "كتاب سابق",
  PHOTOS: "صور",
  CD_EXCEL: "CD أو ملف Excel",
  OTHER: "مستند آخر",
} as const;
export type AttachmentType = keyof typeof ATTACHMENT_TYPES;

export const CUT_FORM_STATUSES = {
  OPEN: "مفتوحة",
  PARTIALLY_LOADED: "مجهزة جزئياً",
  CLOSED: "مغلقة",
  EXPIRED: "منتهية",
} as const;

export const SEVERITIES = {
  CRITICAL: "خطأ حرج",
  WARNING: "تحذير",
  INFO: "معلومة",
} as const;

export const DOC_KINDS = {
  DRAFT: "مسودة",
  FINAL: "نهائي",
  CORRECTION: "تصحيح",
} as const;

// الحالات التي تعتبر فيها المعاملة "نهائية" (لا تعديل إلا بنسخة تصحيحية)
export const FINAL_STATUSES = ["ISSUED_PDF", "SENT", "ARCHIVED"];

// الحالات المفتوحة
export const OPEN_STATUSES = [
  "DRAFT", "MISSING_DATA", "MISSING_ATTACHMENTS", "AWAITING_REVIEW",
  "REVIEWED", "READY_TO_ISSUE", "ISSUED_WORD", "RETURNED_FOR_CORRECTION",
];

export function fmtDate(d?: string | Date | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ar-IQ-u-nu-latn", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function fmtDateTime(d?: string | Date | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("ar-IQ-u-nu-latn", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function fmtNum(n?: number | null): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US");
}
