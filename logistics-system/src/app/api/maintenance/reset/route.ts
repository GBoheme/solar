import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handler, ok, fail } from "@/lib/api";
import { STORAGE_ROOT } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

// ==================== إعادة تعيين البيانات ====================
// عملية حذف البيانات تعامل كسلاح محشو: عبارة تأكيد حرفية، حذف مرتب
// داخل معاملة قاعدة بيانات واحدة، وتسجيل العملية في سجل التدقيق.

const CONFIRM_PHRASE = "أفهم أن هذا سيحذف بيانات التطبيق";

function rmDirSafe(sub: string) {
  const full = path.resolve(STORAGE_ROOT, sub);
  // حماية من تجاوز المسار: لا حذف خارج جذر التخزين
  const rel = path.relative(STORAGE_ROOT, full);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return;
  fs.rmSync(full, { recursive: true, force: true });
}

export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser();
  const { mode, confirmation } = await req.json();

  if (confirmation !== CONFIRM_PHRASE) {
    return fail(`عبارة التأكيد غير مطابقة. اكتب حرفياً: «${CONFIRM_PHRASE}»`, 400);
  }
  if (mode !== "demo" && mode !== "full") {
    return fail("نمط إعادة التعيين غير معروف (demo أو full)");
  }

  const counts = {
    transactions: await prisma.transaction.count(),
    attachments: await prisma.attachment.count(),
  };

  // الحذف بترتيب يحترم العلاقات، داخل معاملة واحدة — لا حالة وسطى فاسدة
  await prisma.$transaction(async (db) => {
    // بيانات المعاملات التشغيلية (النمطان)
    await db.transactionChecklist.deleteMany();
    await db.validationError.deleteMany();
    await db.generatedDocument.deleteMany();
    await db.operationLog.deleteMany();
    await db.driver.deleteMany();
    await db.cutForm.deleteMany();
    await db.attachment.deleteMany();
    await db.transactionRoute.deleteMany();
    await db.errorRegister.deleteMany();
    if (mode === "full") {
      await db.auditLog.deleteMany();
    } else {
      // النمط التجريبي: يبقى سجل التدقيق كتاريخ، مع فك ربطه بالمعاملات المحذوفة
      await db.auditLog.updateMany({ data: { transaction_id: null } });
    }
    await db.transaction.deleteMany();

    if (mode === "full") {
      // التصفير الكامل: الأدلة التشغيلية أيضاً
      await db.taxLetter.deleteMany();
      await db.contract.deleteMany();
      await db.route.deleteMany();
      await db.loadingSource.deleteMany();
      await db.company.deleteMany();
      await db.department.deleteMany();
      // يبقى: أنواع المعاملات وبنود تدقيقها، القوالب، الإعدادات، هوية المالك
    }
  });

  // تنظيف الملفات المرتبطة بما حذف (القوالب تبقى دائماً)
  rmDirSafe("uploads");
  rmDirSafe("generated");
  rmDirSafe("archives");

  await logAudit({
    userId: user.id,
    action: mode === "full"
      ? `تصفير كامل لبيانات التطبيق (حُذفت ${counts.transactions} معاملة و${counts.attachments} مرفقاً + الأدلة التشغيلية)`
      : `مسح البيانات التشغيلية/التجريبية (حُذفت ${counts.transactions} معاملة و${counts.attachments} مرفقاً — بقيت الأدلة والقوالب)`,
  });

  return ok({
    done: true,
    mode,
    deleted: counts,
    kept: mode === "full"
      ? ["الإعدادات", "هوية المالك", "أنواع المعاملات وقوائم تدقيقها", "قوالب Word"]
      : ["الإعدادات", "هوية المالك", "أنواع المعاملات", "قوالب Word", "الجهات", "الشركات", "العقود", "كتب الضريبة", "المسارات", "مصادر التجهيز"],
  });
});
