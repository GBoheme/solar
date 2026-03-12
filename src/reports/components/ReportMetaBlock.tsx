import React from 'react';

export interface MetaColumn {
  heading: string;
  rows: Array<{ label: string; value: React.ReactNode }>;
}

interface ReportMetaBlockProps {
  columns: MetaColumn[];
}

/**
 * Multi-column key-value metadata panel.
 * Used for customer info, system details, expected loads, etc.
 * Renders inside a rounded bordered panel with dividers between columns.
 */
export default function ReportMetaBlock({ columns }: ReportMetaBlockProps) {
  return (
    <div className="report-section-bg bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 grid shrink-0 gap-4"
      style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
    >
      {columns.map((col, i) => (
        <div key={i} className={i < columns.length - 1 ? 'border-l border-slate-200 pl-4' : ''}>
          <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase">{col.heading}</h3>
          <div className="text-xs space-y-1 text-slate-600">
            {col.rows.map((row, j) => (
              <div key={j} className="flex justify-between">
                <span>{row.label}</span>
                <span className="font-bold text-slate-800">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
