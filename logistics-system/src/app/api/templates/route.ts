import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, ADMIN_ONLY } from "@/lib/auth";
import { handler, ok, fail, parseIntOrNull } from "@/lib/api";
import { saveUploadedFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

export const GET = handler(async () => {
  await requireUser();
  const items = await prisma.template.findMany({
    include: { transaction_type: { select: { id: true, name: true } } },
    orderBy: { id: "desc" },
  });
  return ok({ items });
});

// رفع قالب Word جديد (DOCX يحتوي placeholders بصيغة {{Field}})
export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser(ADMIN_ONLY);
  const form = await req.formData();
  const name = String(form.get("name") || "").trim();
  if (!name) return fail("اسم القالب إلزامي");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("أرسل ملف قالب DOCX");
  if (!file.name.toLowerCase().endsWith(".docx")) return fail("القالب يجب أن يكون بصيغة DOCX");

  const transaction_type_id = parseIntOrNull(form.get("transaction_type_id"));
  // نسخة جديدة إذا وجد قالب بنفس الاسم
  const prev = await prisma.template.findFirst({ where: { name }, orderBy: { version: "desc" } });
  const file_url = await saveUploadedFile(file, "templates", name);
  const item = await prisma.template.create({
    data: {
      name,
      transaction_type_id,
      file_url,
      placeholders_json: String(form.get("placeholders_json") || "") || null,
      version: prev ? prev.version + 1 : 1,
    },
  });
  await logAudit({ userId: user.id, action: `رفع قالب Word: ${name} (نسخة ${item.version})` });
  return ok({ item }, 201);
});
