import fs from "fs";
import path from "path";

// جذر التخزين المحلي للملفات (مرفقات + كتب مولدة + قوالب)
export const STORAGE_ROOT = path.join(process.cwd(), "storage");

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** حفظ ملف مرفوع وإرجاع مساره النسبي داخل جذر التخزين */
export async function saveUploadedFile(
  file: File,
  subdir: string,
  baseName?: string
): Promise<string> {
  const dir = ensureDir(path.join(STORAGE_ROOT, subdir));
  const ext = path.extname(file.name) || "";
  const safeBase = (baseName || path.basename(file.name, ext))
    .replace(/[^\w؀-ۿ.-]+/g, "_")
    .slice(0, 80);
  const fileName = `${Date.now()}_${safeBase}${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(dir, fileName), buf);
  return path.posix.join(subdir, fileName);
}

export function saveBuffer(buf: Buffer, subdir: string, fileName: string): string {
  const dir = ensureDir(path.join(STORAGE_ROOT, subdir));
  fs.writeFileSync(path.join(dir, fileName), buf);
  return path.posix.join(subdir, fileName);
}

export function storagePath(relative: string): string {
  const full = path.normalize(path.join(STORAGE_ROOT, relative));
  if (!full.startsWith(STORAGE_ROOT)) throw new Error("مسار ملف غير صالح");
  return full;
}

export function fileExists(relative?: string | null): boolean {
  if (!relative) return false;
  try {
    return fs.existsSync(storagePath(relative));
  } catch {
    return false;
  }
}
