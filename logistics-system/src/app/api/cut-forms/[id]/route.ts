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
  const cf = await prisma.cutForm.findUnique({ where: { id: Number(id) } });
  if (!cf) return fail("الاستمارة غير موجودة", 404);
  const tx = cf.transaction_id ? await getTx(cf.transaction_id) : null;
  if (tx) guardEditable(tx);

  const b = await req.json();
  const data: Record<string, unknown> = {};
  for (const f of ["form_number", "loading_site", "product", "notes", "file_url", "status"]) {
    if (f in b) data[f] = b[f]?.toString().trim() || null;
  }
  if ("form_date" in b) data.form_date = parseDate(b.form_date);
  for (const f of ["loading_source_id", "contract_id", "tax_letter_id", "route_id", "company_id"]) {
    if (f in b) data[f] = parseIntOrNull(b[f]);
  }

  const cut = "cut_quantity" in b ? parseNum(b.cut_quantity) : cf.cut_quantity;
  const loaded = "loaded_quantity" in b ? (parseNum(b.loaded_quantity) ?? 0) : (cf.loaded_quantity ?? 0);
  if (cut !== null && loaded > cut) {
    return fail(`الكمية المجهزة (${loaded}) لا يمكن أن تكون أكبر من الكمية المقطوعة (${cut})`);
  }
  if ("cut_quantity" in b) data.cut_quantity = cut;
  if ("loaded_quantity" in b) data.loaded_quantity = loaded;
  // الكمية المتبقية تحسب تلقائياً دائماً
  data.remaining_quantity = cut !== null ? cut - loaded : null;

  const item = await prisma.cutForm.update({
    where: { id: Number(id) },
    data,
    include: { loading_source: true, route: true },
  });
  if (tx) {
    await demoteAfterEdit(tx.id);
    await logAudit({ userId: user.id, transactionId: tx.id, action: `تعديل استمارة القطع (${item.form_number})` });
  }
  return ok({ item });
});

export const DELETE = handler(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(WRITE_ROLES);
  const { id } = await ctx.params;
  const cf = await prisma.cutForm.findUnique({ where: { id: Number(id) } });
  if (!cf) return fail("الاستمارة غير موجودة", 404);
  const tx = cf.transaction_id ? await getTx(cf.transaction_id) : null;
  if (tx) guardEditable(tx);
  await prisma.cutForm.delete({ where: { id: Number(id) } });
  if (tx) {
    await demoteAfterEdit(tx.id);
    await logAudit({ userId: user.id, transactionId: tx.id, action: `حذف استمارة القطع (${cf.form_number})` });
  }
  return ok({ deleted: true });
});
