import React from 'react';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { History, GitBranch, Save } from 'lucide-react';

export default function ScenarioLab() {
  const { config, result } = useWorkspaceStore();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 overflow-hidden mt-6">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">مختبر السيناريوهات (Scenario Lab)</h2>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
          <Save className="w-3.5 h-3.5" />
          حفظ كسيناريو جديد
        </button>
      </div>

      <div className="text-center py-8">
        <History className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1">لا توجد سيناريوهات محفوظة</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          يمكنك حفظ أكثر من سيناريو (مثلاً: نظام اقتصادي مقابل نظام عالي الأداء) والمقارنة بينهم قبل إصدار عرض السعر النهائي.
        </p>
      </div>
    </div>
  );
}
