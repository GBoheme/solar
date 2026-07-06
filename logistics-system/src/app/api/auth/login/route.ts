import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { handler, fail } from "@/lib/api";

export const POST = handler(async (req: NextRequest) => {
  const { email, password } = await req.json();
  if (!email || !password) return fail("أدخل البريد الإلكتروني وكلمة المرور");

  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  if (!user || !user.is_active) return fail("بيانات الدخول غير صحيحة", 401);

  const okPass = await bcrypt.compare(String(password), user.password_hash);
  if (!okPass) return fail("بيانات الدخول غير صحيحة", 401);

  const token = await createSessionToken({
    id: user.id, name: user.name, email: user.email, role: user.role as never,
  });

  const res = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
});
