import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, WRITE_ROLES } from "@/lib/auth";
import { handler, ok, fail, parseIntOrNull } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const GET = handler(async () => {
  await requireUser();
  const items = await prisma.errorRegister.findMany({
    include: {
      creator: { select: { name: true } },
      transaction: { select: { id: true, internal_number: true } },
    },
    orderBy: { id: "desc" },
    take: 500,
  });
  return ok({ items });
});

// توثيق خطأ في سجل الأخطاء (للتعلم ومنع التكرار)
export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser(WRITE_ROLES);
  const b = await req.json();
  if (!b.error_type?.trim() || !b.error_description?.trim()) {
    return fail("نوع الخطأ ووصفه إلزاميان");
  }
  const item = await prisma.errorRegister.create({
    data: {
      transaction_id: parseIntOrNull(b.transaction_id),
      error_type: b.error_type.trim(),
      error_description: b.error_description.trim(),
      cause: b.cause?.trim() || null,
      impact: b.impact?.trim() || null,
      prevention_method: b.prevention_method?.trim() || null,
      created_by: user.id,
    },
  });
  await logAudit({ userId: user.id, transactionId: item.transaction_id, action: `توثيق خطأ في سجل الأخطاء: ${item.error_type}` });
  return ok({ item }, 201);
});
