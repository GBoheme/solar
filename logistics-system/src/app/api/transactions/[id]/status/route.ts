import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, REVIEW_ROLES, WRITE_ROLES, ADMIN_ONLY } from "@/lib/auth";
import { handler, ok, fail } from "@/lib/api";
import { getTx } from "@/lib/transactions";
import { validateTransaction } from "@/lib/validation-engine";
import { STATUSES } from "@/lib/constants";
import { logAudit } from "@/lib/audit";
import type { Role } from "@/lib/constants";

// قواعد الانتقال بين الحالات ومن يحق له كل انتقال
const TRANSITIONS: Record<string, { from: string[]; roles: Role[]; needsClean?: boolean }> = {
  AWAITING_REVIEW: { from: ["DRAFT", "MISSING_DATA", "MISSING_ATTACHMENTS", "RETURNED_FOR_CORRECTION"], roles: WRITE_ROLES },
  REVIEWED: { from: ["AWAITING_REVIEW"], roles: REVIEW_ROLES, needsClean: true },
  READY_TO_ISSUE: { from: ["REVIEWED"], roles: REVIEW_ROLES, needsClean: true },
  RETURNED_FOR_CORRECTION: { from: ["AWAITING_REVIEW", "REVIEWED", "READY_TO_ISSUE", "ISSUED_WORD"], roles: REVIEW_ROLES },
  SENT: { from: ["ISSUED_PDF"], roles: WRITE_ROLES },
  ARCHIVED: { from: ["ISSUED_PDF", "SENT"], roles: WRITE_ROLES },
  CANCELLED: { from: ["DRAFT", "MISSING_DATA", "MISSING_ATTACHMENTS", "AWAITING_REVIEW", "REVIEWED", "READY_TO_ISSUE", "ISSUED_WORD", "RETURNED_FOR_CORRECTION"], roles: ADMIN_ONLY },
};

export const POST = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { status, note } = await req.json();
  const rule = TRANSITIONS[status];
  if (!rule) return fail("انتقال حالة غير مسموح");
  const user = await requireUser(rule.roles);
  const tx = await getTx(Number(id));

  if (!rule.from.includes(tx.status)) {
    return fail(`لا يمكن الانتقال من حالة (${STATUSES[tx.status as keyof typeof STATUSES]}) إلى (${STATUSES[status as keyof typeof STATUSES]})`, 409);
  }

  if (rule.needsClean) {
    const result = await validateTransaction(tx.id);
    if (result.errors.length > 0) {
      return fail(`لا يمكن اعتماد المعاملة — توجد ${result.errors.length} أخطاء حرجة. شغّل «فحص المعاملة» لعرضها.`, 409);
    }
  }

  const data: { status: string; reviewed_by?: number } = { status };
  if (status === "REVIEWED" || status === "READY_TO_ISSUE") data.reviewed_by = user.id;

  const updated = await prisma.transaction.update({ where: { id: tx.id }, data });
  await logAudit({
    userId: user.id, transactionId: tx.id,
    action: `تغيير الحالة إلى: ${STATUSES[status as keyof typeof STATUSES]}${note ? ` — ${note}` : ""}`,
    oldValue: tx.status, newValue: status,
  });
  return ok({ item: updated });
});
