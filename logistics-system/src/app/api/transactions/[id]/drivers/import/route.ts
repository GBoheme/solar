import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, WRITE_ROLES } from "@/lib/auth";
import { handler, ok, fail } from "@/lib/api";
import { getTx, guardEditable, demoteAfterEdit } from "@/lib/transactions";
import { parseDriversSheet, type ImportedDriver } from "@/lib/excel";
import { syncChecklist } from "@/lib/checklist";
import { logAudit } from "@/lib/audit";

// ==================== استيراد جدول السائقين من Excel / CSV ====================
// نمطان: preview=1 (تحليل وتقرير بلا حفظ) ثم التأكيد (حفظ داخل معاملة
// قاعدة بيانات واحدة — فشل جزئي لا يترك بيانات فاسدة).

type ImportReport = {
  total_rows: number;
  valid: number;
  invalid: number;
  duplicates_in_file: number;
  duplicates_with_existing: number;
  issues: string[];
  sample: ImportedDriver[];
};

function analyze(drivers: ImportedDriver[], issues: string[], existingVehicles: Set<string>): {
  report: ImportReport;
  accepted: ImportedDriver[];
  rejected: { row: ImportedDriver; reason: string }[];
} {
  const accepted: ImportedDriver[] = [];
  const rejected: { row: ImportedDriver; reason: string }[] = [];
  const seenVehicles = new Set<string>();
  let dupFile = 0, dupExisting = 0;

  for (const d of drivers) {
    const vehicle = d.vehicle_number.replace(/\s+/g, "");
    if (!d.driver_name || d.driver_name === "—") {
      rejected.push({ row: d, reason: "اسم السائق فارغ" });
      continue;
    }
    if (!vehicle || vehicle === "—") {
      rejected.push({ row: d, reason: "رقم السيارة فارغ" });
      continue;
    }
    if (seenVehicles.has(vehicle)) {
      dupFile++;
      rejected.push({ row: d, reason: `رقم السيارة (${d.vehicle_number}) مكرر داخل الملف` });
      continue;
    }
    if (existingVehicles.has(vehicle)) {
      dupExisting++;
      rejected.push({ row: d, reason: `رقم السيارة (${d.vehicle_number}) موجود مسبقاً في جدول المعاملة` });
      continue;
    }
    seenVehicles.add(vehicle);
    accepted.push(d);
  }

  return {
    report: {
      total_rows: drivers.length,
      valid: accepted.length,
      invalid: rejected.length - dupFile - dupExisting,
      duplicates_in_file: dupFile,
      duplicates_with_existing: dupExisting,
      issues,
      sample: accepted.slice(0, 5),
    },
    accepted,
    rejected,
  };
}

export const POST = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(WRITE_ROLES);
  const { id } = await ctx.params;
  const tx = await getTx(Number(id));
  guardEditable(tx);

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("أرسل ملف Excel أو CSV");
  const replace = form.get("replace") === "1";
  const preview = form.get("preview") === "1";

  const buf = Buffer.from(await file.arrayBuffer());
  const { drivers, issues } = parseDriversSheet(buf);
  if (drivers.length === 0) {
    return fail(`فشل التحليل: ${issues.join("؛ ") || "لم يتم العثور على بيانات"}`);
  }

  // عند الاستبدال لا معنى لمقارنة المكرر مع الجدول الحالي
  const existing = replace
    ? []
    : await prisma.driver.findMany({ where: { transaction_id: tx.id }, select: { vehicle_number: true } });
  const existingVehicles = new Set(existing.map((d) => d.vehicle_number.replace(/\s+/g, "")));

  const { report, accepted, rejected } = analyze(drivers, issues, existingVehicles);

  // نمط المعاينة: تقرير فقط، لا كتابة
  if (preview) {
    return ok({
      preview: true,
      report,
      rejected: rejected.map((r) => ({ ...r.row, reason: r.reason })),
    });
  }

  if (accepted.length === 0) {
    return fail("كل الصفوف مرفوضة — لا يوجد ما يستورد. راجع تقرير المعاينة.");
  }

  // إعادة ترقيم التسلسل عند الإلحاق ليتصل بآخر تسلسل موجود
  let startSeq = 0;
  if (!replace) {
    const maxSeq = await prisma.driver.aggregate({
      where: { transaction_id: tx.id },
      _max: { sequence_no: true },
    });
    startSeq = maxSeq._max.sequence_no ?? 0;
  }

  // الكتابة الذرية: الحذف + الإدراج في معاملة واحدة
  await prisma.$transaction(async (db) => {
    if (replace) {
      await db.driver.deleteMany({ where: { transaction_id: tx.id } });
    }
    await db.driver.createMany({
      data: accepted.map((d, i) => ({
        transaction_id: tx.id,
        sequence_no: replace ? d.sequence_no : startSeq + i + 1,
        driver_name: d.driver_name,
        vehicle_number: d.vehicle_number,
        governorate: d.governorate ?? null,
        vehicle_type: d.vehicle_type ?? null,
        tanker_number: d.tanker_number ?? null,
        gps_info: d.gps_info ?? null,
        notes: d.notes ?? null,
      })),
    });
  });

  await demoteAfterEdit(tx.id);
  await syncChecklist(tx.id);
  await logAudit({
    userId: user.id, transactionId: tx.id,
    action: `استيراد جدول سائقين من (${file.name}) — قُبل ${accepted.length} ورُفض ${rejected.length} من أصل ${report.total_rows}${replace ? " (مع استبدال الجدول السابق)" : " (إلحاق)"}`,
  });
  return ok({
    imported: accepted.length,
    rejected: rejected.map((r) => ({ ...r.row, reason: r.reason })),
    report,
  });
});
