import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { prisma } from "./db";
import { fmtDate, fmtNum, ATTACHMENT_TYPES } from "./constants";
import { storagePath } from "./storage";

// ==================== بناء بيانات الكتاب وتوليد Word ====================

export type BookPayload = {
  BookNumber: string;
  BookDate: string;
  TargetDepartment: string;
  RelatedDepartment: string;
  BookSubject: string;
  CompanyName: string;
  Product: string;
  PreviousBookNumber: string;
  PreviousBookDate: string;
  ContractNumber: string;
  ContractDate: string;
  TaxLetterNumber: string;
  TaxLetterDate: string;
  RouteName: string;
  RoutesList: string;
  CutFormsList: string;
  DriversStartSeq: string;
  DriversEndSeq: string;
  DriversCount: string;
  AttachmentsList: string;
  FinalRequest: string;
  InternalNumber: string;
  Notes: string;
  // مصفوفات للحلقات داخل القالب
  Drivers: { seq: number; name: string; vehicle: string; governorate: string; vtype: string; notes: string }[];
  CutForms: { number: string; date: string; source: string; cut: string; loaded: string; remaining: string }[];
  Attachments: { idx: number; title: string; type: string; number: string }[];
  Routes: { code: string; description: string }[];
  HasDrivers: boolean;
  HasCutForms: boolean;
  HasAttachments: boolean;
};

export async function buildBookPayload(transactionId: number): Promise<BookPayload> {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      transaction_type: true,
      target_department: true,
      related_department: true,
      company: true,
      contract: true,
      tax_letter: true,
      routes: { include: { route: true } },
      drivers: { orderBy: { sequence_no: "asc" } },
      cut_forms: { include: { loading_source: true } },
      attachments: { orderBy: { id: "asc" } },
    },
  });
  if (!tx) throw new Error("المعاملة غير موجودة");

  const drivers = tx.drivers;
  const routes = tx.routes.map((r) => r.route);
  const seqs = drivers.map((d) => d.sequence_no);

  const attachmentsWithFiles = tx.attachments.filter((a) => a.file_url || a.title);

  return {
    InternalNumber: tx.internal_number,
    BookNumber: tx.book_number || "     /     ",
    BookDate: tx.book_date ? fmtDate(tx.book_date) : "    /    /        ",
    TargetDepartment: tx.target_department?.official_name || "",
    RelatedDepartment: tx.related_department?.official_name || "",
    BookSubject: tx.subject || tx.transaction_type.default_subject,
    CompanyName: tx.company?.official_name || "",
    Product: tx.product || "",
    PreviousBookNumber: tx.previous_book_number || "",
    PreviousBookDate: tx.previous_book_date ? fmtDate(tx.previous_book_date) : "",
    ContractNumber: tx.contract?.contract_number || "",
    ContractDate: tx.contract?.contract_date ? fmtDate(tx.contract.contract_date) : "",
    TaxLetterNumber: tx.tax_letter?.tax_letter_number || "",
    TaxLetterDate: tx.tax_letter?.tax_letter_date ? fmtDate(tx.tax_letter.tax_letter_date) : "",
    RouteName: routes[0]?.official_description || "",
    RoutesList: routes.map((r) => r.official_description).join("، "),
    CutFormsList: tx.cut_forms
      .map(
        (cf) =>
          `الاستمارة المرقمة (${cf.form_number}) في ${cf.form_date ? fmtDate(cf.form_date) : "—"} — الكمية المقطوعة (${fmtNum(cf.cut_quantity)})`
      )
      .join("؛ "),
    DriversStartSeq: seqs.length ? String(Math.min(...seqs)) : "—",
    DriversEndSeq: seqs.length ? String(Math.max(...seqs)) : "—",
    DriversCount: String(drivers.length),
    AttachmentsList: attachmentsWithFiles
      .map((a, i) => `${i + 1}. ${a.title}${a.document_number ? ` (${a.document_number})` : ""}`)
      .join("\n"),
    FinalRequest: tx.final_request || "للتفضل بالاطلاع واتخاذ ما يلزم مع التقدير.",
    Notes: tx.notes || "",
    Drivers: drivers.map((d) => ({
      seq: d.sequence_no,
      name: d.driver_name,
      vehicle: d.vehicle_number,
      governorate: d.governorate || "",
      vtype: d.vehicle_type || "",
      notes: d.notes || "",
    })),
    CutForms: tx.cut_forms.map((cf) => ({
      number: cf.form_number,
      date: cf.form_date ? fmtDate(cf.form_date) : "—",
      source: cf.loading_source?.name || "—",
      cut: fmtNum(cf.cut_quantity),
      loaded: fmtNum(cf.loaded_quantity),
      remaining: fmtNum(cf.remaining_quantity ?? ((cf.cut_quantity ?? 0) - (cf.loaded_quantity ?? 0))),
    })),
    Attachments: attachmentsWithFiles.map((a, i) => ({
      idx: i + 1,
      title: a.title,
      type: (ATTACHMENT_TYPES as Record<string, string>)[a.attachment_type] || a.attachment_type,
      number: a.document_number || "",
    })),
    Routes: routes.map((r) => ({ code: r.code, description: r.official_description })),
    HasDrivers: drivers.length > 0,
    HasCutForms: tx.cut_forms.length > 0,
    HasAttachments: attachmentsWithFiles.length > 0,
  };
}

/** توليد ملف Word من قالب DOCX باستخدام placeholders بصيغة {{Field}} */
export function renderDocx(templateFileRelative: string, payload: BookPayload): Buffer {
  const templatePath = storagePath(templateFileRelative);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`ملف القالب غير موجود: ${path.basename(templateFileRelative)}`);
  }
  const content = fs.readFileSync(templatePath);
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
    nullGetter: () => "",
  });
  doc.render(payload as unknown as Record<string, unknown>);
  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
}
