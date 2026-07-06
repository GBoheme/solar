import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, ADMIN_ONLY } from "@/lib/auth";
import { handler, ok, fail, parseIntOrNull } from "@/lib/api";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(ADMIN_ONLY);
  const { id } = await ctx.params;
  const b = await req.json();
  const data: Record<string, unknown> = {};
  if ("name" in b) data.name = String(b.name).trim();
  if ("is_active" in b) data.is_active = !!b.is_active;
  if ("transaction_type_id" in b) data.transaction_type_id = parseIntOrNull(b.transaction_type_id);
  const item = await prisma.template.update({ where: { id: Number(id) }, data });
  await logAudit({ userId: user.id, action: `تعديل القالب: ${item.name}` });
  return ok({ item });
});

export const DELETE = handler(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(ADMIN_ONLY);
  const { id } = await ctx.params;
  try {
    const item = await prisma.template.delete({ where: { id: Number(id) } });
    await logAudit({ userId: user.id, action: `حذف القالب: ${item.name}` });
    return ok({ deleted: true });
  } catch {
    return fail("لا يمكن حذف قالب استخدم في توليد كتب — يمكن إلغاء تفعيله", 409);
  }
});
