import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, invalidateLocalUserCache, getLocalUser } from "@/lib/auth";
import { handler, ok, fail } from "@/lib/api";
import { logAudit } from "@/lib/audit";

const DEFAULTS = { id: 1 };

export const GET = handler(async () => {
  await requireUser();
  const settings = await prisma.appSetting.upsert({
    where: { id: 1 },
    update: {},
    create: DEFAULTS,
  });
  return ok({ settings });
});

export const PATCH = handler(async (req: NextRequest) => {
  const user = await requireUser();
  const b = await req.json();
  // حقول لا تقبل الفراغ (لها قيم افتراضية) وحقول اختيارية تقبل المسح
  const REQUIRED_FIELDS = ["app_name", "app_name_en", "owner_name", "report_footer", "doc_footer"];
  const OPTIONAL_FIELDS = ["default_product", "logo_url"];
  const data: Record<string, string | null> = {};
  for (const f of REQUIRED_FIELDS) {
    if (!(f in b)) continue;
    const v = b[f]?.toString().trim();
    if (!v) {
      if (f === "app_name" || f === "owner_name") return fail("اسم التطبيق واسم المالك لا يمكن أن يكونا فارغين");
      continue; // الحقول الافتراضية الأخرى: تجاهل الفراغ وأبقِ القيمة الحالية
    }
    data[f] = v;
  }
  for (const f of OPTIONAL_FIELDS) {
    if (f in b) data[f] = b[f]?.toString().trim() || null;
  }
  const settings = await prisma.appSetting.upsert({
    where: { id: 1 },
    update: data,
    create: { ...DEFAULTS, ...data },
  });
  // مزامنة اسم المالك مع هوية المستخدم المحلي في سجل التدقيق
  if (data.owner_name) {
    const local = await getLocalUser();
    await prisma.user.update({ where: { id: local.id }, data: { name: data.owner_name } });
    invalidateLocalUserCache();
  }
  await logAudit({ userId: user.id, action: "تعديل إعدادات التطبيق والعلامة" });
  return ok({ settings });
});
