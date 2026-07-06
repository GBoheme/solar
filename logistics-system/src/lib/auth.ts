import { prisma } from "./db";
import type { Role } from "./constants";

// ==================== نمط المستخدم الواحد ====================
// التطبيق للاستخدام الشخصي: لا تسجيل دخول ولا جلسات ولا صلاحيات متعددة.
// تبقى هوية داخلية موحدة («مالك النظام») تسجل بها كل الحركات في سجل
// التدقيق وتواريخ الإنشاء والاعتماد — استخدام شخصي لا يعني برمجيات مهملة.

export type SessionUser = { id: number; name: string; email: string; role: Role };

const OWNER_EMAIL = "owner@local";

let cachedOwner: SessionUser | null = null;

/** المستخدم المحلي الموحد — ينشأ تلقائياً عند أول استدعاء */
export async function getLocalUser(): Promise<SessionUser> {
  if (cachedOwner) return cachedOwner;
  let user = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (!user) {
    // توافق مع قواعد بيانات قديمة فيها مستخدمون سابقون
    user = await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { id: "asc" } });
  }
  if (!user) {
    const setting = await prisma.appSetting.findUnique({ where: { id: 1 } }).catch(() => null);
    user = await prisma.user.create({
      data: {
        name: setting?.owner_name ?? "Ghaith Boheme",
        email: OWNER_EMAIL,
        password_hash: "-", // لا كلمات مرور في النمط الشخصي
        role: "ADMIN",
      },
    });
  }
  cachedOwner = { id: user.id, name: user.name, email: user.email, role: "ADMIN" };
  return cachedOwner;
}

/** مسح الهوية المؤقتة (بعد تغيير اسم المالك من الإعدادات) */
export function invalidateLocalUserCache() {
  cachedOwner = null;
}

/**
 * توافق مع مسارات API القائمة: يعيد المستخدم المحلي دائماً.
 * معامل الأدوار يُتجاهل — كل الصلاحيات متاحة للمالك في النمط الشخصي.
 */
export async function requireUser(_roles?: Role[]): Promise<SessionUser> {
  return getLocalUser();
}

/** كانت تقرأ الجلسة — الآن تعيد المستخدم المحلي مباشرة */
export async function getSessionUser(): Promise<SessionUser> {
  return getLocalUser();
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ثوابت توافقية — الأدوار لم تعد تفرض قيوداً لكن المسارات تستوردها
export const WRITE_ROLES: Role[] = ["ADMIN", "DATA_ENTRY", "REVIEWER"];
export const REVIEW_ROLES: Role[] = ["ADMIN", "REVIEWER"];
export const ADMIN_ONLY: Role[] = ["ADMIN"];
