import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
import { getTx } from "@/lib/transactions";
import { syncChecklist } from "@/lib/checklist";
import { validateTransaction, autoUpdateStatus } from "@/lib/validation-engine";
import { logAudit } from "@/lib/audit";

// زر «فحص المعاملة» — يشغل محرك التدقيق الذكي كاملاً
export const POST = handler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const tx = await getTx(Number(id));

  await syncChecklist(tx.id);
  const result = await validateTransaction(tx.id);
  await autoUpdateStatus(tx.id, result);

  await logAudit({
    userId: user.id, transactionId: tx.id,
    action: `فحص المعاملة (${result.errors.length} خطأ حرج، ${result.warnings.length} تحذير)`,
  });
  return ok({ result });
});
