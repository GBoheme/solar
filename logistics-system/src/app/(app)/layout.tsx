import { getLocalUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Shell from "@/components/Shell";

// الإعدادات (اسم التطبيق/المالك) تقرأ من قاعدة البيانات عند كل طلب
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getLocalUser();
  const settings = await prisma.appSetting.findUnique({ where: { id: 1 } }).catch(() => null);
  return (
    <Shell
      user={{ name: settings?.owner_name ?? user.name }}
      appName={settings?.app_name ?? "نظام غيث للسيطرة اللوجستية"}
    >
      {children}
    </Shell>
  );
}
