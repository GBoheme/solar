import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireUser, ADMIN_ONLY } from "@/lib/auth";
import { handler, ok, fail } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { logAudit } from "@/lib/audit";

export const PATCH = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireUser(ADMIN_ONLY);
  const { id } = await ctx.params;
  const b = await req.json();
  const data: Record<string, unknown> = {};
  if ("name" in b) data.name = String(b.name).trim();
  if ("role" in b) {
    if (!(b.role in ROLES)) return fail("دور غير معروف");
    data.role = b.role;
  }
  if ("is_active" in b) data.is_active = !!b.is_active;
  if (b.password) {
    if (String(b.password).length < 6) return fail("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    data.password_hash = await bcrypt.hash(String(b.password), 10);
  }
  const item = await prisma.user.update({
    where: { id: Number(id) },
    data,
    select: { id: true, name: true, email: true, role: true, is_active: true },
  });
  await logAudit({ userId: admin.id, action: `تعديل المستخدم: ${item.name}` });
  return ok({ item });
});
