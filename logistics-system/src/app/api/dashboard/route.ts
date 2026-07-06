import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
import { OPEN_STATUSES } from "@/lib/constants";

export const GET = handler(async () => {
  await requireUser();

  const [
    openCount, missingData, missingAttachments, awaitingReview,
    readyToIssue, returned, totalCount,
    byStatus, byType, byDepartment,
    recent, topErrors, unresolvedErrors,
  ] = await Promise.all([
    prisma.transaction.count({ where: { status: { in: OPEN_STATUSES } } }),
    prisma.transaction.count({ where: { status: { in: ["MISSING_DATA", "MISSING_ATTACHMENTS"] } } }),
    prisma.transaction.count({ where: { status: "MISSING_ATTACHMENTS" } }),
    prisma.transaction.count({ where: { status: "AWAITING_REVIEW" } }),
    prisma.transaction.count({ where: { status: { in: ["READY_TO_ISSUE", "REVIEWED"] } } }),
    prisma.transaction.count({ where: { status: "RETURNED_FOR_CORRECTION" } }),
    prisma.transaction.count(),
    prisma.transaction.groupBy({ by: ["status"], _count: true }),
    prisma.transaction.groupBy({ by: ["transaction_type_id"], _count: true }),
    prisma.transaction.groupBy({ by: ["target_department_id"], _count: true }),
    prisma.transaction.findMany({
      take: 8,
      orderBy: { id: "desc" },
      include: {
        transaction_type: { select: { name: true } },
        target_department: { select: { short_name: true } },
        _count: { select: { validation_errors: true } },
      },
    }),
    prisma.validationError.groupBy({ by: ["error_type"], _count: true, orderBy: { _count: { error_type: "desc" } }, take: 8 }),
    prisma.validationError.findMany({
      where: { is_resolved: false },
      take: 10,
      orderBy: { id: "desc" },
      include: { transaction: { select: { internal_number: true, id: true } } },
    }),
  ]);

  const types = await prisma.transactionType.findMany({ select: { id: true, name: true } });
  const departments = await prisma.department.findMany({ select: { id: true, short_name: true } });
  const typeName = (id: number) => types.find((t) => t.id === id)?.name ?? "غير محدد";
  const deptName = (id: number | null) => (id ? departments.find((d) => d.id === id)?.short_name ?? "غير محدد" : "غير محدد");

  // معاملات حسب المسار
  const routeAgg = await prisma.transactionRoute.groupBy({ by: ["route_id"], _count: true });
  const routes = await prisma.route.findMany({ select: { id: true, code: true, official_description: true } });

  return ok({
    stats: {
      open: openCount,
      missing: missingData,
      missing_attachments: missingAttachments,
      awaiting_review: awaitingReview,
      ready_to_issue: readyToIssue,
      returned,
      total: totalCount,
    },
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    byType: byType.map((t) => ({ name: typeName(t.transaction_type_id), count: t._count })),
    byDepartment: byDepartment.map((d) => ({ name: deptName(d.target_department_id), count: d._count })),
    byRoute: routeAgg.map((r) => ({
      name: routes.find((x) => x.id === r.route_id)?.code ?? "?",
      description: routes.find((x) => x.id === r.route_id)?.official_description ?? "",
      count: r._count,
    })),
    recent,
    topErrors: topErrors.map((e) => ({ error_type: e.error_type, count: e._count })),
    alerts: unresolvedErrors,
  });
});
