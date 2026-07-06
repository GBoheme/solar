import { prisma } from "./db";

/** تسجيل حركة في سجل التعديلات */
export async function logAudit(opts: {
  userId: number;
  transactionId?: number | null;
  entity?: string;
  entityId?: number;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  const toStr = (v: unknown) =>
    v === undefined || v === null ? null : typeof v === "string" ? v : JSON.stringify(v);
  await prisma.auditLog.create({
    data: {
      user_id: opts.userId,
      transaction_id: opts.transactionId ?? null,
      entity: opts.entity ?? null,
      entity_id: opts.entityId ?? null,
      action: opts.action,
      old_value: toStr(opts.oldValue),
      new_value: toStr(opts.newValue),
    },
  });
}
