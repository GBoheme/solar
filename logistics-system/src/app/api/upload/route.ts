import { NextRequest } from "next/server";
import { requireUser, WRITE_ROLES } from "@/lib/auth";
import { handler, ok, fail } from "@/lib/api";
import { saveUploadedFile } from "@/lib/storage";

// رفع ملف عام (عقود، كتب ضريبة، سجلات…) — يعيد المسار النسبي للملف
const ALLOWED_EXT = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".png", ".jpg", ".jpeg", ".zip", ".mdb", ".accdb"];
const MAX_SIZE = 25 * 1024 * 1024;

export const POST = handler(async (req: NextRequest) => {
  await requireUser(WRITE_ROLES);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("لم يتم إرسال ملف");
  if (file.size > MAX_SIZE) return fail("حجم الملف يتجاوز الحد المسموح (25MB)");
  const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) return fail(`نوع الملف غير مدعوم (${ext})`);
  const subdir = String(form.get("subdir") || "uploads/misc");
  if (!subdir.startsWith("uploads/")) return fail("مسار حفظ غير صالح");
  const file_url = await saveUploadedFile(file, subdir);
  return ok({ file_url, name: file.name, size: file.size });
});
