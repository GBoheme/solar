import React from 'react';

export interface SummaryLine {
  label: string;
  value: React.ReactNode;
  /** Optional emphasis style */
  bold?: boolean;
  /** Optional color class, e.g. 'text-emerald-600' */
  colorClass?: string;
  /** Show a dashed separator below this line */
  separator?: boolean;
}

interface ReportSummaryProps {
  lines: SummaryLine[];
  /** Grand total label */
  totalLabel?: string;
  /** Grand total value */
  totalValue: React.ReactNode;
  /** Width class for the summary box (default w-[240px]) */
  width?: string;
}

/**
 * Cost/price summary panel typically placed at the bottom-right of a report.
 * Shows line items and a highlighted grand total.
 */
export default function ReportSummary({ lines, totalLabel = 'الإجمالي النهائي', totalValue, width = 'w-[240px]' }: ReportSummaryProps) {
  return (
    <div className={`${width} border border-slate-200 rounded-xl p-4 bg-white flex flex-col justify-between print-avoid-break`}>
      <div className="space-y-2 text-xs">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`flex justify-between ${line.colorClass ?? 'text-slate-600'} ${line.bold ? 'font-bold' : ''} ${line.separator ? 'border-b border-dashed border-slate-200 pb-2' : ''}`}
          >
            <span>{line.label}</span>
            <span className="font-mono">{line.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200">
        <div className="flex justify-between items-end mb-1">
          <span className="text-sm font-bold text-slate-900">{totalLabel}</span>
          <span className="text-xl font-black text-slate-900 font-mono">{totalValue}</span>
        </div>
      </div>
    </div>
  );
}
