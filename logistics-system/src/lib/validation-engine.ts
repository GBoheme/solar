import { prisma } from "./db";

// ==================== محرك التدقيق الذكي ====================
// يفحص المعاملة بالكامل ويعيد قائمة أخطاء حرجة وتحذيرات،
// ويحدد هل يمكن توليد Word وهل يمكن إصدار PDF النهائي.

export type ValidationIssue = {
  field_name: string;
  error_type: string;
  message: string;
  severity: "CRITICAL" | "WARNING";
  /**
   * بصمة دقيقة للخطأ: نوع الخطأ + الحقل + مرجع الكيان المحدد
   * (رقم الاستمارة، رقم السيارة…) — التجاوز يرتبط بها حصراً حتى لا
   * يخفي تجاوز واحد أخطاء مستقبلية غير مرتبطة به.
   */
  fingerprint: string;
};

export type ValidationResult = {
  errors: ValidationIssue[]; // الحرجة
  warnings: ValidationIssue[]; // التحذيرات
  overridden: { error_type: string; field_name: string; message: string; override_reason: string }[];
  canGenerateWord: boolean;
  canIssuePdf: boolean;
  completion: number; // نسبة الاكتمال 0-100
  checklistDone: number;
  checklistTotal: number;
};

const TX_INCLUDE = {
  transaction_type: true,
  target_department: true,
  related_department: true,
  company: true,
  contract: true,
  tax_letter: { include: { contract: true } },
  routes: { include: { route: { include: { loading_source: true } } } },
  drivers: { orderBy: { sequence_no: "asc" as const } },
  cut_forms: { include: { loading_source: true, route: true } },
  attachments: true,
  checklist: { include: { checklist_item: true } },
  operation_logs: true,
};

export async function validateTransaction(transactionId: number): Promise<ValidationResult> {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: TX_INCLUDE,
  });
  if (!tx) throw new Error("المعاملة غير موجودة");

  const issues: ValidationIssue[] = [];
  const add = (
    field_name: string,
    error_type: string,
    message: string,
    severity: "CRITICAL" | "WARNING" = "CRITICAL",
    ref?: string | number
  ) =>
    issues.push({
      field_name,
      error_type,
      message,
      severity,
      fingerprint: `${error_type}|${field_name}|${ref ?? ""}`,
    });

  const type = tx.transaction_type;

  // ---------- 1) أخطاء العنوان ----------
  if (!tx.subject || !tx.subject.trim()) {
    add("subject", "SUBJECT_EMPTY", "عنوان الكتاب فارغ");
  } else if (type.default_subject && tx.subject.trim() !== type.default_subject.trim() && !tx.subject_confirmed) {
    add(
      "subject",
      "SUBJECT_CUSTOM_UNCONFIRMED",
      `العنوان مخصص ولا يطابق العنوان الافتراضي لنوع المعاملة (${type.default_subject}) ولم يتم تأكيده`,
      "WARNING"
    );
  }

  // ---------- 2) أخطاء الجهة ----------
  if (!tx.target_department_id) {
    add("target_department", "DEPARTMENT_MISSING", "الجهة المخاطبة غير مختارة من دليل الجهات");
  } else if (tx.target_department && !tx.target_department.is_active) {
    add("target_department", "DEPARTMENT_INACTIVE", `الجهة المخاطبة (${tx.target_department.short_name}) غير فعالة في الدليل`);
  }
  if (tx.related_department && !tx.related_department.is_active) {
    add("related_department", "DEPARTMENT_INACTIVE", `الجهة صاحبة العلاقة (${tx.related_department.short_name}) غير فعالة`, "WARNING");
  }

  // ---------- 3) أخطاء الشركة ----------
  if (type.requires_contract || type.requires_drivers || type.requires_cut_forms) {
    if (!tx.company_id) add("company", "COMPANY_MISSING", "لم يتم اختيار الشركة صاحبة العلاقة");
    else if (tx.company && !tx.company.is_active) add("company", "COMPANY_INACTIVE", `الشركة (${tx.company.official_name}) غير فعالة`, "WARNING");
  }

  // ---------- 4) أخطاء المسارات ----------
  const routes = tx.routes.map((r) => r.route);
  if (type.requires_route && routes.length === 0) {
    add("routes", "ROUTE_MISSING", "المعاملة تحتاج مساراً ولم يتم اختيار أي مسار من دليل المسارات");
  }
  for (const r of routes) {
    if (!r.is_active) add("routes", "ROUTE_INACTIVE", `المسار (${r.official_description}) غير فعال في الدليل`, "CRITICAL", r.code);
    if (tx.product && r.product && r.product !== tx.product) {
      add("routes", "ROUTE_PRODUCT_MISMATCH", `منتج المسار (${r.product}) لا يطابق منتج المعاملة (${tx.product})`, "WARNING", r.code);
    }
  }

  // ---------- 5) أخطاء السائقين والسيارات ----------
  const drivers = tx.drivers;
  if (type.requires_drivers && drivers.length === 0) {
    add("drivers", "DRIVERS_EMPTY", "جدول السائقين فارغ — أدخل أو استورد جدول السائقين");
  }
  if (drivers.length > 0) {
    // تكرار أرقام السيارات
    const seen = new Map<string, number[]>();
    for (const d of drivers) {
      const key = d.vehicle_number.replace(/\s+/g, "");
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(d.sequence_no);
    }
    for (const [veh, seqs] of seen) {
      if (seqs.length > 1) {
        add("drivers", "VEHICLE_DUPLICATE", `رقم السيارة (${veh}) مكرر في التسلسلات: ${seqs.join("، ")}`, "CRITICAL", veh);
      }
    }
    // تكرار التسلسل
    const seqSet = new Map<number, number>();
    for (const d of drivers) seqSet.set(d.sequence_no, (seqSet.get(d.sequence_no) || 0) + 1);
    for (const [seq, count] of seqSet) {
      if (count > 1) add("drivers", "SEQUENCE_DUPLICATE", `التسلسل (${seq}) مكرر ${count} مرات في جدول السائقين`, "CRITICAL", seq);
    }
    // التسلسل الناقص
    const seqs = [...seqSet.keys()].sort((a, b) => a - b);
    const min = seqs[0], max = seqs[seqs.length - 1];
    const missing: number[] = [];
    for (let i = min; i <= max; i++) if (!seqSet.has(i)) missing.push(i);
    if (missing.length > 0) {
      add(
        "drivers", "SEQUENCE_GAP",
        `تسلسلات ناقصة في جدول السائقين: ${missing.slice(0, 20).join("، ")}${missing.length > 20 ? " …" : ""} (المدى من ${min} إلى ${max})`
      );
    }
    // مطابقة العدد المذكور يدوياً
    if (tx.mentioned_vehicle_count !== null && tx.mentioned_vehicle_count !== undefined) {
      if (tx.mentioned_vehicle_count !== drivers.length) {
        add(
          "drivers", "VEHICLE_COUNT_MISMATCH",
          `العدد المذكور في وصف المعاملة (${tx.mentioned_vehicle_count}) لا يطابق عدد صفوف جدول السائقين (${drivers.length}) — العدد يحسب تلقائياً من الجدول`
        );
      }
    }
  }

  // ---------- 6) أخطاء استمارات القطع ----------
  const cutForms = tx.cut_forms;
  if (type.requires_cut_forms && cutForms.length === 0) {
    add("cut_forms", "CUT_FORMS_MISSING", "المعاملة تحتاج استمارات قطع ولم يتم ربط أي استمارة");
  }
  const formNums = new Map<string, number>();
  for (const cf of cutForms) formNums.set(cf.form_number, (formNums.get(cf.form_number) || 0) + 1);
  for (const [num, count] of formNums) {
    if (count > 1) add("cut_forms", "CUT_FORM_DUPLICATE", `رقم استمارة القطع (${num}) مكرر ${count} مرات في هذه المعاملة`, "CRITICAL", num);
  }
  for (const cf of cutForms) {
    const label = `استمارة القطع (${cf.form_number})`;
    if (!cf.form_date) add("cut_forms", "CUT_FORM_NO_DATE", `${label}: التاريخ مفقود`, "CRITICAL", cf.form_number);
    if (cf.cut_quantity === null || cf.cut_quantity === undefined) {
      add("cut_forms", "CUT_FORM_NO_QUANTITY", `${label}: الكمية المقطوعة غير مدخلة`, "CRITICAL", cf.form_number);
    } else {
      const loaded = cf.loaded_quantity ?? 0;
      if (loaded > cf.cut_quantity) {
        add("cut_forms", "LOADED_GT_CUT", `${label}: الكمية المجهزة (${loaded}) أكبر من الكمية المقطوعة (${cf.cut_quantity})`, "CRITICAL", cf.form_number);
      }
      const expectedRemaining = cf.cut_quantity - loaded;
      if (cf.remaining_quantity !== null && cf.remaining_quantity !== undefined && Math.abs(cf.remaining_quantity - expectedRemaining) > 0.001) {
        add("cut_forms", "REMAINING_MISMATCH", `${label}: الكمية المتبقية المسجلة (${cf.remaining_quantity}) لا تساوي المقطوعة − المجهزة (${expectedRemaining})`, "CRITICAL", cf.form_number);
      }
      if ((cf.remaining_quantity ?? expectedRemaining) < 0) {
        add("cut_forms", "REMAINING_NEGATIVE", `${label}: الكمية المتبقية سالبة`, "CRITICAL", cf.form_number);
      }
    }
    if (!cf.loading_source_id) add("cut_forms", "CUT_FORM_NO_SOURCE", `${label}: بلا مصدر تجهيز`, "CRITICAL", cf.form_number);
    if (cf.status === "CLOSED" || cf.status === "EXPIRED") {
      add("cut_forms", "CUT_FORM_CLOSED", `${label}: الاستمارة ${cf.status === "CLOSED" ? "مغلقة" : "منتهية"} — استخدامها في معاملة جديدة يتطلب تأكيداً`, "WARNING", cf.form_number);
    }
    // استمارة مستخدمة في معاملة أخرى سابقاً
    const usedElsewhere = await prisma.cutForm.findFirst({
      where: {
        form_number: cf.form_number,
        id: { not: cf.id },
        transaction_id: { not: null, notIn: [tx.id] },
      },
      include: { transaction: { select: { internal_number: true } } },
    });
    if (usedElsewhere?.transaction) {
      add("cut_forms", "CUT_FORM_REUSED", `${label}: مستخدمة سابقاً في المعاملة (${usedElsewhere.transaction.internal_number})`, "WARNING", cf.form_number);
    }
    // الاستمارة مذكورة لكنها غير مرفقة/موثقة
    const hasFile = !!cf.file_url;
    const hasAttachment = tx.attachments.some(
      (a) => a.attachment_type === "CUT_FORM" && (a.document_number === cf.form_number || !a.document_number) && a.file_url
    );
    if (!hasFile && !hasAttachment) {
      add("cut_forms", "CUT_FORM_NOT_ATTACHED", `${label}: مذكورة في المعاملة لكن نسختها غير مرفقة ولا موثقة`, "CRITICAL", cf.form_number);
    }
    // مطابقة مصدر التجهيز مع المسار
    if (cf.loading_source_id && cf.route_id) {
      const route = routes.find((r) => r.id === cf.route_id) || cf.route;
      if (route) {
        const fullRoute = await prisma.route.findUnique({ where: { id: route.id }, include: { loading_source: true } });
        if (fullRoute?.loading_source_id && fullRoute.loading_source_id !== cf.loading_source_id) {
          add(
            "routes", "SOURCE_ROUTE_MISMATCH",
            `${label}: مصدر التجهيز لا يطابق بداية المسار (${fullRoute.official_description})`
          );
        }
      }
    }
  }
  // مطابقة مصدر تجهيز الاستمارات مع مسارات المعاملة عموماً
  if (routes.length > 0 && cutForms.length > 0) {
    const routeSources = new Set(routes.map((r) => r.loading_source_id).filter(Boolean));
    if (routeSources.size > 0) {
      for (const cf of cutForms) {
        if (cf.loading_source_id && !routeSources.has(cf.loading_source_id)) {
          add(
            "routes", "SOURCE_ROUTE_MISMATCH",
            `مصدر تجهيز استمارة القطع (${cf.form_number}) — ${cf.loading_source?.name ?? ""} — لا يطابق أياً من مسارات المعاملة`,
            "WARNING"
          );
        }
      }
    }
  }

  // ---------- 7) أخطاء العقود وكتب الضريبة ----------
  if (type.requires_contract && !tx.contract_id) {
    add("contract", "CONTRACT_MISSING", "المعاملة تحتاج عقداً ولم يتم ربط أي عقد");
  }
  if (type.requires_tax_letter && !tx.tax_letter_id) {
    add("tax_letter", "TAX_LETTER_MISSING", "المعاملة تحتاج كتاب ضريبة ولم يتم ربطه");
  }
  if (tx.tax_letter && tx.contract_id && tx.tax_letter.contract_id && tx.tax_letter.contract_id !== tx.contract_id) {
    add("tax_letter", "TAX_CONTRACT_MISMATCH", `كتاب الضريبة (${tx.tax_letter.tax_letter_number}) مرتبط بعقد مختلف عن عقد المعاملة`);
  }
  if (tx.tax_letter?.allowed_quantity != null) {
    if (tx.requested_quantity != null && tx.requested_quantity > tx.tax_letter.allowed_quantity) {
      add(
        "tax_letter", "QUANTITY_EXCEEDS_ALLOWED",
        `الكمية المطلوبة (${tx.requested_quantity}) أكبر من الكمية المسموح بها في كتاب الضريبة (${tx.tax_letter.allowed_quantity})`
      );
    }
    const totalCut = cutForms.reduce((s, cf) => s + (cf.cut_quantity ?? 0), 0);
    if (totalCut > tx.tax_letter.allowed_quantity) {
      add(
        "tax_letter", "CUT_EXCEEDS_ALLOWED",
        `مجموع الكميات المقطوعة (${totalCut}) يتجاوز الكمية المسموح بها في كتاب الضريبة (${tx.tax_letter.allowed_quantity})`,
        "WARNING"
      );
    }
  }
  if (type.requires_previous_book && !tx.previous_book_number) {
    add("previous_book", "PREVIOUS_BOOK_MISSING", "المعاملة جواب على كتاب سابق ولم يتم إدخال رقم الكتاب السابق وتاريخه");
  }
  if (tx.previous_book_number && !tx.previous_book_date) {
    add("previous_book", "PREVIOUS_BOOK_NO_DATE", "رقم الكتاب السابق مدخل بدون تاريخه", "WARNING");
  }

  // ---------- 8) أخطاء المرفقات ----------
  const requiredTypes: string[] = type.required_attachment_types
    ? JSON.parse(type.required_attachment_types)
    : [];
  const { ATTACHMENT_TYPES } = await import("./constants");
  for (const reqType of requiredTypes) {
    const found = tx.attachments.find((a) => a.attachment_type === reqType && a.file_url);
    if (!found) {
      const label = (ATTACHMENT_TYPES as Record<string, string>)[reqType] ?? reqType;
      add("attachments", "REQUIRED_ATTACHMENT_MISSING", `مرفق إلزامي ناقص: ${label}`, "CRITICAL", reqType);
    }
  }
  for (const a of tx.attachments) {
    if (!a.file_url) {
      add("attachments", "ATTACHMENT_NO_FILE", `المرفق (${a.title}) مذكور في المعاملة لكن ملفه غير مرفوع`, a.is_required ? "CRITICAL" : "WARNING", a.id);
    }
    if (a.file_url && a.is_required && !a.is_verified) {
      add("attachments", "ATTACHMENT_NOT_VERIFIED", `المرفق الإلزامي (${a.title}) لم يتم تدقيقه بعد`, "WARNING", a.id);
    }
    if (!a.title.trim()) {
      add("attachments", "ATTACHMENT_NO_TITLE", "يوجد مرفق بلا وصف أو عنوان", "WARNING", a.id);
    }
  }
  // جدول سائقين موجود لكن مرفق الجدول غير مرفوع
  if (drivers.length > 0 && requiredTypes.includes("DRIVERS_TABLE")) {
    const hasDriversAttachment = tx.attachments.some((a) => a.attachment_type === "DRIVERS_TABLE" && a.file_url);
    if (!hasDriversAttachment) {
      add("attachments", "DRIVERS_TABLE_NOT_UPLOADED", "جدول السائقين مدخل في النظام لكن نسخته الرسمية غير مرفوعة كمرفق");
    }
  }

  // ---------- التحذيرات المتجاوزة ----------
  const existingOverrides = await prisma.validationError.findMany({
    where: { transaction_id: tx.id, override_reason: { not: null } },
  });
  // التجاوز يطابق بالبصمة الدقيقة حصراً (توافق خلفي: سجلات قديمة بلا بصمة تطابق بالنوع+الحقل)
  const overrideKey = (o: { fingerprint: string | null; error_type: string; field_name: string }) =>
    o.fingerprint ?? `${o.error_type}|${o.field_name}|`;
  const overriddenKeys = new Set(existingOverrides.map(overrideKey));
  const activeIssues = issues.filter(
    (i) => !(i.severity === "WARNING" && overriddenKeys.has(i.fingerprint))
  );
  const overridden = existingOverrides
    .filter((o) => issues.some((i) => i.fingerprint === overrideKey(o)))
    .map((o) => ({ error_type: o.error_type, field_name: o.field_name, message: o.message, override_reason: o.override_reason! }));

  // ---------- حفظ نتائج الفحص ----------
  await prisma.validationError.deleteMany({
    where: { transaction_id: tx.id, override_reason: null },
  });
  if (activeIssues.length > 0) {
    await prisma.validationError.createMany({
      data: activeIssues.map((i) => ({
        transaction_id: tx.id,
        field_name: i.field_name,
        error_type: i.error_type,
        message: i.message,
        severity: i.severity,
        fingerprint: i.fingerprint,
      })),
    });
  }

  // ---------- قائمة التدقيق ----------
  const checklistTotal = tx.checklist.filter((c) => c.checklist_item.is_required).length;
  const checklistDone = tx.checklist.filter((c) => c.checklist_item.is_required && c.is_done).length;

  const errors = activeIssues.filter((i) => i.severity === "CRITICAL");
  const warnings = activeIssues.filter((i) => i.severity === "WARNING");

  // ---------- قرارات الإصدار ----------
  const canGenerateWord = errors.length === 0;
  const canIssuePdf =
    errors.length === 0 &&
    warnings.length === 0 && // التحذيرات إما محلولة أو متجاوزة بصلاحية مدير
    checklistTotal > 0 &&
    checklistDone === checklistTotal;

  // ---------- نسبة الاكتمال ----------
  const fieldChecks = [
    !!tx.subject,
    !!tx.target_department_id,
    !type.requires_contract || !!tx.contract_id,
    !type.requires_tax_letter || !!tx.tax_letter_id,
    !type.requires_route || routes.length > 0,
    !type.requires_drivers || drivers.length > 0,
    !type.requires_cut_forms || cutForms.length > 0,
    requiredTypes.every((rt) => tx.attachments.some((a) => a.attachment_type === rt && a.file_url)),
  ];
  const fieldScore = fieldChecks.filter(Boolean).length / fieldChecks.length;
  const checklistScore = checklistTotal > 0 ? checklistDone / checklistTotal : 0;
  const errorScore = errors.length === 0 ? 1 : Math.max(0, 1 - errors.length / 10);
  const completion = Math.round((fieldScore * 0.4 + checklistScore * 0.4 + errorScore * 0.2) * 100);

  return { errors, warnings, overridden, canGenerateWord, canIssuePdf, completion, checklistDone, checklistTotal };
}

/** تحديث حالة المعاملة تلقائياً بناء على نتيجة الفحص (للحالات غير النهائية) */
export async function autoUpdateStatus(transactionId: number, result: ValidationResult) {
  const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!tx) return;
  const FINAL = ["ISSUED_WORD", "ISSUED_PDF", "SENT", "ARCHIVED", "CANCELLED", "RETURNED_FOR_CORRECTION", "REVIEWED", "READY_TO_ISSUE"];
  if (FINAL.includes(tx.status)) return;

  let status = tx.status;
  const hasAttachmentErrors = result.errors.some((e) => e.field_name === "attachments");
  const hasDataErrors = result.errors.some((e) => e.field_name !== "attachments");
  if (hasDataErrors) status = "MISSING_DATA";
  else if (hasAttachmentErrors) status = "MISSING_ATTACHMENTS";
  else status = "AWAITING_REVIEW";

  if (status !== tx.status) {
    await prisma.transaction.update({ where: { id: transactionId }, data: { status } });
  }
}
