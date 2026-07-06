import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, REVIEW_ROLES } from "@/lib/auth";
import { handler, ok, fail } from "@/lib/api";
import { getTx, nextInternalNumber } from "@/lib/transactions";
import { syncChecklist } from "@/lib/checklist";
import { logAudit } from "@/lib/audit";

// فتح نسخة تصحيحية من معاملة نهائية (استدراك / تصحيح)
export const POST = handler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(REVIEW_ROLES);
  const { id } = await ctx.params;
  const src = await getTx(Number(id));

  if (!["ISSUED_PDF", "SENT", "ARCHIVED", "ISSUED_WORD"].includes(src.status)) {
    return fail("النسخة التصحيحية تفتح فقط من معاملة صادرة أو مؤرشفة", 409);
  }

  const full = await prisma.transaction.findUnique({
    where: { id: src.id },
    include: { drivers: true, cut_forms: true, routes: true, attachments: true },
  });
  if (!full) return fail("المعاملة غير موجودة", 404);

  const internal_number = await nextInternalNumber();
  const copy = await prisma.transaction.create({
    data: {
      internal_number,
      transaction_type_id: full.transaction_type_id,
      subject: full.subject,
      subject_confirmed: full.subject_confirmed,
      target_department_id: full.target_department_id,
      related_department_id: full.related_department_id,
      company_id: full.company_id,
      contract_id: full.contract_id,
      tax_letter_id: full.tax_letter_id,
      product: full.product,
      previous_book_number: full.book_number || full.previous_book_number,
      previous_book_date: full.book_date || full.previous_book_date,
      mentioned_vehicle_count: full.mentioned_vehicle_count,
      requested_quantity: full.requested_quantity,
      final_request: full.final_request,
      priority: full.priority,
      notes: `نسخة تصحيحية من المعاملة ${full.internal_number}`,
      correction_of_id: full.id,
      created_by: user.id,
      status: "DRAFT",
      drivers: {
        create: full.drivers.map((d) => ({
          sequence_no: d.sequence_no, driver_name: d.driver_name, vehicle_number: d.vehicle_number,
          governorate: d.governorate, vehicle_type: d.vehicle_type, tanker_number: d.tanker_number,
          gps_info: d.gps_info, notes: d.notes,
        })),
      },
      routes: { create: full.routes.map((r) => ({ route_id: r.route_id })) },
      attachments: {
        create: full.attachments.map((a) => ({
          attachment_type: a.attachment_type, title: a.title, document_number: a.document_number,
          document_date: a.document_date, file_url: a.file_url, is_required: a.is_required,
          is_verified: false, notes: a.notes,
        })),
      },
    },
  });

  // نسخ استمارات القطع (تبقى مربوطة أيضاً بالمعاملة الأصلية للتاريخ)
  for (const cf of full.cut_forms) {
    await prisma.cutForm.create({
      data: {
        transaction_id: copy.id,
        form_number: cf.form_number, form_date: cf.form_date,
        loading_source_id: cf.loading_source_id, loading_site: cf.loading_site,
        product: cf.product, cut_quantity: cf.cut_quantity, loaded_quantity: cf.loaded_quantity,
        remaining_quantity: cf.remaining_quantity, company_id: cf.company_id,
        contract_id: cf.contract_id, tax_letter_id: cf.tax_letter_id, route_id: cf.route_id,
        status: cf.status, file_url: cf.file_url, notes: cf.notes,
      },
    });
  }

  await syncChecklist(copy.id);
  await logAudit({
    userId: user.id, transactionId: copy.id,
    action: `فتح نسخة تصحيحية من المعاملة ${full.internal_number}`,
  });
  return ok({ item: copy }, 201);
});
