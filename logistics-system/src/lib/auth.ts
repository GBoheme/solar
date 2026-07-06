import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";
import type { Role } from "./constants";

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "logistics-audit-system-dev-secret"
);

export const SESSION_COOKIE = "logistics_session";

export type SessionUser = { id: number; name: string; email: string; role: Role };

export async function createSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      id: payload.id as number,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** يتحقق من الجلسة والصلاحية، ويرمي استجابة 401/403 عند الفشل */
export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError(401, "يجب تسجيل الدخول");
  if (roles && !roles.includes(user.role)) {
    throw new AuthError(403, "ليست لديك صلاحية لتنفيذ هذا الإجراء");
  }
  // تأكد أن المستخدم ما يزال فعالاً
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || !dbUser.is_active) throw new AuthError(401, "الحساب غير فعال");
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** الأدوار التي يحق لها تعديل البيانات */
export const WRITE_ROLES: Role[] = ["ADMIN", "DATA_ENTRY", "REVIEWER"];
export const REVIEW_ROLES: Role[] = ["ADMIN", "REVIEWER"];
export const ADMIN_ONLY: Role[] = ["ADMIN"];
