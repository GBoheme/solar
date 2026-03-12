import React from 'react';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { Settings2, Info } from 'lucide-react';

export default function ConfigPanel() {
  const { config, setConfig } = useWorkspaceStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
        <Settings2 className="w-5 h-5 text-indigo-500" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">إعدادات النظام الأساسية</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* System Type */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">نوع المنظومة</label>
          <select
            value={config.systemType}
            onChange={(e) => setConfig({ systemType: e.target.value as any })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="OFF_GRID">مستقلة (Off-Grid)</option>
            <option value="HYBRID">هجينة (Hybrid)</option>
            <option value="ON_GRID">متصلة (On-Grid)</option>
          </select>
        </div>

        {/* Sun Hours */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">ساعات الذروة الشمسية</label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max="10"
              step="0.1"
              value={config.regionSunHours}
              onChange={(e) => setConfig({ regionSunHours: parseFloat(e.target.value) || 5 })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white pr-12"
            />
            <span className="absolute left-4 top-2.5 text-slate-400 text-sm">ساعات</span>
          </div>
        </div>

        {/* System Voltage */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex justify-between">
            <span>فولتية النظام</span>
            <span className="text-xs text-indigo-500 cursor-pointer" onClick={() => setConfig({ systemVoltageMode: config.systemVoltageMode === 'auto' ? 'manual' : 'auto' })}>
              {config.systemVoltageMode === 'auto' ? 'تبديل لليدوي' : 'تبديل للآلي'}
            </span>
          </label>
          {config.systemVoltageMode === 'auto' ? (
            <div className="w-full px-4 py-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-500 font-medium flex items-center gap-2">
              <Info className="w-4 h-4" /> تحديد تلقائي
            </div>
          ) : (
            <select
              value={config.systemVoltage || 48}
              onChange={(e) => setConfig({ systemVoltage: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value={12}>12V</option>
              <option value={24}>24V</option>
              <option value={48}>48V</option>
            </select>
          )}
        </div>

      </div>
    </div>
  );
}
