import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";

export const GET = handler(async (req: NextRequest) => {
  await requireUser();
  const sp = req.nextUrl.searchParams;
  const where: Record<string, unknown> = {};
  if (sp.get("transaction_id")) where.transaction_id = Number(sp.get("transaction_id"));
  if (sp.get("user_id")) where.user_id = Number(sp.get("user_id"));
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = 50;
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { name: true } },
        transaction: { select: { internal_number: true } },
      },
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return ok({ items, total, page, pageSize });
});
