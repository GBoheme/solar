import { prisma } from "./db";
import { AuthError } from "./auth";
import { FINAL_STATUSES } from "./constants";

export const TX_FULL_INCLUDE = {
  transaction_type: true,
  target_department: true,
  related_department: true,
  company: true,
  contract: { include: { company_rel: true } },
  tax_letter: { include: { contract: true } },
  creator: { select: { id: true, name: true } },
  reviewer: { select: { id: true, name: true } },
  correction_of: { select: { id: true, internal_number: true } },
  corrections: { select: { id: true, internal_number: true, status: true } },
  routes: { include: { route: { include: { loading_source: true } } } },
  drivers: { orderBy: { sequence_no: "asc" as const } },
  cut_forms: { include: { loading_source: true, route: true, contract: true, tax_letter: true } },
  operation_logs: { include: { loading_source: true, linked_cut_form: true } },
  attachments: { orderBy: { id: "asc" as const } },
  checklist: { include: { checklist_item: true, checker: { select: { name: true } } }, orderBy: { checklist_item: { sort_order: "asc" as const } } },
  validation_errors: { orderBy: { severity: "asc" as const } },
  generated_documents: { include: { generator: { select: { name: true } }, template: { select: { name: true } } }, orderBy: { id: "desc" as const } },
};

/** جلب المعاملة أو رمي 404 */
export async function getTx(id: number) {
  const tx = await prisma.transaction.findUnique({ where: { id } });
  if (!tx) throw new AuthError(404, "المعاملة غير موجودة");
  return tx;
}

/** منع تعديل المعاملات النهائية — يجب فتح نسخة تصحيحية */
export function guardEditable(tx: { status: string }) {
  if (FINAL_STATUSES.includes(tx.status)) {
    throw new AuthError(
      409,
      "هذه معاملة نهائية (صادرة PDF أو مرسلة أو مؤرشفة) — لا يمكن تعديلها. افتح نسخة تصحيحية من تبويب توليد الكتاب."
    );
  }
  if (tx.status === "CANCELLED") {
    throw new AuthError(409, "المعاملة ملغاة ولا يمكن تعديلها");
  }
}

/** بعد أي تعديل بيانات، تعاد المعاملة المدققة إلى حالة بانتظار التدقيق */
export async function demoteAfterEdit(txId: number) {
  const tx = await prisma.transaction.findUnique({ where: { id: txId } });
  if (!tx) return;
  if (["REVIEWED", "READY_TO_ISSUE", "ISSUED_WORD"].includes(tx.status)) {
    await prisma.transaction.update({
      where: { id: txId },
      data: { status: "AWAITING_REVIEW", reviewed_by: null },
    });
  }
}

/** توليد رقم داخلي تسلسلي بالسنة: TRX-2026-0001 */
export async function nextInternalNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TRX-${year}-`;
  const last = await prisma.transaction.findFirst({
    where: { internal_number: { startsWith: prefix } },
    orderBy: { id: "desc" },
  });
  const lastSeq = last ? Number(last.internal_number.slice(prefix.length)) || 0 : 0;
  return `${prefix}${String(lastSeq + 1).padStart(4, "0")}`;
}
