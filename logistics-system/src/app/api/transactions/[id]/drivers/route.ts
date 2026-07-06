import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, WRITE_ROLES } from "@/lib/auth";
import { handler, ok, fail } from "@/lib/api";
import { getTx, guardEditable, demoteAfterEdit } from "@/lib/transactions";
import { syncChecklist } from "@/lib/checklist";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: NextRequest, ctx: Ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  const drivers = await prisma.driver.findMany({
    where: { transaction_id: Number(id) },
    orderBy: { sequence_no: "asc" },
  });
  return ok({ items: drivers });
});

// إضافة سائق واحد أو مجموعة { drivers: [...] } — التسلسل التالي يحسب تلقائياً إن لم يرسل
export const POST = handler(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(WRITE_ROLES);
  const { id } = await ctx.params;
  const tx = await getTx(Number(id));
  guardEditable(tx);

  const body = await req.json();
  const rows = Array.isArray(body.drivers) ? body.drivers : [body];
  if (rows.length === 0) return fail("لا توجد بيانات سائقين");

  const maxSeq = await prisma.driver.aggregate({
    where: { transaction_id: tx.id },
    _max: { sequence_no: true },
  });
  let nextSeq = (maxSeq._max.sequence_no ?? 0) + 1;

  const created = [];
  for (const r of rows) {
    if (!r.driver_name?.trim() || !r.vehicle_number?.trim()) {
      return fail("اسم السائق ورقم السيارة إلزاميان لكل صف");
    }
    const seq = r.sequence_no != null && r.sequence_no !== "" ? Number(r.sequence_no) : nextSeq++;
    created.push(
      await prisma.driver.create({
        data: {
          transaction_id: tx.id,
          sequence_no: seq,
          driver_name: r.driver_name.trim(),
          vehicle_number: r.vehicle_number.trim(),
          governorate: r.governorate?.trim() || null,
          vehicle_type: r.vehicle_type?.trim() || null,
          tanker_number: r.tanker_number?.trim() || null,
          gps_info: r.gps_info?.trim() || null,
          notes: r.notes?.trim() || null,
        },
      })
    );
  }
  await demoteAfterEdit(tx.id);
  await syncChecklist(tx.id);
  await logAudit({ userId: user.id, transactionId: tx.id, action: `إضافة ${created.length} صف إلى جدول السائقين` });
  return ok({ items: created }, 201);
});

// حذف كل الصفوف (قبل إعادة الاستيراد مثلاً)
export const DELETE = handler(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireUser(WRITE_ROLES);
  const { id } = await ctx.params;
  const tx = await getTx(Number(id));
  guardEditable(tx);
  const { count } = await prisma.driver.deleteMany({ where: { transaction_id: tx.id } });
  await demoteAfterEdit(tx.id);
  await logAudit({ userId: user.id, transactionId: tx.id, action: `تفريغ جدول السائقين (${count} صف)` });
  return ok({ deleted: count });
});
