import { brandConfig } from '../config/brandConfig';
import { formatPrintTimestamp } from '../utils/reportHelpers';

interface ReportFooterProps {
  /** Override the copyright text */
  copyright?: string;
}

/**
 * Report footer strip at the bottom of the page.
 * Three columns: copyright | contact | print timestamp.
 * Uses .report-footer-bg for forced print background.
 */
export default function ReportFooter({ copyright }: ReportFooterProps) {
  const { contact, report } = brandConfig;
  const copyrightText = copyright ?? report.copyright;

  return (
    <div className="report-footer-bg bg-slate-100 border-t border-slate-200 p-4 shrink-0 grid grid-cols-3 text-[10px] text-slate-500 mt-auto">
      <div className="text-right">{copyrightText}</div>
      <div className="text-center">
        {contact.addressEn}
        {contact.email && ` | ${contact.email}`}
      </div>
      <div className="text-left font-mono">Printed on: {formatPrintTimestamp()}</div>
    </div>
  );
}
