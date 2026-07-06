import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, WRITE_ROLES, REVIEW_ROLES } from "@/lib/auth";
import { handler, ok, fail, parseDate } from "@/lib/api";
import { getTx, demoteAfterEdit } from "@/lib/transactions";
import { saveUploadedFile } from "@/lib/storage";
import { FINAL_STATUSES } from "@/lib/constants";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// تعديل بيانات مرفق أو رفع/استبدال ملفه أو تأشير تدقيقه
export const PATCH = handler(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const att = await prisma.attachment.findUnique({ where: { id: Number(id) } });
  if (!att) return fail("المرفق غير موجود", 404);
  const tx = await getTx(att.transaction_id);

  const contentType = req.headers.get("content-type") || "";
  const data: Record<string, unknown> = {};
  let action = "تعديل مرفق";
  let user;

  if (contentType.includes("multipart/form-data")) {
    user = await requireUser(WRITE_ROLES);
    if (FINAL_STATUSES.includes(tx.status)) return fail("لا يمكن تعديل مرفقات معاملة نهائية", 409);
    const form = await req.formData();
    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      data.file_url = await saveUploadedFile(file, `uploads/${tx.internal_number}`);
      action = `رفع ملف للمرفق: ${att.title}`;
    }
    for (const f of ["title", "document_number", "notes"]) {
      const v = form.get(f);
      if (v !== null) data[f] = String(v).trim() || null;
    }
    const dd = form.get("document_date");
    if (dd !== null) data.document_date = parseDate(dd);
  } else {
    const body = await req.json();
    if ("is_verified" in body) {
      // تأشير التدقيق — صلاحية مدقق/مدير فقط
      user = await requireUser(REVIEW_ROLES);
      data.is_verified = !!body.is_verified;
      action = `${body.is_verified ? "تدقيق" : "إلغاء تدقيق"} المرفق: ${att.title}`;
    } else {
      user = await requireUser(WRITE_ROLES);
      if (FINAL_STATUSES.includes(tx.status)) return fail("لا يمكن تعديل مرفقات معاملة نهائية", 409);
      for (const f of ["title", "document_number", "notes", "attachment_type"]) {
        if (f in body) data[f] = body[f]?.toString().trim() || null;
      }
      if ("document_date" in body) data.document_date = parseDate(body.document_date);
      if ("is_required" in body) data.is_required = !!body.is_required;
    }
  }

  const item = await prisma.attachment.update({ where: { id: att.id }, data });
  if (!("is_verified" in data)) await demoteAfterEdit(tx.id);
  await logAudit({ userId: user.id, transactionId: tx.id, action });
  return ok({ item });
});

// حذف مرفق — مرفقات المعاملة النهائية لا تحذف إلا بصلاحية مدير
export const DELETE = handler(async (_req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const att = await prisma.attachment.findUnique({ where: { id: Number(id) } });
  if (!att) return fail("المرفق غير موجود", 404);
  const tx = await getTx(att.transaction_id);

  const isFinal = FINAL_STATUSES.includes(tx.status);
  const user = await requireUser(isFinal ? ["ADMIN"] : WRITE_ROLES);

  await prisma.attachment.delete({ where: { id: att.id } });
  if (!isFinal) await demoteAfterEdit(tx.id);
  await logAudit({
    userId: user.id, transactionId: tx.id,
    action: `حذف المرفق: ${att.title}${isFinal ? " (من معاملة نهائية بصلاحية مدير)" : ""}`,
    oldValue: att,
  });
  return ok({ deleted: true });
});
