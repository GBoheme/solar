/**
 * Report formatting helpers.
 * Stateless utility functions consumed by report templates.
 */

/** Format a date as dd/mm/yyyy (en-GB) */
export function formatReportDate(date?: Date | string): string {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleDateString('en-GB');
}

/** Format a full date/time stamp for the "Printed on" line */
export function formatPrintTimestamp(): string {
  return new Date().toLocaleString('en-GB');
}

/** Generate a report reference number with prefix and 6-digit suffix */
export function generateReportRef(prefix = 'RPT'): string {
  return `${prefix}-${String(Date.now()).slice(-6)}`;
}

/** System type label map (English key → Arabic label) */
export const systemTypeLabels: Record<string, string> = {
  hybrid: 'نظام مرن (هجين)',
  HYBRID: 'نظام مرن (هجين)',
  off_grid: 'نظام مستقل',
  OFF_GRID: 'نظام مستقل',
  on_grid: 'نظام متصل',
  ON_GRID: 'نظام متصل',
  backup: 'نظام طوارئ',
  solar_direct: 'نظام نهاري مباشر',
};

/** Quote status label map */
export const quoteStatusLabels: Record<string, string> = {
  draft: 'مسودة',
  approved: 'مقبول',
  sent: 'مرسل',
  won: 'فائز',
  lost: 'خسران',
  expired: 'منتهي',
};

/** Trigger browser print dialog */
export function triggerPrint(): void {
  window.print();
}
