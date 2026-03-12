import React from 'react';

interface ReportSectionProps {
  /** Section title */
  title: string;
  /** Optional icon rendered before the title */
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Optional className for the wrapper */
  className?: string;
}

/**
 * A titled section within a report.
 * Uses a colored accent bar before the title and wraps children
 * in a bordered panel with avoid-break semantics.
 */
export default function ReportSection({ title, icon, children, className }: ReportSectionProps) {
  return (
    <div className={`print-avoid-break ${className ?? ''}`}>
      <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
        <div className="report-accent-bar w-1 h-4 bg-amber-500 rounded-full" />
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}
