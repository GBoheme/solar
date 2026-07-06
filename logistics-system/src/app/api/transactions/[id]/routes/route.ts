import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, WRITE_ROLES } from "@/lib/auth";
import { handler, ok, fail } from "@/lib/api";
import { getTx, guardEditable, demoteAfterEdit } from "@/lib/transactions";
import { syncChecklist } from "@/lib/checklist";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// ربط مسار من دليل المسارات — لا كتابة يدوية للمسارات في الكتب الحساسة
export const POST = handler(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(WRITE_ROLES);
  const { id } = await ctx.params;
  const tx = await getTx(Number(id));
  guardEditable(tx);

  const { route_id } = await req.json();
  const route = await prisma.route.findUnique({ where: { id: Number(route_id) } });
  if (!route) return fail("المسار غير موجود في الدليل — يجب اختيار المسار من دليل المسارات", 404);
  if (!route.is_active) return fail(`المسار (${route.official_description}) غير فعال في الدليل`, 409);

  const exists = await prisma.transactionRoute.findFirst({
    where: { transaction_id: tx.id, route_id: route.id },
  });
  if (exists) return fail("المسار مرتبط بالمعاملة مسبقاً", 409);

  const item = await prisma.transactionRoute.create({
    data: { transaction_id: tx.id, route_id: route.id },
    include: { route: { include: { loading_source: true } } },
  });
  await demoteAfterEdit(tx.id);
  await syncChecklist(tx.id);
  await logAudit({ userId: user.id, transactionId: tx.id, action: `ربط المسار: ${route.official_description}` });
  return ok({ item }, 201);
});

export const DELETE = handler(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(WRITE_ROLES);
  const { id } = await ctx.params;
  const tx = await getTx(Number(id));
  guardEditable(tx);
  const { route_id } = await req.json();
  const link = await prisma.transactionRoute.findFirst({
    where: { transaction_id: tx.id, route_id: Number(route_id) },
    include: { route: true },
  });
  if (!link) return fail("المسار غير مرتبط بالمعاملة", 404);
  await prisma.transactionRoute.delete({ where: { id: link.id } });
  await demoteAfterEdit(tx.id);
  await logAudit({ userId: user.id, transactionId: tx.id, action: `فك ربط المسار: ${link.route.official_description}` });
  return ok({ deleted: true });
});
