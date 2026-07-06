import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, WRITE_ROLES } from "@/lib/auth";
import { handler, ok, fail } from "@/lib/api";
import { getTx } from "@/lib/transactions";
import { syncChecklist } from "@/lib/checklist";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: NextRequest, ctx: Ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  await syncChecklist(Number(id));
  const items = await prisma.transactionChecklist.findMany({
    where: { transaction_id: Number(id) },
    include: { checklist_item: true, checker: { select: { name: true } } },
    orderBy: { checklist_item: { sort_order: "asc" } },
  });
  return ok({ items });
});

// تأشير بند تدقيق منجز / غير منجز
export const POST = handler(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(WRITE_ROLES);
  const { id } = await ctx.params;
  const tx = await getTx(Number(id));
  const { item_id, is_done, notes } = await req.json();

  const item = await prisma.transactionChecklist.findFirst({
    where: { id: Number(item_id), transaction_id: tx.id },
    include: { checklist_item: true },
  });
  if (!item) return fail("بند التدقيق غير موجود", 404);

  const updated = await prisma.transactionChecklist.update({
    where: { id: item.id },
    data: {
      is_done: !!is_done,
      checked_by: is_done ? user.id : null,
      checked_at: is_done ? new Date() : null,
      notes: notes?.toString().trim() || item.notes,
    },
    include: { checklist_item: true, checker: { select: { name: true } } },
  });
  await logAudit({
    userId: user.id, transactionId: tx.id,
    action: `${is_done ? "إنجاز" : "إلغاء إنجاز"} بند التدقيق: ${item.checklist_item.title}`,
  });
  return ok({ item: updated });
});
