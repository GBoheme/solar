import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, WRITE_ROLES } from "@/lib/auth";
import { handler, ok, fail, parseDate, parseIntOrNull, parseNum } from "@/lib/api";
import { getTx, guardEditable, demoteAfterEdit } from "@/lib/transactions";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(WRITE_ROLES);
  const { id } = await ctx.params;
  const log = await prisma.operationLog.findUnique({ where: { id: Number(id) } });
  if (!log) return fail("السجل غير موجود", 404);
  const tx = log.transaction_id ? await getTx(log.transaction_id) : null;
  if (tx) guardEditable(tx);

  const b = await req.json();
  const data: Record<string, unknown> = {};
  for (const f of ["log_number", "station", "responsible_name", "notes", "file_url"]) {
    if (f in b) data[f] = b[f]?.toString().trim() || null;
  }
  if ("log_date" in b) data.log_date = parseDate(b.log_date);
  if ("quantity" in b) data.quantity = parseNum(b.quantity);
  if ("loading_source_id" in b) data.loading_source_id = parseIntOrNull(b.loading_source_id);
  if ("linked_cut_form_id" in b) data.linked_cut_form_id = parseIntOrNull(b.linked_cut_form_id);
  if ("has_signatures" in b) data.has_signatures = !!b.has_signatures;

  const item = await prisma.operationLog.update({ where: { id: Number(id) }, data });
  if (tx) {
    await demoteAfterEdit(tx.id);
    await logAudit({ userId: user.id, transactionId: tx.id, action: `تعديل سجل اشتغال (${item.log_number})` });
  }
  return ok({ item });
});

export const DELETE = handler(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(WRITE_ROLES);
  const { id } = await ctx.params;
  const log = await prisma.operationLog.findUnique({ where: { id: Number(id) } });
  if (!log) return fail("السجل غير موجود", 404);
  const tx = log.transaction_id ? await getTx(log.transaction_id) : null;
  if (tx) guardEditable(tx);
  await prisma.operationLog.delete({ where: { id: Number(id) } });
  if (tx) {
    await demoteAfterEdit(tx.id);
    await logAudit({ userId: user.id, transactionId: tx.id, action: `حذف سجل اشتغال (${log.log_number})` });
  }
  return ok({ deleted: true });
});
