import { NextRequest } from "next/server";
import fs from "fs";
import AdmZip from "adm-zip";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handler, fail } from "@/lib/api";
import { storagePath } from "@/lib/storage";
import { STATUSES, ATTACHMENT_TYPES, fmtDate, fmtNum } from "@/lib/constants";

// تصدير أرشيف المعاملة الكامل (ZIP): ملخص + مرفقات + كتب مولدة
export const GET = handler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const tx = await prisma.transaction.findUnique({
    where: { id: Number(id) },
    include: {
      transaction_type: true, target_department: true, company: true,
      contract: true, tax_letter: true,
      drivers: { orderBy: { sequence_no: "asc" } },
      cut_forms: { include: { loading_source: true } },
      attachments: true,
      generated_documents: true,
      routes: { include: { route: true } },
    },
  });
  if (!tx) return fail("المعاملة غير موجودة", 404);

  const zip = new AdmZip();

  // ملخص نصي
  const summary = [
    `المعاملة: ${tx.internal_number}`,
    `النوع: ${tx.transaction_type.name}`,
    `العنوان: ${tx.subject ?? ""}`,
    `الجهة المخاطبة: ${tx.target_department?.official_name ?? "—"}`,
    `الشركة: ${tx.company?.official_name ?? "—"}`,
    `المنتج: ${tx.product ?? "—"}`,
    `العقد: ${tx.contract?.contract_number ?? "—"}`,
    `كتاب الضريبة: ${tx.tax_letter?.tax_letter_number ?? "—"}`,
    `الحالة: ${STATUSES[tx.status as keyof typeof STATUSES] ?? tx.status}`,
    `المسارات: ${tx.routes.map((r) => r.route.official_description).join("، ") || "—"}`,
    `عدد السائقين: ${tx.drivers.length}`,
    "",
    "استمارات القطع:",
    ...tx.cut_forms.map(
      (cf) => `- ${cf.form_number} | ${fmtDate(cf.form_date)} | ${cf.loading_source?.name ?? "—"} | مقطوعة: ${fmtNum(cf.cut_quantity)} | مجهزة: ${fmtNum(cf.loaded_quantity)} | متبقية: ${fmtNum(cf.remaining_quantity)}`
    ),
    "",
    "جدول السائقين:",
    ...tx.drivers.map((d) => `${d.sequence_no}. ${d.driver_name} | ${d.vehicle_number} | ${d.governorate ?? ""}`),
  ].join("\n");
  zip.addFile("summary.txt", Buffer.from("﻿" + summary, "utf8"));

  const addIfExists = (rel: string | null | undefined, zipDir: string) => {
    if (!rel) return;
    try {
      const full = storagePath(rel);
      if (fs.existsSync(full)) zip.addLocalFile(full, zipDir);
    } catch { /* تخطي الملفات المفقودة */ }
  };

  for (const a of tx.attachments) {
    const typeLabel = (ATTACHMENT_TYPES as Record<string, string>)[a.attachment_type] || a.attachment_type;
    addIfExists(a.file_url, `attachments/${typeLabel}`);
  }
  for (const cf of tx.cut_forms) addIfExists(cf.file_url, "cut-forms");
  for (const d of tx.generated_documents) {
    addIfExists(d.word_url, "generated");
    addIfExists(d.pdf_url, "generated");
  }

  const buf = zip.toBuffer();
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(tx.internal_number + "_archive.zip")}`,
    },
  });
});
