import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handler, ok, fail } from "@/lib/api";
import { buildExcel } from "@/lib/excel";
import { STATUSES, CUT_FORM_STATUSES, fmtDate, fmtNum } from "@/lib/constants";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Report = { title: string; headers: string[]; rows: (string | number | null)[][] };

const statusAr = (s: string) => (STATUSES as Record<string, string>)[s] ?? s;

async function txReport(where: any, title: string): Promise<Report> {
  const items = await prisma.transaction.findMany({
    where,
    include: {
      transaction_type: true, target_department: true, company: true,
      creator: { select: { name: true } },
      _count: { select: { drivers: true, cut_forms: true, attachments: true } },
    },
    orderBy: { id: "desc" },
    take: 1000,
  });
  return {
    title,
    headers: ["الرقم الداخلي", "النوع", "العنوان", "الجهة", "الشركة", "الحالة", "السيارات", "الاستمارات", "المرفقات", "المنشئ", "تاريخ الإنشاء"],
    rows: items.map((t) => [
      t.internal_number, t.transaction_type.name, t.subject,
      t.target_department?.short_name ?? "—", t.company?.short_name ?? t.company?.official_name ?? "—",
      statusAr(t.status), t._count.drivers, t._count.cut_forms, t._count.attachments,
      t.creator.name, fmtDate(t.created_at),
    ]),
  };
}

async function buildReport(type: string): Promise<Report> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 1) % 7)); // السبت بداية الأسبوع
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  switch (type) {
    case "today": return txReport({ created_at: { gte: startOfDay } }, "معاملات اليوم");
    case "week": return txReport({ created_at: { gte: startOfWeek } }, "معاملات هذا الأسبوع");
    case "awaiting-review": return txReport({ status: "AWAITING_REVIEW" }, "المعاملات بانتظار التدقيق");
    case "monthly": {
      const r = await txReport({ created_at: { gte: startOfMonth } }, "تقرير الإنجاز الشهري");
      const issued = await prisma.transaction.count({ where: { created_at: { gte: startOfMonth }, status: { in: ["ISSUED_PDF", "SENT", "ARCHIVED"] } } });
      r.title += ` — الصادر النهائي: ${issued}`;
      return r;
    }
    case "by-department": {
      const agg = await prisma.transaction.groupBy({ by: ["target_department_id", "status"], _count: true });
      const depts = await prisma.department.findMany();
      return {
        title: "المعاملات حسب الجهة",
        headers: ["الجهة", "الحالة", "العدد"],
        rows: agg.map((a) => [
          depts.find((d) => d.id === a.target_department_id)?.short_name ?? "غير محدد",
          statusAr(a.status), a._count,
        ]),
      };
    }
    case "by-company": {
      const agg = await prisma.transaction.groupBy({ by: ["company_id"], _count: true });
      const companies = await prisma.company.findMany();
      return {
        title: "المعاملات حسب الشركة",
        headers: ["الشركة", "العدد"],
        rows: agg.map((a) => [
          companies.find((c) => c.id === a.company_id)?.official_name ?? "غير محدد", a._count,
        ]),
      };
    }
    case "by-route": {
      const agg = await prisma.transactionRoute.groupBy({ by: ["route_id"], _count: true });
      const routes = await prisma.route.findMany();
      return {
        title: "المعاملات حسب المسار",
        headers: ["كود المسار", "المسار", "العدد"],
        rows: agg.map((a) => {
          const r = routes.find((x) => x.id === a.route_id);
          return [r?.code ?? "?", r?.official_description ?? "?", a._count];
        }),
      };
    }
    case "by-source": {
      const agg = await prisma.cutForm.groupBy({ by: ["loading_source_id"], _count: true, _sum: { cut_quantity: true, loaded_quantity: true, remaining_quantity: true } });
      const sources = await prisma.loadingSource.findMany();
      return {
        title: "الاستمارات والكميات حسب مصدر التجهيز",
        headers: ["مصدر التجهيز", "عدد الاستمارات", "المقطوعة", "المجهزة", "المتبقية"],
        rows: agg.map((a) => [
          sources.find((s) => s.id === a.loading_source_id)?.name ?? "غير محدد",
          a._count, a._sum.cut_quantity ?? 0, a._sum.loaded_quantity ?? 0, a._sum.remaining_quantity ?? 0,
        ]),
      };
    }
    case "cut-forms-open":
    case "cut-forms-closed": {
      const open = type === "cut-forms-open";
      const items = await prisma.cutForm.findMany({
        where: { status: open ? { in: ["OPEN", "PARTIALLY_LOADED"] } : { in: ["CLOSED", "EXPIRED"] } },
        include: { loading_source: true, transaction: { select: { internal_number: true } } },
        orderBy: { id: "desc" },
      });
      return {
        title: open ? "استمارات القطع المفتوحة" : "استمارات القطع المغلقة",
        headers: ["رقم الاستمارة", "التاريخ", "المصدر", "المنتج", "المقطوعة", "المجهزة", "المتبقية", "الحالة", "المعاملة"],
        rows: items.map((cf) => [
          cf.form_number, fmtDate(cf.form_date), cf.loading_source?.name ?? "—", cf.product ?? "—",
          fmtNum(cf.cut_quantity), fmtNum(cf.loaded_quantity), fmtNum(cf.remaining_quantity),
          (CUT_FORM_STATUSES as Record<string, string>)[cf.status] ?? cf.status,
          cf.transaction?.internal_number ?? "—",
        ]),
      };
    }
    case "quantities": {
      const agg = await prisma.cutForm.aggregate({ _sum: { cut_quantity: true, loaded_quantity: true, remaining_quantity: true }, _count: true });
      return {
        title: "إجمالي الكميات المقطوعة والمجهزة والمتبقية",
        headers: ["عدد الاستمارات", "المقطوعة", "المجهزة", "المتبقية"],
        rows: [[agg._count, agg._sum.cut_quantity ?? 0, agg._sum.loaded_quantity ?? 0, agg._sum.remaining_quantity ?? 0]],
      };
    }
    case "drivers": {
      const items = await prisma.driver.findMany({
        include: { transaction: { select: { internal_number: true } } },
        orderBy: [{ transaction_id: "desc" }, { sequence_no: "asc" }],
        take: 2000,
      });
      return {
        title: "السيارات والسائقون حسب المعاملة",
        headers: ["المعاملة", "ت", "اسم السائق", "رقم السيارة", "المحافظة", "نوع المركبة"],
        rows: items.map((d) => [
          d.transaction.internal_number, d.sequence_no, d.driver_name, d.vehicle_number,
          d.governorate ?? "—", d.vehicle_type ?? "—",
        ]),
      };
    }
    case "missing-attachments": {
      const items = await prisma.attachment.findMany({
        where: { OR: [{ file_url: null }, { is_required: true, is_verified: false }] },
        include: { transaction: { select: { internal_number: true, status: true } } },
      });
      return {
        title: "المرفقات الناقصة أو غير المدققة",
        headers: ["المعاملة", "المرفق", "الحالة"],
        rows: items.map((a) => [
          a.transaction.internal_number, a.title,
          !a.file_url ? "الملف غير مرفوع" : "إلزامي وغير مدقق",
        ]),
      };
    }
    case "top-errors": {
      const agg = await prisma.validationError.groupBy({ by: ["error_type", "severity"], _count: true, orderBy: { _count: { error_type: "desc" } } });
      return {
        title: "أكثر الأخطاء تكراراً",
        headers: ["نوع الخطأ", "الخطورة", "التكرار"],
        rows: agg.map((a) => [a.error_type, a.severity === "CRITICAL" ? "حرج" : "تحذير", a._count]),
      };
    }
    case "errors-by-user": {
      const items = await prisma.errorRegister.findMany({ include: { creator: { select: { name: true } } } });
      const byUser = new Map<string, number>();
      for (const e of items) byUser.set(e.creator.name, (byUser.get(e.creator.name) ?? 0) + 1);
      return {
        title: "سجل الأخطاء حسب المستخدم",
        headers: ["المستخدم", "عدد الأخطاء المسجلة"],
        rows: [...byUser.entries()].map(([n, c]) => [n, c]),
      };
    }
    case "errors-by-type": {
      const errs = await prisma.validationError.findMany({ include: { transaction: { include: { transaction_type: true } } } });
      const byType = new Map<string, number>();
      for (const e of errs) {
        const t = e.transaction.transaction_type.name;
        byType.set(t, (byType.get(t) ?? 0) + 1);
      }
      return {
        title: "الأخطاء حسب نوع المعاملة",
        headers: ["نوع المعاملة", "عدد الأخطاء"],
        rows: [...byType.entries()].map(([n, c]) => [n, c]),
      };
    }
    default:
      throw new Error("نوع تقرير غير معروف");
  }
}

export const GET = handler(async (req: NextRequest) => {
  await requireUser();
  const type = req.nextUrl.searchParams.get("type") || "today";
  const format = req.nextUrl.searchParams.get("format");
  let report: Report;
  try {
    report = await buildReport(type);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "خطأ في التقرير");
  }
  if (format === "xlsx") {
    const buf = buildExcel(report.title.slice(0, 31), report.headers, report.rows);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(type + ".xlsx")}`,
      },
    });
  }
  return ok({ report });
});
