import React from 'react';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { useCurrencyStore } from '../../../store/currencyStore';
import { DollarSign, FileText, Percent } from 'lucide-react';

export default function PricingCapacityPanel() {
  const { result } = useWorkspaceStore();
  const { formatPrice } = useCurrencyStore();

  if (!result || !result.pricing) return null;

  const { pricing } = result;

  return (
    <div className="mt-8 p-5 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <DollarSign className="w-5 h-5 text-emerald-500" />
        <h3 className="font-bold text-slate-800 dark:text-slate-100">تحليل التسعير النهائي</h3>
      </div>
      
      <div className="space-y-3 text-sm">
        <div className="flex justify-between items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <span className="text-slate-500 font-medium">تكلفة الألواح</span>
          <span className="font-bold text-slate-700 dark:text-slate-300">{formatPrice(pricing.panels_cost || 0)}</span>
        </div>
        <div className="flex justify-between items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <span className="text-slate-500 font-medium">تكلفة البطاريات</span>
          <span className="font-bold text-slate-700 dark:text-slate-300">{formatPrice(pricing.batteries_cost || 0)}</span>
        </div>
        <div className="flex justify-between items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <span className="text-slate-500 font-medium">تكلفة الإنفرتر</span>
          <span className="font-bold text-slate-700 dark:text-slate-300">{formatPrice(pricing.inverter_cost || 0)}</span>
        </div>
        
        {/* Cost of other components to be added in future features */}
        
        <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl">
            <span className="font-bold text-emerald-800 dark:text-emerald-200 text-lg">إجمالي التكلفة</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatPrice(pricing.total_items_cost || 0)}
            </span>
          </div>
        </div>
        
        <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
           <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-sm transition-colors">
             <Percent className="w-4 h-4" />
             تعديل الهوامش
           </button>
           <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition-colors shadow-sm">
             <FileText className="w-4 h-4" />
             إنشاء عرض سعر
           </button>
        </div>
      </div>
    </div>
  );
}
