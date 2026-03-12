import { Shield, CheckCircle2 } from 'lucide-react';
import { brandConfig } from '../config/brandConfig';

export interface WarrantyEntry {
  label: string;
  value: string;
}

interface ReportTermsProps {
  /** Warranty line items */
  warranties?: WarrantyEntry[];
  /** Override disclaimer bullets; defaults to brandConfig */
  disclaimers?: string[];
}

/**
 * Warranty & terms panel for quote/project reports.
 * Shows warranty grid + disclaimer bullet list.
 */
export default function ReportTerms({ warranties, disclaimers }: ReportTermsProps) {
  const bullets = disclaimers ?? brandConfig.report.disclaimersAr;

  return (
    <div className="flex-1 report-section-bg bg-slate-50 border border-slate-200 rounded-xl p-4 print-avoid-break">
      <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
        <Shield className="w-4 h-4 text-emerald-500" /> الضمان والشروط العامة
      </h3>

      {warranties && warranties.length > 0 && (
        <div className="grid grid-cols-2 gap-2 text-[10px] mb-3 border-b border-slate-200 pb-3">
          {warranties.map((w, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
              <span className="text-slate-600">{w.label}: <strong>{w.value}</strong></span>
            </div>
          ))}
        </div>
      )}

      <ul className="text-[10px] text-slate-500 space-y-1 list-disc list-inside">
        {bullets.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
