import fs from "fs";
import path from "path";
import type { BookPayload } from "./docgen";

// ==================== توليد PDF نهائي ====================
// يبنى الكتاب كصفحة HTML رسمية (RTL بخط نسخ عربي مدمج)
// ثم يطبع إلى PDF عبر متصفح Chromium بلا واجهة.

function resolveChromium(): string {
  const candidates = [
    process.env.CHROMIUM_PATH,
    "/opt/pw-browsers/chromium",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch { /* تجاهل */ }
  }
  throw new Error(
    "لم يتم العثور على متصفح Chromium لتوليد PDF. ثبّت chromium أو حدد المسار في متغير البيئة CHROMIUM_PATH"
  );
}

function fontDataUri(fileName: string): string {
  const p = path.join(process.cwd(), "public", "fonts", fileName);
  if (!fs.existsSync(p)) return "";
  return `data:font/ttf;base64,${fs.readFileSync(p).toString("base64")}`;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function buildBookHtml(payload: BookPayload): string {
  const naskh = fontDataUri("NotoNaskhArabic-Regular.ttf");
  const naskhBold = fontDataUri("NotoNaskhArabic-Bold.ttf");

  const cutFormsTable = payload.HasCutForms
    ? `<h3>تفاصيل استمارات القطع:</h3>
<table>
  <tr><th>رقم الاستمارة</th><th>التاريخ</th><th>مصدر التجهيز</th><th>الكمية المقطوعة</th><th>الكمية المجهزة</th><th>الكمية المتبقية</th></tr>
  ${payload.CutForms.map(
    (cf) =>
      `<tr><td>${esc(cf.number)}</td><td>${esc(cf.date)}</td><td>${esc(cf.source)}</td><td>${esc(cf.cut)}</td><td>${esc(cf.loaded)}</td><td>${esc(cf.remaining)}</td></tr>`
  ).join("\n")}
</table>`
    : "";

  const driversBlock = payload.HasDrivers
    ? `<p>علماً أن عدد السيارات (<b>${esc(payload.DriversCount)}</b>) سيارة، ويبدأ جدول السائقين بالتسلسل (<b>${esc(payload.DriversStartSeq)}</b>) وينتهي بالتسلسل (<b>${esc(payload.DriversEndSeq)}</b>) وكما مبين في الجدول أدناه.</p>
<h3>جدول السائقين والمركبات:</h3>
<table>
  <tr><th style="width:6%">ت</th><th style="width:30%">اسم السائق</th><th style="width:18%">رقم السيارة</th><th style="width:14%">المحافظة</th><th style="width:16%">نوع المركبة</th><th>ملاحظات</th></tr>
  ${payload.Drivers.map(
    (d) =>
      `<tr><td>${d.seq}</td><td>${esc(d.name)}</td><td>${esc(d.vehicle)}</td><td>${esc(d.governorate)}</td><td>${esc(d.vtype)}</td><td>${esc(d.notes)}</td></tr>`
  ).join("\n")}
</table>`
    : "";

  const attachments = payload.HasAttachments
    ? `<h3>المرفقات:</h3><ol>${payload.Attachments.map(
        (a) => `<li>${esc(a.title)}${a.number ? ` (${esc(a.number)})` : ""} — ${esc(a.type)}</li>`
      ).join("")}</ol>`
    : "";

  const bodyParts: string[] = [];
  if (payload.PreviousBookNumber) {
    bodyParts.push(
      `إشارة إلى كتابكم المرقم (${esc(payload.PreviousBookNumber)})${payload.PreviousBookDate ? ` في ${esc(payload.PreviousBookDate)}` : ""}.`
    );
  }
  const mainLine: string[] = [];
  if (payload.CompanyName) mainLine.push(`الشركة الناقلة: <b>${esc(payload.CompanyName)}</b>`);
  if (payload.Product) mainLine.push(`المنتج: <b>${esc(payload.Product)}</b>`);
  if (payload.ContractNumber)
    mainLine.push(`بموجب العقد المرقم (<b>${esc(payload.ContractNumber)}</b>)${payload.ContractDate ? ` في ${esc(payload.ContractDate)}` : ""}`);
  if (payload.TaxLetterNumber)
    mainLine.push(`وكتاب الضريبة المرقم (<b>${esc(payload.TaxLetterNumber)}</b>)${payload.TaxLetterDate ? ` في ${esc(payload.TaxLetterDate)}` : ""}`);
  if (mainLine.length) bodyParts.push(mainLine.join("، ") + ".");
  if (payload.RoutesList) bodyParts.push(`وعبر المسار: <b>${esc(payload.RoutesList)}</b>.`);

  return `<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<style>
  @font-face { font-family: "Naskh"; src: url("${naskh}") format("truetype"); font-weight: normal; }
  @font-face { font-family: "Naskh"; src: url("${naskhBold}") format("truetype"); font-weight: bold; }
  * { box-sizing: border-box; }
  body {
    font-family: "Naskh", "Noto Naskh Arabic", serif;
    direction: rtl; text-align: right;
    font-size: 13pt; line-height: 1.9; color: #111;
    margin: 0; padding: 24px 34px;
  }
  .header { text-align: center; font-weight: bold; }
  .meta { text-align: left; font-size: 11.5pt; margin-top: 8px; }
  .to, .subject { text-align: center; font-weight: bold; font-size: 14pt; margin: 6px 0; }
  .subject { text-decoration: underline; }
  h3 { font-size: 12.5pt; margin: 14px 0 6px; }
  p { margin: 8px 0; text-align: justify; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11pt; }
  th, td { border: 1px solid #333; padding: 4px 8px; text-align: center; }
  th { background: #eee; font-weight: bold; }
  ol { margin: 4px 24px 4px 0; padding: 0; }
  .signature { text-align: left; font-weight: bold; margin-top: 36px; margin-left: 40px; }
  .footer-note { font-size: 9pt; color: #555; margin-top: 24px; border-top: 1px solid #ccc; padding-top: 4px; }
</style>
</head>
<body>
  <div class="header">بسم الله الرحمن الرحيم<br>جمهورية العراق</div>
  <div class="meta">العدد: ${esc(payload.BookNumber)}<br>التاريخ: ${esc(payload.BookDate)}</div>
  <div class="to">إلى / ${esc(payload.TargetDepartment)}</div>
  <div class="subject">م / ${esc(payload.BookSubject)}</div>
  <p style="text-align:center">تحية طيبة …</p>
  ${bodyParts.map((b) => `<p>${b}</p>`).join("\n")}
  ${cutFormsTable}
  ${driversBlock}
  ${attachments}
  <p>${esc(payload.FinalRequest)}</p>
  ${payload.RelatedDepartment ? `<p>نسخة منه إلى / ${esc(payload.RelatedDepartment)}</p>` : ""}
  <div class="signature">مع التقدير</div>
  <div class="footer-note">وثيقة مولدة من نظام تدقيق وإدارة معاملات النقل اللوجستي — رقم المعاملة الداخلي: ${esc(payload.InternalNumber)}</div>
</body>
</html>`;
}

export async function htmlToPdf(html: string): Promise<Buffer> {
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({
    executablePath: resolveChromium(),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
