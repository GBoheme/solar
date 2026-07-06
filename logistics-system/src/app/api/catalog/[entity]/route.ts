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

export const GET = handler(async (req: NextRequest, ctx: { params: Promise<{ entity: string }> }) => {
  await requireUser();
  const { entity } = await ctx.params;
  const cfg = CATALOG[entity];
  if (!cfg) return fail("كيان غير معروف", 404);

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const activeOnly = req.nextUrl.searchParams.get("active") === "1";
  const where: any = {};
  if (q && cfg.searchFields.length) {
    where.OR = cfg.searchFields.map((f) => ({ [f]: { contains: q } }));
  }
  if (activeOnly && cfg.fields.is_active) where.is_active = true;

  const items = await delegate(cfg.model).findMany({
    where,
    include: cfg.include,
    orderBy: cfg.orderBy,
    take: 500,
  });
  return ok({ items });
});

export const POST = handler(async (req: NextRequest, ctx: { params: Promise<{ entity: string }> }) => {
  const { entity } = await ctx.params;
  const cfg = CATALOG[entity];
  if (!cfg) return fail("كيان غير معروف", 404);
  const user = await requireUser(cfg.adminOnlyWrite ? ADMIN_ONLY : WRITE_ROLES);

  const body = await req.json();
  const data: any = {};
  for (const [field, type] of Object.entries(cfg.fields)) {
    const v = coerce(type, body[field]);
    if (v !== undefined) data[field] = v;
  }
  for (const r of cfg.required) {
    if (data[r] === undefined || data[r] === null || data[r] === "") {
      return fail(`الحقل الإلزامي ناقص: ${r}`);
    }
  }
  const item = await delegate(cfg.model).create({ data, include: cfg.include });
  await logAudit({ userId: user.id, entity, entityId: item.id, action: `إضافة سجل في ${cfg.label}`, newValue: data });
  return ok({ item }, 201);
});
