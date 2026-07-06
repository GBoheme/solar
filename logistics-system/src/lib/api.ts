import { NextResponse } from "next/server";
import { AuthError } from "./auth";

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// أكواد أخطاء Prisma التي تعني أن قاعدة البيانات غير مهيأة
const DB_NOT_READY_CODES = new Set([
  "P2021", // الجدول غير موجود
  "P2022", // العمود غير موجود
  "P1003", // ملف قاعدة البيانات غير موجود
  "P1001", // تعذّر الاتصال بقاعدة البيانات
]);

/** غلاف موحد لمعالجات API: يلتقط أخطاء الصلاحيات والأخطاء العامة */
export function handler<T extends unknown[]>(
  fn: (...args: T) => Promise<Response>
): (...args: T) => Promise<Response> {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof AuthError) return fail(e.message, e.status);
      console.error(e);
      const code = (e as { code?: string })?.code;
      if (code && DB_NOT_READY_CODES.has(code)) {
        return fail(
          "قاعدة البيانات غير مهيأة بعد. أوقف التطبيق ونفّذ الأمر: npm run setup ثم أعد التشغيل.",
          503
        );
      }
      const msg = e instanceof Error ? e.message : "خطأ غير متوقع في الخادم";
      return fail(msg, 500);
    }
  };
}

export function parseDate(v: unknown): Date | null {
  if (!v || typeof v !== "string") return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export function parseNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export function parseIntOrNull(v: unknown): number | null {
  const n = parseNum(v);
  return n === null ? null : Math.trunc(n);
}
