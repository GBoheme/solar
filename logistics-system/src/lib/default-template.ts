import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, HeadingLevel,
} from "docx";

// ==================== مولد قوالب Word الافتراضية ====================
// ينشئ قالب DOCX رسمياً يحتوي placeholders بصيغة {{Field}} يملؤها docxtemplater.
// يمكن للمستخدم لاحقاً رفع قوالبه الخاصة من شاشة القوالب.

const FONT = "Noto Naskh Arabic";

function p(text: string, opts: { bold?: boolean; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; underline?: boolean } = {}) {
  return new Paragraph({
    bidirectional: true,
    alignment: opts.align ?? AlignmentType.BOTH,
    spacing: { after: 120 },
    children: [
      new TextRun({
        text,
        rightToLeft: true,
        font: FONT,
        bold: opts.bold ?? false,
        size: opts.size ?? 26, // 13pt
        underline: opts.underline ? {} : undefined,
      }),
    ],
  });
}

function cell(text: string, opts: { bold?: boolean; width?: number } = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    children: [
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, rightToLeft: true, font: FONT, bold: opts.bold, size: 22 })],
      }),
    ],
  });
}

/** بناء قالب كتاب رسمي DOCX (يعاد كـ Buffer) */
export async function buildDefaultTemplate(opts: {
  typeName: string;
  bodyLines: string[]; // نص متن الكتاب مع placeholders
  includeDriversTable?: boolean;
  includeCutFormsTable?: boolean;
}): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  // الترويسة
  children.push(p("بسم الله الرحمن الرحيم", { align: AlignmentType.CENTER, bold: true, size: 24 }));
  children.push(p("جمهورية العراق", { align: AlignmentType.CENTER, bold: true, size: 24 }));
  children.push(
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({ text: "العدد: {{BookNumber}}", rightToLeft: true, font: FONT, size: 24 }),
        new TextRun({ text: "التاريخ: {{BookDate}}", rightToLeft: true, font: FONT, size: 24, break: 1 }),
      ],
    })
  );
  children.push(p("", {}));
  children.push(p("إلى / {{TargetDepartment}}", { bold: true, align: AlignmentType.CENTER, size: 28 }));
  children.push(p("م / {{BookSubject}}", { bold: true, align: AlignmentType.CENTER, size: 28, underline: true }));
  children.push(p("", {}));
  children.push(p("تحية طيبة …", { align: AlignmentType.CENTER }));

  for (const line of opts.bodyLines) children.push(p(line));

  // جدول استمارات القطع (حلقة docxtemplater على صف الجدول)
  if (opts.includeCutFormsTable) {
    children.push(p("تفاصيل استمارات القطع:", { bold: true }));
    children.push(
      new Table({
        visuallyRightToLeft: true,
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              cell("رقم الاستمارة", { bold: true }),
              cell("التاريخ", { bold: true }),
              cell("مصدر التجهيز", { bold: true }),
              cell("الكمية المقطوعة", { bold: true }),
              cell("الكمية المجهزة", { bold: true }),
              cell("الكمية المتبقية", { bold: true }),
            ],
          }),
          new TableRow({
            children: [
              cell("{{#CutForms}}{{number}}"),
              cell("{{date}}"),
              cell("{{source}}"),
              cell("{{cut}}"),
              cell("{{loaded}}"),
              cell("{{remaining}}{{/CutForms}}"),
            ],
          }),
        ],
      })
    );
    children.push(p("", {}));
  }

  // جدول السائقين
  if (opts.includeDriversTable) {
    children.push(
      p(
        "علماً أن عدد السيارات ({{DriversCount}}) سيارة، ويبدأ جدول السائقين بالتسلسل ({{DriversStartSeq}}) وينتهي بالتسلسل ({{DriversEndSeq}}) وكما مبين في الجدول المرفق.",
        {}
      )
    );
    children.push(p("جدول السائقين والمركبات:", { bold: true }));
    children.push(
      new Table({
        visuallyRightToLeft: true,
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              cell("ت", { bold: true, width: 8 }),
              cell("اسم السائق", { bold: true, width: 30 }),
              cell("رقم السيارة", { bold: true, width: 18 }),
              cell("المحافظة", { bold: true, width: 14 }),
              cell("نوع المركبة", { bold: true, width: 15 }),
              cell("ملاحظات", { bold: true, width: 15 }),
            ],
          }),
          new TableRow({
            children: [
              cell("{{#Drivers}}{{seq}}"),
              cell("{{name}}"),
              cell("{{vehicle}}"),
              cell("{{governorate}}"),
              cell("{{vtype}}"),
              cell("{{notes}}{{/Drivers}}"),
            ],
          }),
        ],
      })
    );
    children.push(p("", {}));
  }

  // المرفقات
  children.push(p("المرفقات:", { bold: true }));
  children.push(p("{{#Attachments}}{{idx}}. {{title}} {{number}}", {}));
  children.push(p("{{/Attachments}}", {}));

  children.push(p("{{FinalRequest}}", {}));
  children.push(p("", {}));
  children.push(p("مع التقدير", { align: AlignmentType.LEFT, bold: true }));

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FONT, size: 26, rightToLeft: true } },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 1000, right: 1000 } },
        },
        children,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
