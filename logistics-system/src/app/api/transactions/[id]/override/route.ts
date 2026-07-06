import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, ADMIN_ONLY } from "@/lib/auth";
import { handler, ok, fail } from "@/lib/api";
import { getTx } from "@/lib/transactions";
import { logAudit } from "@/lib/audit";

// تجاوز تحذير بسيط — بصلاحية مدير فقط ومع تسجيل السبب إلزامياً
export const POST = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(ADMIN_ONLY);
  const { id } = await ctx.params;
  const tx = await getTx(Number(id));

  const { error_id, reason } = await req.json();
  if (!reason?.trim()) return fail("سبب التجاوز إلزامي ويسجل في سجل التعديلات");

  const err = await prisma.validationError.findFirst({
    where: { id: Number(error_id), transaction_id: tx.id },
  });
  if (!err) return fail("التحذير غير موجود — أعد فحص المعاملة أولاً", 404);
  if (err.severity === "CRITICAL") {
    return fail("لا يمكن تجاوز الأخطاء الحرجة — يجب حلها قبل الإصدار", 409);
  }

  const item = await prisma.validationError.update({
    where: { id: err.id },
    data: { override_reason: reason.trim(), overridden_by: user.id, is_resolved: true },
  });
  await logAudit({
    userId: user.id, transactionId: tx.id,
    action: `تجاوز تحذير بصلاحية مدير: ${err.message} — السبب: ${reason.trim()}`,
  });
  return ok({ item });
});
