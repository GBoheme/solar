import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, WRITE_ROLES } from "@/lib/auth";
import { handler, ok, fail, parseDate, parseIntOrNull, parseNum } from "@/lib/api";
import { getTx, guardEditable, demoteAfterEdit } from "@/lib/transactions";
import { syncChecklist } from "@/lib/checklist";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: NextRequest, ctx: Ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  const items = await prisma.operationLog.findMany({
    where: { transaction_id: Number(id) },
    include: { loading_source: true, linked_cut_form: true },
    orderBy: { id: "asc" },
  });
  return ok({ items });
});

export const POST = handler(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(WRITE_ROLES);
  const { id } = await ctx.params;
  const tx = await getTx(Number(id));
  guardEditable(tx);

  const b = await req.json();
  if (!b.log_number?.trim()) return fail("رقم السجل أو الاستمارة إلزامي");

  const item = await prisma.operationLog.create({
    data: {
      transaction_id: tx.id,
      log_number: b.log_number.trim(),
      log_date: parseDate(b.log_date),
      station: b.station?.trim() || null,
      quantity: parseNum(b.quantity),
      loading_source_id: parseIntOrNull(b.loading_source_id),
      responsible_name: b.responsible_name?.trim() || null,
      has_signatures: !!b.has_signatures,
      notes: b.notes?.trim() || null,
      linked_cut_form_id: parseIntOrNull(b.linked_cut_form_id),
      file_url: b.file_url || null,
    },
    include: { loading_source: true, linked_cut_form: true },
  });

  await demoteAfterEdit(tx.id);
  await syncChecklist(tx.id);
  await logAudit({ userId: user.id, transactionId: tx.id, action: `إضافة سجل اشتغال (${item.log_number})` });
  return ok({ item }, 201);
});
