import { getSessionUser } from "@/lib/auth";
import { ok, fail, handler } from "@/lib/api";

export const GET = handler(async () => {
  const user = await getSessionUser();
  if (!user) return fail("غير مسجل الدخول", 401);
  return ok({ user });
});
