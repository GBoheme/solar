import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { requireUser } from "@/lib/auth";
import { handler, fail } from "@/lib/api";
import { storagePath } from "@/lib/storage";

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".zip": "application/zip",
};

export const GET = handler(async (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => {
  await requireUser();
  const { path: parts } = await ctx.params;
  const rel = parts.map(decodeURIComponent).join("/");
  const full = storagePath(rel);
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return fail("الملف غير موجود", 404);
  const ext = path.extname(full).toLowerCase();
  const data = fs.readFileSync(full);
  const download = req.nextUrl.searchParams.get("download") === "1";
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(path.basename(full))}`,
    },
  });
});
