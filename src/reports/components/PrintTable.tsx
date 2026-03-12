import React from 'react';

export interface PrintTableColumn {
  key: string;
  header: string;
  /** Tailwind width class, e.g. 'w-8', 'w-24' */
  width?: string;
  /** Text alignment class, default 'text-right' */
  align?: string;
}

export interface PrintTableRow {
  [key: string]: React.ReactNode;
}

interface PrintTableProps {
  columns: PrintTableColumn[];
  rows: PrintTableRow[];
  /** Optional className for the outer wrapper */
  className?: string;
}

/**
 * Print-safe data table with repeatable headers.
 *
 * Features:
 * - thead uses display:table-header-group for multi-page repeat
 * - tr uses page-break-inside:avoid
 * - Alternating subtle zebra on hover (screen only)
 * - Clean borders suitable for print
 */
export default function PrintTable({ columns, rows, className }: PrintTableProps) {
  return (
    <div className={`border border-slate-200 rounded-xl overflow-hidden ${className ?? ''}`}>
      <table className="w-full text-right text-xs">
        <thead>
          <tr className="report-table-header bg-slate-100 text-slate-600 border-b border-slate-200">
            {columns.map(col => (
              <th
                key={col.key}
                className={`py-2 px-3 font-medium ${col.width ?? ''} ${col.align ?? 'text-right'}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50 print-avoid-break">
              {columns.map(col => (
                <td
                  key={col.key}
                  className={`py-2 px-3 ${col.align ?? ''}`}
                >
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
