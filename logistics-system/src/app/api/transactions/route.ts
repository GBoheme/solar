import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, WRITE_ROLES } from "@/lib/auth";
import { handler, ok, fail, parseDate, parseIntOrNull } from "@/lib/api";
import { nextInternalNumber } from "@/lib/transactions";
import { syncChecklist } from "@/lib/checklist";
import { logAudit } from "@/lib/audit";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const GET = handler(async (req: NextRequest) => {
  await requireUser();
  const sp = req.nextUrl.searchParams;
  const where: any = {};
  if (sp.get("status")) where.status = sp.get("status");
  if (sp.get("type")) where.transaction_type_id = Number(sp.get("type"));
  if (sp.get("department")) where.target_department_id = Number(sp.get("department"));
  if (sp.get("company")) where.company_id = Number(sp.get("company"));
  const q = sp.get("q")?.trim();
  if (q) {
    where.OR = [
      { internal_number: { contains: q } },
      { subject: { contains: q } },
      { book_number: { contains: q } },
      { previous_book_number: { contains: q } },
      { notes: { contains: q } },
    ];
  }
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = 25;
  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        transaction_type: true,
        target_department: true,
        company: true,
        creator: { select: { name: true } },
        _count: { select: { drivers: true, cut_forms: true, attachments: true, validation_errors: true } },
      },
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);
  return ok({ items, total, page, pageSize });
});

export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser(WRITE_ROLES);
  const body = await req.json();

  const typeId = parseIntOrNull(body.transaction_type_id);
  if (!typeId) return fail("اختر نوع المعاملة");
  const type = await prisma.transactionType.findUnique({ where: { id: typeId } });
  if (!type || !type.is_active) return fail("نوع المعاملة غير موجود أو غير فعال");

  const internal_number = await nextInternalNumber();
  const tx = await prisma.transaction.create({
    data: {
      internal_number,
      transaction_type_id: typeId,
      subject: body.subject?.trim() || type.default_subject,
      subject_confirmed: !!body.subject_confirmed,
      target_department_id: parseIntOrNull(body.target_department_id),
      related_department_id: parseIntOrNull(body.related_department_id),
      company_id: parseIntOrNull(body.company_id),
      contract_id: parseIntOrNull(body.contract_id),
      tax_letter_id: parseIntOrNull(body.tax_letter_id),
      product: body.product?.trim() || null,
      previous_book_number: body.previous_book_number?.trim() || null,
      previous_book_date: parseDate(body.previous_book_date),
      mentioned_vehicle_count: parseIntOrNull(body.mentioned_vehicle_count),
      requested_quantity: body.requested_quantity != null && body.requested_quantity !== "" ? Number(body.requested_quantity) : null,
      final_request: body.final_request?.trim() || null,
      priority: body.priority || "NORMAL",
      deadline: parseDate(body.deadline),
      notes: body.notes?.trim() || null,
      created_by: user.id,
    },
  });

  await syncChecklist(tx.id);
  await logAudit({
    userId: user.id, transactionId: tx.id,
    action: `إنشاء معاملة جديدة (${type.name})`,
    newValue: { internal_number },
  });
  return ok({ item: tx }, 201);
});
