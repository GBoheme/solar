import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, WRITE_ROLES } from "@/lib/auth";
import { handler, ok, fail } from "@/lib/api";
import { getTx } from "@/lib/transactions";
import { syncChecklist } from "@/lib/checklist";
import { validateTransaction } from "@/lib/validation-engine";
import { buildBookPayload, renderDocx } from "@/lib/docgen";
import { saveBuffer } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

// «توليد الكتاب» — ينشئ نسخة Word مرقمة (مسودة/تصحيح) من القالب
export const POST = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(WRITE_ROLES);
  const { id } = await ctx.params;
  const tx = await getTx(Number(id));

  if (["ARCHIVED", "CANCELLED"].includes(tx.status)) {
    return fail("لا يمكن توليد كتاب لمعاملة مؤرشفة أو ملغاة", 409);
  }

  // لا توليد قبل اكتمال المتطلبات الأساسية (صفر أخطاء حرجة)
  await syncChecklist(tx.id);
  const result = await validateTransaction(tx.id);
  if (!result.canGenerateWord) {
    return fail(
      `لا يمكن توليد الكتاب — توجد ${result.errors.length} أخطاء حرجة يجب حلها أولاً. افتح تبويب قائمة التدقيق لعرضها.`,
      409
    );
  }

  const body = await req.json().catch(() => ({}));

  // اختيار القالب: المحدد يدوياً ← الافتراضي للنوع ← أي قالب فعال للنوع
  const type = await prisma.transactionType.findUnique({ where: { id: tx.transaction_type_id } });
  let template = body.template_id
    ? await prisma.template.findUnique({ where: { id: Number(body.template_id) } })
    : null;
  if (!template && type?.default_template_id) {
    template = await prisma.template.findUnique({ where: { id: type.default_template_id } });
  }
  if (!template) {
    template = await prisma.template.findFirst({
      where: { transaction_type_id: tx.transaction_type_id, is_active: true },
      orderBy: { version: "desc" },
    });
  }
  if (!template) return fail("لا يوجد قالب Word فعال لهذا النوع من المعاملات — أضف قالباً من شاشة القوالب", 409);

  const payload = await buildBookPayload(tx.id);
  const docxBuf = renderDocx(template.file_url, payload);

  // الترقيم: كل نسخة تحفظ ولا تستبدل القديمة
  const prevCount = await prisma.generatedDocument.count({ where: { transaction_id: tx.id } });
  const version = prevCount + 1;
  const kind = tx.correction_of_id ? "CORRECTION" : "DRAFT";
  const draftCount = await prisma.generatedDocument.count({
    where: { transaction_id: tx.id, kind },
  });
  const label = kind === "CORRECTION" ? `تصحيح ${draftCount + 1}` : `مسودة ${draftCount + 1}`;

  const fileName = `${tx.internal_number}_v${version}_word.docx`;
  const word_url = saveBuffer(docxBuf, `generated/${tx.internal_number}`, fileName);

  const doc = await prisma.generatedDocument.create({
    data: {
      transaction_id: tx.id,
      template_id: template.id,
      kind,
      label,
      word_url,
      version,
      generated_by: user.id,
    },
  });

  if (["READY_TO_ISSUE", "REVIEWED"].includes(tx.status)) {
    await prisma.transaction.update({ where: { id: tx.id }, data: { status: "ISSUED_WORD" } });
  }

  await logAudit({
    userId: user.id, transactionId: tx.id,
    action: `توليد كتاب Word (${label}) من القالب: ${template.name}`,
  });
  return ok({ document: doc }, 201);
});
