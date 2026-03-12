import React from 'react';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { Activity, Battery, Zap, AlertCircle, AlertTriangle } from 'lucide-react';

export default function CalculationResults() {
  const { result, isCalculating } = useWorkspaceStore();

  if (isCalculating) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <Activity className="w-8 h-8 animate-pulse text-emerald-500 mb-4" />
        <p>جاري الحساب السحابي المتقدم...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
        <AlertCircle className="w-8 h-8 mb-4 opacity-50" />
        <p>قم بتحديث الحسابات لعرض النتائج هنا.</p>
      </div>
    );
  }

  const { engineering, recommendation, pricing } = result;

  return (
    <div className="space-y-6">
      
      {/* Warnings Section */}
      {engineering.warnings && engineering.warnings.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span>تحذيرات التوازن الهندسي</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-800 dark:text-red-300">
            {engineering.warnings.map((w: string, i: number) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Engineering Summary */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">نظرة هندسية</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="إجمالي الاستهلاك اليومي" value={`${(engineering.total_wh / 1000).toFixed(2)} kWh`} icon={<Zap className="w-4 h-4 text-amber-500" />} />
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
             <p className="text-xs text-slate-500 mb-1">الاستهلاك بعد الفواقد</p>
             <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
               {engineering.total_wh_after_losses ? (engineering.total_wh_after_losses / 1000).toFixed(2) : '-'} kWh
             </p>
          </div>
          <StatBox label="أقصى حمل مستمر" value={`${engineering.peak_continuous_w} W`} />
          <StatBox label="حمل الإقلاع (Surge)" value={`${engineering.peak_surge_w} W`} />
          <StatBox label="ألواح مطلوبة" value={`${(engineering.required_panel_w / 1000).toFixed(2)} kW`} />
          <StatBox label="تخزين مطلوب" value={`${engineering.required_ah} Ah`} icon={<Battery className="w-4 h-4 text-blue-500" />} />
        </div>
      </div>

      {/* Recommended Components */}
      <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">التكوين المقترح</h3>
        
        <div className="space-y-2">
          <ComponentRow 
            type="Panel" 
            count={recommendation.panels.count} 
            item={recommendation.panels.item} 
          />
          {recommendation.batteries.needed && (
            <ComponentRow 
              type="Battery" 
              count={recommendation.batteries.count} 
              item={recommendation.batteries.item} 
            />
          )}
          <ComponentRow 
            type="Inverter" 
            count={recommendation.inverter.count || 1} 
            item={recommendation.inverter.item} 
          />
        </div>
      </div>

    </div>
  );
}

function StatBox({ label, value, icon }: { label: string, value: string, icon?: React.ReactNode }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-slate-500">{label}</p>
        {icon && icon}
      </div>
      <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}

function ComponentRow({ type, count, item }: { type: string, count: number, item: any }) {
  if (!item) return null;
  
  return (
    <div className="flex justify-between items-center p-3 rounded-lg border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800 text-sm">
      <div className="flex flex-col">
        <span className="font-bold text-slate-800 dark:text-slate-200">{item.brand} - {item.model}</span>
        <span className="text-xs text-slate-500 uppercase">{type}</span>
      </div>
      <div className="font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded">
        x{count}
      </div>
    </div>
  );
}
