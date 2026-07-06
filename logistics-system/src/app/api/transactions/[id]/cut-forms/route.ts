import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, WRITE_ROLES } from "@/lib/auth";
import { handler, ok, fail, parseDate, parseIntOrNull, parseNum } from "@/lib/api";
import { getTx, guardEditable, demoteAfterEdit } from "@/lib/transactions";
import { syncChecklist } from "@/lib/checklist";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: NextRequest, ctx: Ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  const items = await prisma.cutForm.findMany({
    where: { transaction_id: Number(id) },
    include: { loading_source: true, route: true, contract: true, tax_letter: true },
    orderBy: { id: "asc" },
  });
  return ok({ items });
});

export const POST = handler(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(WRITE_ROLES);
  const { id } = await ctx.params;
  const tx = await getTx(Number(id));
  guardEditable(tx);

  const b = await req.json();
  if (!b.form_number?.trim()) return fail("رقم استمارة القطع إلزامي");

  const cut = parseNum(b.cut_quantity);
  const loaded = parseNum(b.loaded_quantity) ?? 0;
  // القواعد الحسابية الصارمة عند الإدخال
  if (cut !== null && loaded > cut) {
    return fail(`الكمية المجهزة (${loaded}) لا يمكن أن تكون أكبر من الكمية المقطوعة (${cut})`);
  }
  const remaining = cut !== null ? cut - loaded : null;
  if (remaining !== null && remaining < 0) return fail("الكمية المتبقية لا يمكن أن تكون سالبة");

  // تحذير: الاستمارة مستخدمة سابقاً أو مغلقة
  const existing = await prisma.cutForm.findFirst({
    where: { form_number: b.form_number.trim(), transaction_id: { not: null } },
    include: { transaction: { select: { internal_number: true } } },
  });
  const warnings: string[] = [];
  if (existing?.transaction) {
    if (!b.confirm_reuse) {
      return fail(
        `تنبيه: استمارة القطع (${b.form_number}) مستخدمة سابقاً في المعاملة (${existing.transaction.internal_number}). أعد الإرسال مع تأكيد إعادة الاستخدام إن كان مقصوداً.`,
        409
      );
    }
    warnings.push(`تمت إعادة استخدام الاستمارة بعد تأكيد المستخدم (كانت في ${existing.transaction.internal_number})`);
  }

  const item = await prisma.cutForm.create({
    data: {
      transaction_id: tx.id,
      form_number: b.form_number.trim(),
      form_date: parseDate(b.form_date),
      loading_source_id: parseIntOrNull(b.loading_source_id),
      loading_site: b.loading_site?.trim() || null,
      product: b.product?.trim() || tx.product,
      cut_quantity: cut,
      loaded_quantity: loaded,
      remaining_quantity: remaining,
      company_id: parseIntOrNull(b.company_id) ?? tx.company_id,
      contract_id: parseIntOrNull(b.contract_id) ?? tx.contract_id,
      tax_letter_id: parseIntOrNull(b.tax_letter_id) ?? tx.tax_letter_id,
      route_id: parseIntOrNull(b.route_id),
      status: b.status || "OPEN",
      file_url: b.file_url || null,
      notes: [b.notes?.trim(), ...warnings].filter(Boolean).join(" — ") || null,
    },
    include: { loading_source: true, route: true },
  });

  await demoteAfterEdit(tx.id);
  await syncChecklist(tx.id);
  await logAudit({ userId: user.id, transactionId: tx.id, action: `ربط استمارة قطع (${item.form_number})` });
  return ok({ item, warnings }, 201);
});
