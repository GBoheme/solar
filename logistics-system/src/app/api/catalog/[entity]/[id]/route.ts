import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, WRITE_ROLES, ADMIN_ONLY } from "@/lib/auth";
import { handler, ok, fail } from "@/lib/api";
import { CATALOG, coerce } from "@/lib/catalog-config";
import { logAudit } from "@/lib/audit";

/* eslint-disable @typescript-eslint/no-explicit-any */
function delegate(model: string): any {
  return (prisma as any)[model];
}

async function getCtx(ctx: { params: Promise<{ entity: string; id: string }> }) {
  const { entity, id } = await ctx.params;
  const cfg = CATALOG[entity];
  return { entity, id: Number(id), cfg };
}

export const GET = handler(async (_req: NextRequest, ctx: { params: Promise<{ entity: string; id: string }> }) => {
  await requireUser();
  const { id, cfg } = await getCtx(ctx);
  if (!cfg) return fail("كيان غير معروف", 404);
  const item = await delegate(cfg.model).findUnique({ where: { id }, include: cfg.include });
  if (!item) return fail("السجل غير موجود", 404);
  return ok({ item });
});

export const PATCH = handler(async (req: NextRequest, ctx: { params: Promise<{ entity: string; id: string }> }) => {
  const { entity, id, cfg } = await getCtx(ctx);
  if (!cfg) return fail("كيان غير معروف", 404);
  const user = await requireUser(cfg.adminOnlyWrite ? ADMIN_ONLY : WRITE_ROLES);

  const old = await delegate(cfg.model).findUnique({ where: { id } });
  if (!old) return fail("السجل غير موجود", 404);

  const body = await req.json();
  const data: any = {};
  for (const [field, type] of Object.entries(cfg.fields)) {
    if (!(field in body)) continue;
    const v = coerce(type, body[field]);
    if (v !== undefined) data[field] = v;
    else if (body[field] === null || body[field] === "") data[field] = null;
  }
  const item = await delegate(cfg.model).update({ where: { id }, data, include: cfg.include });
  await logAudit({ userId: user.id, entity, entityId: id, action: `تعديل سجل في ${cfg.label}`, oldValue: old, newValue: data });
  return ok({ item });
});

export const DELETE = handler(async (_req: NextRequest, ctx: { params: Promise<{ entity: string; id: string }> }) => {
  const { entity, id, cfg } = await getCtx(ctx);
  if (!cfg) return fail("كيان غير معروف", 404);
  const user = await requireUser(ADMIN_ONLY);
  try {
    const old = await delegate(cfg.model).delete({ where: { id } });
    await logAudit({ userId: user.id, entity, entityId: id, action: `حذف سجل من ${cfg.label}`, oldValue: old });
    return ok({ deleted: true });
  } catch {
    return fail("لا يمكن حذف هذا السجل لارتباطه بسجلات أخرى — يمكنك إلغاء تفعيله بدلاً من الحذف", 409);
  }
});
