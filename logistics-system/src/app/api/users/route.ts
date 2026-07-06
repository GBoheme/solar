import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireUser, ADMIN_ONLY } from "@/lib/auth";
import { handler, ok, fail } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { logAudit } from "@/lib/audit";

export const GET = handler(async () => {
  await requireUser(ADMIN_ONLY);
  const items = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, is_active: true, created_at: true },
    orderBy: { id: "asc" },
  });
  return ok({ items });
});

export const POST = handler(async (req: NextRequest) => {
  const admin = await requireUser(ADMIN_ONLY);
  const { name, email, password, role } = await req.json();
  if (!name?.trim() || !email?.trim() || !password) return fail("الاسم والبريد وكلمة المرور إلزامية");
  if (String(password).length < 6) return fail("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
  if (!(role in ROLES)) return fail("دور غير معروف");
  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (exists) return fail("البريد الإلكتروني مستخدم مسبقاً", 409);
  const item = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash: await bcrypt.hash(String(password), 10),
      role,
    },
    select: { id: true, name: true, email: true, role: true, is_active: true },
  });
  await logAudit({ userId: admin.id, action: `إنشاء مستخدم: ${item.name} (${ROLES[role as keyof typeof ROLES]})` });
  return ok({ item }, 201);
});
