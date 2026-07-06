import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handler } from "@/lib/api";
import { STORAGE_ROOT } from "@/lib/storage";
import { APP_VERSION } from "@/lib/version";

// نسخة احتياطية كاملة: قاعدة البيانات + الملفات + معلومات وصفية
// logistics-backup-YYYY-MM-DD-HH-mm.zip
export const GET = handler(async () => {
  await requireUser();
  const zip = new AdmZip();

  // قاعدة البيانات SQLite
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  if (fs.existsSync(dbPath)) zip.addLocalFile(dbPath, "database");

  // الملفات: مرفقات + كتب مولدة + قوالب
  for (const dir of ["uploads", "generated", "templates"]) {
    const full = path.join(STORAGE_ROOT, dir);
    if (fs.existsSync(full)) zip.addLocalFolder(full, `storage/${dir}`);
  }

  // معلومات النسخة
  const [txCount, attCount, settings] = await Promise.all([
    prisma.transaction.count(),
    prisma.attachment.count(),
    prisma.appSetting.findUnique({ where: { id: 1 } }),
  ]);
  zip.addFile(
    "backup-info.json",
    Buffer.from(JSON.stringify({
      backup_date: new Date().toISOString(),
      app_version: APP_VERSION,
      database_type: "sqlite",
      transactions: txCount,
      attachments: attCount,
      owner_name: settings?.owner_name ?? "Ghaith Boheme",
      restore_hint: "لاستعادة النسخة: أوقف التطبيق، انسخ database/dev.db إلى prisma/dev.db ومجلد storage فوق مجلد storage الحالي، ثم أعد التشغيل",
    }, null, 2), "utf8")
  );

  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;
  const buf = zip.toBuffer();
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="logistics-backup-${stamp}.zip"`,
    },
  });
});
