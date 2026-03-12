import { Sun } from 'lucide-react';
import { brandConfig } from '../config/brandConfig';

interface ReportHeaderProps {
  /** Report title, e.g. "عرض سعر فني" */
  title: string;
  /** Reference number, e.g. "QT-123456" */
  refNumber: string;
  /** Date string (dd/mm/yyyy) */
  date: string;
  /** Optional label for the ref field (default "رقم العرض") */
  refLabel?: string;
}

/**
 * Professional report header stripe.
 * Shows company logo/name on the right, report title + ref/date on the left.
 * Uses print-safe forced backgrounds via .report-header-bg.
 */
export default function ReportHeader({ title, refNumber, date, refLabel = 'رقم العرض' }: ReportHeaderProps) {
  const { company, logo } = brandConfig;

  return (
    <div className="report-header-bg bg-slate-900 text-white p-6 shrink-0 relative flex justify-between items-center">
      {/* Decorative glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full -mr-16 -mt-16 blur-2xl print:hidden" />

      {/* Company brand */}
      <div className="relative z-10 flex items-center gap-4">
        {logo.type === 'icon' ? (
          <div className={`p-3 ${logo.iconBgClass} rounded-xl ${logo.iconTextClass}`}>
            <Sun className="w-8 h-8" />
          </div>
        ) : (
          <img src={logo.logoUrl} alt={company.nameEn} className="h-12 w-auto object-contain" />
        )}
        <div>
          <h1 className="text-2xl font-black text-amber-500 tracking-tight">{company.nameAr}</h1>
          <p className="text-slate-300 text-xs font-medium">{company.sloganAr}</p>
        </div>
      </div>

      {/* Report meta box */}
      <div className="relative z-10 text-left bg-slate-800/50 backdrop-blur-sm p-3 rounded-xl border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-1">{title}</h2>
        <div className="text-xs text-slate-400 grid grid-cols-2 gap-x-4 gap-y-1">
          <span>{refLabel}:</span>
          <span className="font-mono text-white text-right">{refNumber}</span>
          <span>التاريخ:</span>
          <span className="font-mono text-white text-right">{date}</span>
        </div>
      </div>
    </div>
  );
}
