import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, WRITE_ROLES } from "@/lib/auth";
import { handler, ok, fail, parseDate } from "@/lib/api";
import { getTx, guardEditable, demoteAfterEdit } from "@/lib/transactions";
import { saveUploadedFile } from "@/lib/storage";
import { syncChecklist } from "@/lib/checklist";
import { ATTACHMENT_TYPES } from "@/lib/constants";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: NextRequest, ctx: Ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  const items = await prisma.attachment.findMany({
    where: { transaction_id: Number(id) },
    orderBy: { id: "asc" },
  });
  return ok({ items });
});

// رفع مرفق جديد (multipart: file + metadata) — الملف اختياري (يمكن تسجيل مرفق ثم رفع ملفه لاحقاً)
export const POST = handler(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(WRITE_ROLES);
  const { id } = await ctx.params;
  const tx = await getTx(Number(id));
  guardEditable(tx);

  const form = await req.formData();
  const attachment_type = String(form.get("attachment_type") || "OTHER");
  if (!(attachment_type in ATTACHMENT_TYPES)) return fail("نوع مرفق غير معروف");
  const title = String(form.get("title") || "").trim();
  if (!title) return fail("عنوان المرفق إلزامي");

  let file_url: string | null = null;
  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > 25 * 1024 * 1024) return fail("حجم الملف يتجاوز 25MB");
    file_url = await saveUploadedFile(file, `uploads/${tx.internal_number}`);
  }

  const item = await prisma.attachment.create({
    data: {
      transaction_id: tx.id,
      attachment_type,
      title,
      document_number: String(form.get("document_number") || "").trim() || null,
      document_date: parseDate(form.get("document_date")),
      file_url,
      is_required: form.get("is_required") === "1" || form.get("is_required") === "true",
      notes: String(form.get("notes") || "").trim() || null,
    },
  });

  await demoteAfterEdit(tx.id);
  await syncChecklist(tx.id);
  await logAudit({ userId: user.id, transactionId: tx.id, action: `إضافة مرفق: ${title}` });
  return ok({ item }, 201);
});
