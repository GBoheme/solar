import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, WRITE_ROLES } from "@/lib/auth";
import { handler, ok, fail } from "@/lib/api";
import { getTx, guardEditable, demoteAfterEdit } from "@/lib/transactions";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

async function loadDriver(id: number) {
  const d = await prisma.driver.findUnique({ where: { id } });
  if (!d) return null;
  const tx = await getTx(d.transaction_id);
  guardEditable(tx);
  return { d, tx };
}

export const PATCH = handler(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(WRITE_ROLES);
  const { id } = await ctx.params;
  const loaded = await loadDriver(Number(id));
  if (!loaded) return fail("الصف غير موجود", 404);
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ("sequence_no" in body) data.sequence_no = Number(body.sequence_no);
  for (const f of ["driver_name", "vehicle_number", "governorate", "vehicle_type", "tanker_number", "gps_info", "notes"]) {
    if (f in body) data[f] = body[f]?.toString().trim() || null;
  }
  if (data.driver_name === null || data.vehicle_number === null) return fail("اسم السائق ورقم السيارة إلزاميان");
  const item = await prisma.driver.update({ where: { id: Number(id) }, data });
  await demoteAfterEdit(loaded.tx.id);
  await logAudit({ userId: user.id, transactionId: loaded.tx.id, action: `تعديل صف سائق (تسلسل ${item.sequence_no})` });
  return ok({ item });
});

export const DELETE = handler(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(WRITE_ROLES);
  const { id } = await ctx.params;
  const loaded = await loadDriver(Number(id));
  if (!loaded) return fail("الصف غير موجود", 404);
  await prisma.driver.delete({ where: { id: Number(id) } });
  await demoteAfterEdit(loaded.tx.id);
  await logAudit({ userId: user.id, transactionId: loaded.tx.id, action: `حذف صف سائق (تسلسل ${loaded.d.sequence_no})` });
  return ok({ deleted: true });
});
