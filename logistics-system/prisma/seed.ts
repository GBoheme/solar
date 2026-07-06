// البيانات التجريبية — نظام تدقيق وإدارة معاملات النقل اللوجستي
// التشغيل: npm run db:seed

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { buildDefaultTemplate } from "../src/lib/default-template";

const prisma = new PrismaClient();
const STORAGE = path.join(process.cwd(), "storage");

function save(buf: Buffer, subdir: string, name: string): string {
  const dir = path.join(STORAGE, subdir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), buf);
  return path.posix.join(subdir, name);
}

// ملف PDF بسيط كنموذج مرفق تجريبي
function samplePdf(title: string): Buffer {
  const content = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 80 >> stream
BT /F1 18 Tf 60 780 Td (SAMPLE DOCUMENT - ${title.replace(/[()\\]/g, "")}) Tj ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
trailer << /Root 1 0 R /Size 6 >>
%%EOF`;
  return Buffer.from(content, "latin1");
}

async function main() {
  console.log("🌱 بدء زرع البيانات التجريبية…");

  // ============ المستخدمون ============
  const pass = await bcrypt.hash("123456", 10);
  const [admin, entry, reviewer] = await Promise.all([
    prisma.user.upsert({ where: { email: "admin@example.com" }, update: {}, create: { name: "مدير النظام", email: "admin@example.com", password_hash: pass, role: "ADMIN" } }),
    prisma.user.upsert({ where: { email: "entry@example.com" }, update: {}, create: { name: "موظف إدخال البيانات", email: "entry@example.com", password_hash: pass, role: "DATA_ENTRY" } }),
    prisma.user.upsert({ where: { email: "reviewer@example.com" }, update: {}, create: { name: "المدقق المسؤول", email: "reviewer@example.com", password_hash: pass, role: "REVIEWER" } }),
    prisma.user.upsert({ where: { email: "viewer@example.com" }, update: {}, create: { name: "مطالع", email: "viewer@example.com", password_hash: pass, role: "VIEWER" } }),
  ]);

  // ============ مصادر التجهيز ============
  const sourceNames = [
    { name: "مصفى الدورة", official_name: "مصفى الدورة / شركة مصافي الوسط", governorate: "بغداد" },
    { name: "صلاح الدين", official_name: "مصفى صلاح الدين", governorate: "صلاح الدين" },
    { name: "الصمود", official_name: "مصفى الصمود", governorate: "صلاح الدين" },
    { name: "الصينية", official_name: "مستودع الصينية", governorate: "صلاح الدين" },
  ];
  const sources: Record<string, { id: number }> = {};
  for (const s of sourceNames) {
    const existing = await prisma.loadingSource.findFirst({ where: { name: s.name } });
    sources[s.name] = existing ?? (await prisma.loadingSource.create({ data: s }));
  }

  // ============ الجهات الرسمية ============
  const deptData = [
    { short_name: "توزيع المثنى", official_name: "شركة توزيع المنتجات النفطية / فرع المثنى", branch: "المثنى", governorate: "المثنى", type: "فرع" },
    { short_name: "توزيع بغداد", official_name: "شركة توزيع المنتجات النفطية / هيأة توزيع بغداد", branch: "بغداد", governorate: "بغداد", type: "فرع" },
    { short_name: "مصافي الوسط", official_name: "شركة مصافي الوسط / مصفى الدورة", branch: "الدورة", governorate: "بغداد", type: "شركة حكومية" },
    { short_name: "الهيأة العامة للضرائب", official_name: "الهيأة العامة للضرائب / قسم الشركات", governorate: "بغداد", type: "دائرة" },
    { short_name: "شرطة الطاقة", official_name: "مديرية شرطة الطاقة / قسم الحماية", governorate: "بغداد", type: "دائرة" },
    { short_name: "توزيع النجف", official_name: "شركة توزيع المنتجات النفطية / فرع النجف الأشرف", branch: "النجف", governorate: "النجف", type: "فرع" },
  ];
  const depts: Record<string, { id: number }> = {};
  for (const d of deptData) {
    const existing = await prisma.department.findFirst({ where: { short_name: d.short_name } });
    depts[d.short_name] = existing ?? (await prisma.department.create({ data: d }));
  }

  // ============ الشركات ============
  const compData = [
    { official_name: "شركة الخيمة للنقل العام المحدودة", short_name: "الخيمة", activity_type: "نقل عام", representative: "ممثل الشركة المخول" },
    { official_name: "شركة النخيل الذهبي للنقل والتجارة", short_name: "النخيل الذهبي", activity_type: "نقل منتجات نفطية" },
  ];
  const comps: Record<string, { id: number }> = {};
  for (const c of compData) {
    const existing = await prisma.company.findFirst({ where: { official_name: c.official_name } });
    comps[c.short_name!] = existing ?? (await prisma.company.create({ data: c }));
  }

  // ============ المسارات ============
  const routeData = [
    {
      code: "R-DORA-01", from_location: "مصفى الدورة", to_location: "معمل المجموعة الوطنية",
      official_description: "من مصفى الدورة إلى معمل المجموعة الوطنية",
      checkpoints: "سيطرة اليوسفية — سيطرة الإسكندرية", governorate: "بغداد",
      product: "زيت الوقود", loading_source_id: sources["مصفى الدورة"].id,
    },
    {
      code: "R-DORA-02", from_location: "مصفى الدورة", to_location: "فرع المثنى / السماوة",
      official_description: "من مصفى الدورة إلى مستودع السماوة / فرع المثنى",
      checkpoints: "سيطرة الحلة — سيطرة الديوانية — سيطرة الرميثة", governorate: "المثنى",
      product: "زيت الوقود", loading_source_id: sources["مصفى الدورة"].id,
    },
    {
      code: "R-SALAH-01", from_location: "مصفى صلاح الدين", to_location: "معامل الإسفلت / النجف",
      official_description: "من مصفى صلاح الدين إلى معامل الإسفلت في النجف الأشرف",
      checkpoints: "سيطرة سامراء — سيطرة بغداد الشمالية — سيطرة الكوفة", governorate: "النجف",
      product: "الإسفلت المؤكسد", loading_source_id: sources["صلاح الدين"].id,
    },
  ];
  const routes: Record<string, { id: number }> = {};
  for (const r of routeData) {
    routes[r.code] = await prisma.route.upsert({ where: { code: r.code }, update: {}, create: r });
  }

  // ============ العقود وكتب الضريبة ============
  let contract = await prisma.contract.findFirst({ where: { contract_number: "ع/2026/117" } });
  if (!contract) {
    contract = await prisma.contract.create({
      data: {
        contract_number: "ع/2026/117",
        contract_date: new Date("2026-01-15"),
        company_id: comps["الخيمة"].id,
        contracting_department_id: depts["مصافي الوسط"].id,
        product: "زيت الوقود",
        total_quantity: 50000,
        duration: "سنة واحدة",
        file_url: save(samplePdf("Contract 117/2026"), "uploads/seed", "contract_117.pdf"),
        notes: "عقد نقل زيت الوقود من مصفى الدورة",
      },
    });
  }

  let taxLetter = await prisma.taxLetter.findFirst({ where: { tax_letter_number: "ض/4521" } });
  if (!taxLetter) {
    taxLetter = await prisma.taxLetter.create({
      data: {
        tax_letter_number: "ض/4521",
        tax_letter_date: new Date("2026-02-01"),
        issuing_department_id: depts["الهيأة العامة للضرائب"].id,
        company_id: comps["الخيمة"].id,
        contract_id: contract.id,
        allowed_quantity: 50000,
        product: "زيت الوقود",
        file_url: save(samplePdf("Tax Letter 4521"), "uploads/seed", "tax_4521.pdf"),
      },
    });
  }

  // ============ أنواع المعاملات ============
  type TypeSeed = {
    code: string; name: string; default_subject: string; description: string;
    requires_route?: boolean; requires_drivers?: boolean; requires_contract?: boolean;
    requires_tax_letter?: boolean; requires_cut_forms?: boolean; requires_previous_book?: boolean;
    attachments?: string[];
    checklist: { title: string; description?: string; required?: boolean; severity?: string; condition?: string }[];
  };

  const typeSeeds: TypeSeed[] = [
    {
      code: "TASK_FACILITATION", name: "تسهيل مهمة",
      default_subject: "تسهيل مهمة",
      description: "كتاب تسهيل مهمة سواق الشركات الناقلة مع جدول السائقين والمسار",
      requires_route: true, requires_drivers: true, requires_contract: true,
      requires_tax_letter: true, requires_cut_forms: true,
      attachments: ["CONTRACT", "TAX_LETTER", "DRIVERS_TABLE", "CUT_FORM"],
      checklist: [
        { title: "إدخال الجهة المخاطبة", description: "تختار من دليل الجهات حصراً" },
        { title: "اختيار الشركة" },
        { title: "اختيار العقد" },
        { title: "ربط كتاب الضريبة", condition: "has_contract" },
        { title: "إدخال أو استيراد جدول السائقين", description: "العدد يحسب تلقائياً من الجدول" },
        { title: "اختيار المسار من دليل المسارات" },
        { title: "ربط استمارات القطع", description: "كل استمارة مذكورة يجب أن تكون مرفقة" },
        { title: "رفع نسخة جدول السائقين الرسمية" },
        { title: "رفع سجل الاشتغال إن وجد", required: false, severity: "INFO", condition: "has_operation_log" },
        { title: "رفع المرفقات المطلوبة (عقد، ضريبة، استمارات)" },
        { title: "تدقيق عدد السيارات ومطابقته مع الجدول" },
        { title: "تدقيق المسار ومطابقته مع مصدر التجهيز" },
        { title: "توليد كتاب Word ومراجعته" },
        { title: "مراجعة نسخة PDF قبل الاعتماد" },
        { title: "اعتماد المعاملة من المدقق" },
      ],
    },
    {
      code: "ADD_VEHICLES", name: "إضافة سيارات",
      default_subject: "إضافة سيارات",
      description: "إضافة سيارات إلى كتاب تسهيل مهمة سابق",
      requires_drivers: true, requires_previous_book: true,
      attachments: ["DRIVERS_TABLE", "PREVIOUS_BOOK"],
      checklist: [
        { title: "إدخال رقم وتاريخ الكتاب السابق" },
        { title: "إدخال أو استيراد جدول السيارات المضافة" },
        { title: "كشف تكرار أرقام السيارات مع الكتاب السابق" },
        { title: "رفع نسخة الكتاب السابق" },
        { title: "رفع جدول السيارات الجديد" },
        { title: "توليد الكتاب ومراجعته" },
      ],
    },
    {
      code: "ADD_LOADING_AXIS", name: "إضافة محور تحميل",
      default_subject: "إضافة محور تحميل",
      description: "إضافة محور/مصدر تحميل جديد لعقد أو كتاب سابق",
      requires_route: true, requires_previous_book: true, requires_contract: true,
      attachments: ["PREVIOUS_BOOK"],
      checklist: [
        { title: "إدخال الكتاب السابق المرتبط" },
        { title: "اختيار المحور/المسار الجديد من الدليل" },
        { title: "التأكد من مطابقة مصدر التجهيز للمسار الجديد" },
        { title: "ربط العقد المعني" },
        { title: "توليد الكتاب ومراجعته" },
      ],
    },
    {
      code: "CONFIRM_NO_SUPPLY", name: "تأييد عدم تجهيز كمية",
      default_subject: "تأييد عدم تجهيز",
      description: "تأييد عدم تجهيز كميات عن استمارات قطع أو إجازات",
      requires_cut_forms: true,
      attachments: ["CUT_FORM"],
      checklist: [
        { title: "إدخال أرقام استمارات القطع أو الإجازات" },
        { title: "إدخال تواريخ الاستمارات" },
        { title: "إدخال الكميات غير المجهزة" },
        { title: "رفع نسخ الاستمارات" },
        { title: "اختيار الجهة المطلوب مخاطبتها" },
        { title: "اختيار الجهة المطلوب إعلامها (نسخة إلى)", required: false, severity: "WARNING" },
        { title: "توليد كتاب التأييد" },
        { title: "تدقيق المرفقات" },
        { title: "إصدار PDF بعد الاعتماد" },
      ],
    },
    {
      code: "CONFIRM_QUANTITIES", name: "تأييد كميات محملة أو متبقية",
      default_subject: "تأييد كميات",
      description: "تأييد الكميات المحملة والمتبقية عن استمارات القطع",
      requires_cut_forms: true, requires_contract: true,
      attachments: ["CUT_FORM"],
      checklist: [
        { title: "ربط استمارات القطع المعنية" },
        { title: "التحقق من أن المتبقية = المقطوعة − المجهزة" },
        { title: "ربط العقد" },
        { title: "رفع نسخ الاستمارات" },
        { title: "توليد كتاب التأييد ومراجعته" },
      ],
    },
    {
      code: "CONTRACT_TAX", name: "معاملة عقد وكتاب ضريبة",
      default_subject: "إشعار بعقد وكتاب ضريبة",
      description: "معاملة مرتبطة بعقد وكتاب ضريبة (إشعار/تفعيل)",
      requires_contract: true, requires_tax_letter: true,
      attachments: ["CONTRACT", "TAX_LETTER"],
      checklist: [
        { title: "ربط العقد" },
        { title: "ربط كتاب الضريبة ومطابقته مع العقد" },
        { title: "التحقق من الكمية المسموح بها" },
        { title: "رفع نسختي العقد وكتاب الضريبة" },
        { title: "توليد الكتاب ومراجعته" },
      ],
    },
    {
      code: "OPERATION_LOG", name: "معاملة سجل الاشتغال والكشف",
      default_subject: "سجل الاشتغال والكشف",
      description: "معاملة مرتبطة بسجل الاشتغال والكشف الموقعي",
      attachments: ["OPERATION_LOG"],
      checklist: [
        { title: "إدخال بيانات سجل الاشتغال" },
        { title: "ربط السجل باستمارة قطع إن وجدت", required: false, severity: "INFO", condition: "has_cut_forms" },
        { title: "رفع صورة/نسخة السجل مع التواقيع" },
        { title: "توليد الكتاب ومراجعته" },
      ],
    },
    {
      code: "REPLY_PREVIOUS", name: "جواب على كتاب سابق",
      default_subject: "جواب كتابكم",
      description: "معاملة جواب على كتاب وارد سابق",
      requires_previous_book: true,
      attachments: ["PREVIOUS_BOOK"],
      checklist: [
        { title: "إدخال رقم وتاريخ الكتاب السابق" },
        { title: "رفع نسخة الكتاب السابق" },
        { title: "صياغة الجواب ومراجعته" },
        { title: "توليد الكتاب" },
      ],
    },
    {
      code: "CORRECTION", name: "استدراك أو تصحيح",
      default_subject: "استدراك",
      description: "كتاب استدراك أو تصحيح لكتاب صادر سابق",
      requires_previous_book: true,
      attachments: ["PREVIOUS_BOOK"],
      checklist: [
        { title: "تحديد الكتاب الصادر المطلوب تصحيحه" },
        { title: "توثيق الخطأ في سجل الأخطاء" },
        { title: "إدخال البيانات الصحيحة" },
        { title: "توليد كتاب الاستدراك ومراجعته بدقة مضاعفة" },
      ],
    },
    {
      code: "ATTACHMENTS_ONLY", name: "إرفاق جداول ومرفقات",
      default_subject: "إرفاق جداول",
      description: "معاملة إرفاق جداول أو مرفقات فقط لجهة معينة",
      attachments: [],
      checklist: [
        { title: "رفع المرفقات والجداول المطلوبة" },
        { title: "التأكد من وضوح الملفات ووصفها" },
        { title: "توليد كتاب الإرفاق" },
      ],
    },
  ];

  const types: Record<string, { id: number }> = {};
  for (const t of typeSeeds) {
    const created = await prisma.transactionType.upsert({
      where: { code: t.code },
      update: {},
      create: {
        code: t.code,
        name: t.name,
        default_subject: t.default_subject,
        description: t.description,
        requires_route: !!t.requires_route,
        requires_drivers: !!t.requires_drivers,
        requires_contract: !!t.requires_contract,
        requires_tax_letter: !!t.requires_tax_letter,
        requires_cut_forms: !!t.requires_cut_forms,
        requires_previous_book: !!t.requires_previous_book,
        required_attachment_types: JSON.stringify(t.attachments ?? []),
      },
    });
    types[t.code] = created;
    const existingItems = await prisma.checklistItem.count({ where: { transaction_type_id: created.id } });
    if (existingItems === 0) {
      let order = 0;
      for (const item of t.checklist) {
        await prisma.checklistItem.create({
          data: {
            transaction_type_id: created.id,
            title: item.title,
            description: item.description ?? null,
            is_required: item.required !== false,
            severity: item.severity ?? "CRITICAL",
            sort_order: order++,
            condition_key: item.condition ?? null,
          },
        });
      }
    }
  }

  // ============ قوالب Word الافتراضية ============
  const templateSeeds = [
    {
      code: "TASK_FACILITATION",
      name: "قالب تسهيل مهمة",
      body: [
        "نرجو تسهيل مهمة سواق ({{CompanyName}}) الناقلة لمنتج ({{Product}}) وفق العقد المرقم ({{ContractNumber}}) في {{ContractDate}} وكتاب الهيأة العامة للضرائب المرقم ({{TaxLetterNumber}}) في {{TaxLetterDate}}.",
        "وذلك عبر المسار: {{RoutesList}}.",
        "استناداً إلى استمارات القطع المبينة تفاصيلها أدناه:",
      ],
      drivers: true, cutforms: true,
    },
    {
      code: "CONFIRM_NO_SUPPLY",
      name: "قالب تأييد عدم تجهيز",
      body: [
        "نؤيد لكم عدم تجهيز الكميات المذكورة عن استمارات القطع المبينة أدناه العائدة إلى ({{CompanyName}}):",
      ],
      drivers: false, cutforms: true,
    },
    {
      code: "ADD_VEHICLES",
      name: "قالب إضافة سيارات",
      body: [
        "إلحاقاً بكتابنا المرقم ({{PreviousBookNumber}}) في {{PreviousBookDate}}، نرجو إضافة السيارات المدرجة في الجدول أدناه العائدة إلى ({{CompanyName}}).",
      ],
      drivers: true, cutforms: false,
    },
    {
      code: null as string | null,
      name: "قالب كتاب رسمي عام",
      body: [
        "إشارة إلى كتابكم المرقم ({{PreviousBookNumber}}) في {{PreviousBookDate}}.",
        "{{Notes}}",
      ],
      drivers: false, cutforms: false,
    },
  ];

  for (const ts of templateSeeds) {
    const exists = await prisma.template.findFirst({ where: { name: ts.name } });
    if (exists) continue;
    const buf = await buildDefaultTemplate({
      typeName: ts.name,
      bodyLines: ts.body,
      includeDriversTable: ts.drivers,
      includeCutFormsTable: ts.cutforms,
    });
    const file_url = save(buf, "templates", `${ts.code ?? "GENERAL"}_v1.docx`);
    const tpl = await prisma.template.create({
      data: {
        name: ts.name,
        transaction_type_id: ts.code ? types[ts.code].id : null,
        file_url,
        placeholders_json: JSON.stringify(["BookNumber", "BookDate", "TargetDepartment", "BookSubject", "CompanyName", "Product", "ContractNumber", "TaxLetterNumber", "RoutesList", "DriversCount", "DriversStartSeq", "DriversEndSeq", "AttachmentsList", "FinalRequest"]),
      },
    });
    if (ts.code) {
      await prisma.transactionType.update({
        where: { id: types[ts.code].id },
        data: { default_template_id: tpl.id },
      });
    }
  }

  // ============ معاملة تسهيل مهمة نموذجية ============
  const existingTx = await prisma.transaction.findFirst({ where: { internal_number: { startsWith: "TRX-" } } });
  if (!existingTx) {
    const year = new Date().getFullYear();
    const tx = await prisma.transaction.create({
      data: {
        internal_number: `TRX-${year}-0001`,
        transaction_type_id: types["TASK_FACILITATION"].id,
        subject: "تسهيل مهمة",
        target_department_id: depts["توزيع المثنى"].id,
        related_department_id: depts["شرطة الطاقة"].id,
        company_id: comps["الخيمة"].id,
        contract_id: contract.id,
        tax_letter_id: taxLetter.id,
        product: "زيت الوقود",
        mentioned_vehicle_count: 12,
        requested_quantity: 1080,
        final_request: "راجين تسهيل مهمة السواق المدرجة أسماؤهم في الجدول المرفق مع التقدير.",
        priority: "HIGH",
        status: "DRAFT",
        notes: "معاملة نموذجية للتجربة — نقل زيت الوقود من مصفى الدورة إلى السماوة",
        created_by: entry.id,
      },
    });

    await prisma.transactionRoute.create({ data: { transaction_id: tx.id, route_id: routes["R-DORA-02"].id } });

    // جدول سائقين نموذجي (12 سائقاً)
    const names = [
      "علي حسين جبار", "محمد كريم عبد", "حيدر فاضل عباس", "أحمد سعد خلف",
      "كرار ناصر حمزة", "مصطفى جاسم محمد", "حسن علي مطر", "سجاد قاسم فرحان",
      "عباس حاتم صبري", "ليث عدنان كاظم", "مرتضى شاكر جواد", "ذو الفقار رعد ثامر",
    ];
    const governorates = ["بغداد", "بابل", "المثنى", "الديوانية", "النجف", "كربلاء"];
    for (let i = 0; i < names.length; i++) {
      await prisma.driver.create({
        data: {
          transaction_id: tx.id,
          sequence_no: i + 1,
          driver_name: names[i],
          vehicle_number: `${23000 + i * 137} أ`,
          governorate: governorates[i % governorates.length],
          vehicle_type: "شاحنة صهريج",
          tanker_number: `ح-${400 + i}`,
        },
      });
    }

    // استمارات قطع نموذجية
    const cf1 = await prisma.cutForm.create({
      data: {
        transaction_id: tx.id,
        form_number: "ق-2026-3341",
        form_date: new Date("2026-06-20"),
        loading_source_id: sources["مصفى الدورة"].id,
        loading_site: "منصة التحميل رقم 3",
        product: "زيت الوقود",
        cut_quantity: 600,
        loaded_quantity: 480,
        remaining_quantity: 120,
        company_id: comps["الخيمة"].id,
        contract_id: contract.id,
        tax_letter_id: taxLetter.id,
        route_id: routes["R-DORA-02"].id,
        status: "PARTIALLY_LOADED",
        file_url: save(samplePdf("Cut Form 3341"), "uploads/TRX-SEED", "cutform_3341.pdf"),
      },
    });
    await prisma.cutForm.create({
      data: {
        transaction_id: tx.id,
        form_number: "ق-2026-3358",
        form_date: new Date("2026-06-28"),
        loading_source_id: sources["مصفى الدورة"].id,
        loading_site: "منصة التحميل رقم 1",
        product: "زيت الوقود",
        cut_quantity: 480,
        loaded_quantity: 0,
        remaining_quantity: 480,
        company_id: comps["الخيمة"].id,
        contract_id: contract.id,
        tax_letter_id: taxLetter.id,
        route_id: routes["R-DORA-02"].id,
        status: "OPEN",
        file_url: save(samplePdf("Cut Form 3358"), "uploads/TRX-SEED", "cutform_3358.pdf"),
      },
    });

    // سجل اشتغال نموذجي
    await prisma.operationLog.create({
      data: {
        transaction_id: tx.id,
        log_number: "س-2026-88",
        log_date: new Date("2026-06-21"),
        station: "محطة التعبئة — مصفى الدورة",
        quantity: 480,
        loading_source_id: sources["مصفى الدورة"].id,
        responsible_name: "المخول الموقعي",
        has_signatures: true,
        linked_cut_form_id: cf1.id,
        notes: "تم التحميل بإشراف اللجنة الموقعية",
        file_url: save(samplePdf("Operation Log 88"), "uploads/TRX-SEED", "oplog_88.pdf"),
      },
    });

    // مرفقات نموذجية
    const attachments = [
      { attachment_type: "CONTRACT", title: "نسخة العقد ع/2026/117", document_number: "ع/2026/117", document_date: new Date("2026-01-15"), file_url: contract.file_url, is_required: true },
      { attachment_type: "TAX_LETTER", title: "كتاب الضريبة ض/4521", document_number: "ض/4521", document_date: new Date("2026-02-01"), file_url: taxLetter.file_url, is_required: true },
      { attachment_type: "DRIVERS_TABLE", title: "جدول السائقين الموقع", file_url: save(samplePdf("Drivers Table"), "uploads/TRX-SEED", "drivers_table.pdf"), is_required: true },
      { attachment_type: "CUT_FORM", title: "استمارتا القطع 3341 و3358", document_number: "ق-2026-3341", file_url: save(samplePdf("Cut Forms Copies"), "uploads/TRX-SEED", "cutforms_copies.pdf"), is_required: true },
      { attachment_type: "OPERATION_LOG", title: "سجل الاشتغال س-2026-88", document_number: "س-2026-88", file_url: save(samplePdf("Operation Log Copy"), "uploads/TRX-SEED", "oplog_copy.pdf"), is_required: false },
      // مرفق ناقص عمداً لعرض عمل محرك التدقيق
      { attachment_type: "CD_EXCEL", title: "CD جدول السائقين Excel", file_url: null as string | null, is_required: false },
    ];
    for (const a of attachments) {
      await prisma.attachment.create({ data: { transaction_id: tx.id, ...a } });
    }

    // مزامنة قائمة التدقيق للمعاملة النموذجية
    const items = await prisma.checklistItem.findMany({ where: { transaction_type_id: types["TASK_FACILITATION"].id } });
    for (const item of items) {
      await prisma.transactionChecklist.create({
        data: { transaction_id: tx.id, checklist_item_id: item.id },
      });
    }

    await prisma.auditLog.create({
      data: { user_id: entry.id, transaction_id: tx.id, action: "إنشاء معاملة نموذجية (بيانات تجريبية)" },
    });

    // نموذج في سجل الأخطاء
    await prisma.errorRegister.create({
      data: {
        transaction_id: tx.id,
        error_type: "خطأ عدد السيارات",
        error_description: "ذُكر في مسودة سابقة عدد (13) سيارة بينما الجدول يحتوي (12)",
        cause: "نسخ بيانات من معاملة قديمة",
        impact: "كان سيصدر الكتاب بعدد خاطئ",
        prevention_method: "اعتماد العد التلقائي من جدول السائقين ومنع الكتابة اليدوية",
        created_by: reviewer.id,
      },
    });
  }

  console.log("✅ تم زرع البيانات التجريبية بنجاح");
  console.log("   المستخدمون: admin@example.com / entry@example.com / reviewer@example.com / viewer@example.com");
  console.log("   كلمة المرور للجميع: 123456");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
