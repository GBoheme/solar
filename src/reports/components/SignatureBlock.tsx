interface SignatureBlockProps {
  /** Labels for each signature column */
  labels?: string[];
}

/**
 * Signature area at the bottom of formal reports.
 * Renders side-by-side signature lines with labels.
 * Uses .report-signature-block to avoid page-break.
 */
export default function SignatureBlock({ labels = ['توقيع المشتري', 'توقيع البائع'] }: SignatureBlockProps) {
  return (
    <div className="report-signature-block mt-8 grid gap-8 print-avoid-break"
      style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}
    >
      {labels.map((label, i) => (
        <div key={i} className="text-center">
          <div className="border-b border-slate-300 mb-2 h-12" />
          <p className="text-xs text-slate-500 font-medium">{label}</p>
        </div>
      ))}
    </div>
  );
}
