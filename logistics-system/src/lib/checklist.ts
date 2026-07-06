import { prisma } from "./db";

// ==================== قائمة المهام الذكية ====================
// تُنشأ بنود التدقيق تلقائياً من بنود نوع المعاملة، وتظهر البنود
// الشرطية أو تختفي ديناميكياً حسب بيانات المعاملة.

/** تقييم شرط بند تدقيق ديناميكي */
function conditionSatisfied(key: string | null, tx: {
  contract_id: number | null;
  tax_letter_id: number | null;
  previous_book_number: string | null;
  operation_logs: { id: number }[];
  cut_forms: { id: number }[];
  drivers: { id: number }[];
}): boolean {
  if (!key) return true;
  switch (key) {
    case "has_contract": return tx.contract_id !== null;
    case "has_tax_letter": return tx.tax_letter_id !== null;
    case "has_previous_book": return !!tx.previous_book_number;
    case "has_operation_log": return tx.operation_logs.length > 0;
    case "has_cut_forms": return tx.cut_forms.length > 0;
    case "has_drivers": return tx.drivers.length > 0;
    default: return true;
  }
}

/** مزامنة قائمة تدقيق المعاملة مع بنود نوعها (تُستدعى عند الإنشاء وعند كل فحص) */
export async function syncChecklist(transactionId: number) {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      operation_logs: { select: { id: true } },
      cut_forms: { select: { id: true } },
      drivers: { select: { id: true } },
      checklist: true,
    },
  });
  if (!tx) return;

  const items = await prisma.checklistItem.findMany({
    where: { transaction_type_id: tx.transaction_type_id },
    orderBy: { sort_order: "asc" },
  });

  const existingByItem = new Map(tx.checklist.map((c) => [c.checklist_item_id, c]));

  for (const item of items) {
    const applicable = conditionSatisfied(item.condition_key, tx);
    const existing = existingByItem.get(item.id);
    if (applicable && !existing) {
      await prisma.transactionChecklist.create({
        data: { transaction_id: tx.id, checklist_item_id: item.id },
      });
    } else if (!applicable && existing && !existing.is_done) {
      // البند لم يعد منطبقاً — يُزال إن لم يكن منجزاً
      await prisma.transactionChecklist.delete({ where: { id: existing.id } });
    }
  }
}
