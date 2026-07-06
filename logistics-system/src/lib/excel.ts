import * as XLSX from "xlsx";

// ==================== استيراد جداول Excel / CSV ====================
// يدعم جداول السائقين المصدّرة من Excel أو Access (CSV/XLSX)

export type ImportedDriver = {
  sequence_no: number;
  driver_name: string;
  vehicle_number: string;
  governorate?: string;
  vehicle_type?: string;
  tanker_number?: string;
  gps_info?: string;
  notes?: string;
};

// مرادفات رؤوس الأعمدة المقبولة (عربي/إنجليزي)
const HEADER_MAP: Record<string, keyof ImportedDriver> = {
  "ت": "sequence_no", "تسلسل": "sequence_no", "التسلسل": "sequence_no", "seq": "sequence_no", "no": "sequence_no", "#": "sequence_no",
  "اسم السائق": "driver_name", "السائق": "driver_name", "الاسم": "driver_name", "اسم": "driver_name", "driver": "driver_name", "name": "driver_name",
  "رقم السيارة": "vehicle_number", "رقم المركبة": "vehicle_number", "السيارة": "vehicle_number", "vehicle": "vehicle_number", "plate": "vehicle_number",
  "المحافظة": "governorate", "محافظة": "governorate", "governorate": "governorate",
  "نوع المركبة": "vehicle_type", "نوع السيارة": "vehicle_type", "النوع": "vehicle_type", "type": "vehicle_type",
  "رقم الحوضية": "tanker_number", "الحوضية": "tanker_number", "tanker": "tanker_number",
  "gps": "gps_info", "معلومات gps": "gps_info",
  "ملاحظات": "notes", "الملاحظات": "notes", "notes": "notes",
};

export function parseDriversSheet(buf: Buffer): { drivers: ImportedDriver[]; issues: string[] } {
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { drivers: [], issues: ["الملف لا يحتوي على أي ورقة بيانات"] };

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const issues: string[] = [];
  if (rows.length === 0) return { drivers: [], issues: ["الورقة فارغة"] };

  // اكتشاف صف الرؤوس
  let headerRowIdx = -1;
  let colMap: Partial<Record<keyof ImportedDriver, number>> = {};
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const map: Partial<Record<keyof ImportedDriver, number>> = {};
    rows[i].forEach((cell, ci) => {
      const key = String(cell).trim().toLowerCase().replace(/\s+/g, " ");
      const arKey = String(cell).trim().replace(/\s+/g, " ");
      const field = HEADER_MAP[key] || HEADER_MAP[arKey];
      if (field && map[field] === undefined) map[field] = ci;
    });
    if (map.driver_name !== undefined && map.vehicle_number !== undefined) {
      headerRowIdx = i;
      colMap = map;
      break;
    }
  }

  let dataRows: unknown[][];
  if (headerRowIdx >= 0) {
    dataRows = rows.slice(headerRowIdx + 1);
  } else {
    // لا رؤوس — نفترض ترتيباً موضعياً: تسلسل، اسم، رقم سيارة، محافظة، نوع، ملاحظات
    issues.push("لم يتم العثور على صف رؤوس واضح — تم الاستيراد بالترتيب الموضعي (تسلسل، اسم السائق، رقم السيارة، المحافظة، نوع المركبة، ملاحظات)");
    colMap = { sequence_no: 0, driver_name: 1, vehicle_number: 2, governorate: 3, vehicle_type: 4, notes: 5 };
    dataRows = rows;
  }

  const drivers: ImportedDriver[] = [];
  let autoSeq = 0;
  for (const row of dataRows) {
    const get = (f: keyof ImportedDriver) =>
      colMap[f] !== undefined ? String(row[colMap[f]!] ?? "").trim() : "";
    const name = get("driver_name");
    const vehicle = get("vehicle_number");
    if (!name && !vehicle) continue; // صف فارغ
    autoSeq++;
    const seqRaw = get("sequence_no");
    const seq = seqRaw && !isNaN(Number(seqRaw)) ? Math.trunc(Number(seqRaw)) : autoSeq;
    if (!name) issues.push(`الصف بالتسلسل ${seq}: اسم السائق فارغ`);
    if (!vehicle) issues.push(`الصف بالتسلسل ${seq}: رقم السيارة فارغ`);
    drivers.push({
      sequence_no: seq,
      driver_name: name || "—",
      vehicle_number: vehicle || "—",
      governorate: get("governorate") || undefined,
      vehicle_type: get("vehicle_type") || undefined,
      tanker_number: get("tanker_number") || undefined,
      gps_info: get("gps_info") || undefined,
      notes: get("notes") || undefined,
    });
  }
  if (drivers.length === 0) issues.push("لم يتم العثور على أي صف بيانات صالح");
  return { drivers, issues };
}

/** تصدير صفوف إلى ملف Excel (تقارير) */
export function buildExcel(sheetName: string, headers: string[], rows: (string | number | null)[][]): Buffer {
  const wb = XLSX.utils.book_new();
  const data = [headers, ...rows.map((r) => r.map((c) => c ?? ""))];
  const ws = XLSX.utils.aoa_to_sheet(data);
  if (!wb.Workbook) wb.Workbook = {};
  if (!wb.Workbook.Views) wb.Workbook.Views = [];
  wb.Workbook.Views[0] = { RTL: true };
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
