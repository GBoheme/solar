import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, REVIEW_ROLES } from "@/lib/auth";
import { handler, ok, fail } from "@/lib/api";
import { getTx } from "@/lib/transactions";
import { syncChecklist } from "@/lib/checklist";
import { validateTransaction } from "@/lib/validation-engine";
import { buildBookPayload } from "@/lib/docgen";
import { buildBookHtml, htmlToPdf } from "@/lib/pdf";
import { saveBuffer } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

// «إصدار PDF نهائي» — يظهر فقط بعد اكتمال التدقيق الكامل، وبصلاحية مدقق/مدير
export const POST = handler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(REVIEW_ROLES);
  const { id } = await ctx.params;
  const tx = await getTx(Number(id));

  if (!["REVIEWED", "READY_TO_ISSUE", "ISSUED_WORD"].includes(tx.status)) {
    return fail("إصدار PDF النهائي متاح فقط لمعاملة مدققة أو جاهزة للإصدار أو صادرة Word", 409);
  }

  // شرط الإصدار: صفر أخطاء، صفر تحذيرات غير متجاوزة، قائمة تدقيق مكتملة
  await syncChecklist(tx.id);
  const result = await validateTransaction(tx.id);
  if (!result.canIssuePdf) {
    const reasons: string[] = [];
    if (result.errors.length) reasons.push(`${result.errors.length} أخطاء حرجة`);
    if (result.warnings.length) reasons.push(`${result.warnings.length} تحذيرات غير محلولة أو غير متجاوزة`);
    if (result.checklistDone < result.checklistTotal)
      reasons.push(`قائمة التدقيق غير مكتملة (${result.checklistDone}/${result.checklistTotal})`);
    return fail(`لا يمكن إصدار PDF النهائي: ${reasons.join("؛ ")}`, 409);
  }

  const payload = await buildBookPayload(tx.id);
  const html = buildBookHtml(payload);
  const pdfBuf = await htmlToPdf(html);

  const prevCount = await prisma.generatedDocument.count({ where: { transaction_id: tx.id } });
  const version = prevCount + 1;
  const finalCount = await prisma.generatedDocument.count({
    where: { transaction_id: tx.id, kind: "FINAL" },
  });
  const label = finalCount === 0 ? "نهائي" : `نهائي ${finalCount + 1}`;
  const fileName = `${tx.internal_number}_v${version}_final.pdf`;
  const pdf_url = saveBuffer(pdfBuf, `generated/${tx.internal_number}`, fileName);

  const doc = await prisma.generatedDocument.create({
    data: {
      transaction_id: tx.id,
      kind: "FINAL",
      label,
      pdf_url,
      version,
      generated_by: user.id,
    },
  });

  await prisma.transaction.update({
    where: { id: tx.id },
    data: { status: "ISSUED_PDF", reviewed_by: tx.reviewed_by ?? user.id, book_date: tx.book_date ?? new Date() },
  });

  await logAudit({ userId: user.id, transactionId: tx.id, action: `إصدار PDF نهائي (${label})` });
  return ok({ document: doc }, 201);
});
