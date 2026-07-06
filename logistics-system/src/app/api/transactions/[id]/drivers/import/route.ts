import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, WRITE_ROLES } from "@/lib/auth";
import { handler, ok, fail } from "@/lib/api";
import { getTx, guardEditable, demoteAfterEdit } from "@/lib/transactions";
import { parseDriversSheet } from "@/lib/excel";
import { syncChecklist } from "@/lib/checklist";
import { logAudit } from "@/lib/audit";

// استيراد جدول السائقين من Excel / CSV (بما فيها الجداول المصدّرة من Access)
export const POST = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(WRITE_ROLES);
  const { id } = await ctx.params;
  const tx = await getTx(Number(id));
  guardEditable(tx);

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("أرسل ملف Excel أو CSV");
  const replace = form.get("replace") === "1";

  const buf = Buffer.from(await file.arrayBuffer());
  const { drivers, issues } = parseDriversSheet(buf);
  if (drivers.length === 0) {
    return fail(`فشل الاستيراد: ${issues.join("؛ ") || "لم يتم العثور على بيانات"}`);
  }

  if (replace) {
    await prisma.driver.deleteMany({ where: { transaction_id: tx.id } });
  }
  await prisma.driver.createMany({
    data: drivers.map((d) => ({
      transaction_id: tx.id,
      sequence_no: d.sequence_no,
      driver_name: d.driver_name,
      vehicle_number: d.vehicle_number,
      governorate: d.governorate ?? null,
      vehicle_type: d.vehicle_type ?? null,
      tanker_number: d.tanker_number ?? null,
      gps_info: d.gps_info ?? null,
      notes: d.notes ?? null,
    })),
  });

  await demoteAfterEdit(tx.id);
  await syncChecklist(tx.id);
  await logAudit({
    userId: user.id, transactionId: tx.id,
    action: `استيراد جدول سائقين من ملف (${file.name}) — ${drivers.length} صف${replace ? " (مع استبدال الجدول السابق)" : ""}`,
  });
  return ok({ imported: drivers.length, issues });
});
