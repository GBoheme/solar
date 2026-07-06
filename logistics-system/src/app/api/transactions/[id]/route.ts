import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, WRITE_ROLES, ADMIN_ONLY } from "@/lib/auth";
import { handler, ok, fail, parseDate, parseIntOrNull, parseNum } from "@/lib/api";
import { TX_FULL_INCLUDE, getTx, guardEditable, demoteAfterEdit } from "@/lib/transactions";
import { syncChecklist } from "@/lib/checklist";
import { logAudit } from "@/lib/audit";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: NextRequest, ctx: Ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  const tx = await prisma.transaction.findUnique({
    where: { id: Number(id) },
    include: TX_FULL_INCLUDE,
  });
  if (!tx) return fail("المعاملة غير موجودة", 404);
  return ok({ item: tx });
});

export const PATCH = handler(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(WRITE_ROLES);
  const { id } = await ctx.params;
  const tx = await getTx(Number(id));
  guardEditable(tx);

  const body = await req.json();
  const data: any = {};
  const strFields = ["subject", "product", "previous_book_number", "final_request", "notes", "book_number", "priority"];
  for (const f of strFields) if (f in body) data[f] = body[f]?.toString().trim() || null;
  const intFields = ["target_department_id", "related_department_id", "company_id", "contract_id", "tax_letter_id", "mentioned_vehicle_count"];
  for (const f of intFields) if (f in body) data[f] = parseIntOrNull(body[f]);
  const dateFields = ["previous_book_date", "deadline", "book_date"];
  for (const f of dateFields) if (f in body) data[f] = parseDate(body[f]);
  if ("requested_quantity" in body) data.requested_quantity = parseNum(body.requested_quantity);
  if ("subject_confirmed" in body) data.subject_confirmed = !!body.subject_confirmed;
  if (data.priority && !["LOW", "NORMAL", "HIGH", "URGENT"].includes(data.priority)) delete data.priority;

  const updated = await prisma.transaction.update({ where: { id: tx.id }, data });
  await demoteAfterEdit(tx.id);
  await syncChecklist(tx.id);
  await logAudit({
    userId: user.id, transactionId: tx.id,
    action: "تعديل بيانات المعاملة",
    oldValue: Object.fromEntries(Object.keys(data).map((k) => [k, (tx as any)[k]])),
    newValue: data,
  });
  return ok({ item: updated });
});

export const DELETE = handler(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(ADMIN_ONLY);
  const { id } = await ctx.params;
  const tx = await getTx(Number(id));
  if (tx.status !== "DRAFT" && tx.status !== "CANCELLED") {
    return fail("لا يمكن حذف معاملة غير مسودة — يمكن إلغاؤها بدلاً من ذلك", 409);
  }
  await prisma.transaction.delete({ where: { id: tx.id } });
  await logAudit({ userId: user.id, action: `حذف المعاملة ${tx.internal_number}`, oldValue: tx });
  return ok({ deleted: true });
});
