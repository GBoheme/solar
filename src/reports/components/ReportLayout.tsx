import React from 'react';

interface ReportLayoutProps {
  children: React.ReactNode;
  /** When true the wrapper is hidden on screen and shown only for print */
  printOnly?: boolean;
  /** Optional className override on the outermost wrapper */
  className?: string;
}

/**
 * A4 page wrapper for print reports.
 *
 * Usage:
 *   <ReportLayout>
 *     <ReportHeader ... />
 *     <div className="report-body"> ... </div>
 *     <ReportFooter />
 *   </ReportLayout>
 *
 * Provides:
 * - Exact A4 dimensions (210mm × 297mm)
 * - White background, hidden overflow
 * - Flex column layout for header/body/footer
 * - .report-page class for print CSS page-break control
 */
export default function ReportLayout({ children, printOnly, className }: ReportLayoutProps) {
  return (
    <div
      className={`${printOnly ? 'hidden print:flex' : 'flex'} w-full justify-center bg-white ${className ?? ''}`}
      data-report-root
    >
      <div className="report-page w-[210mm] min-h-[297mm] bg-white shadow-2xl print:shadow-none relative overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  );
}
