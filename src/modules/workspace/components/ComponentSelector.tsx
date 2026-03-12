import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { Battery, Lock, Unlock, AlertCircle } from 'lucide-react';
import { useCurrencyStore } from '../../../store/currencyStore';

export default function ComponentSelector() {
  const { selectedComponents, selectComponent, setCountOverride, lockComponent, result } = useWorkspaceStore();
  const { formatPrice } = useCurrencyStore();

  const [panels, setPanels] = useState<any[]>([]);
  const [batteries, setBatteries] = useState<any[]>([]);
  const [inverters, setInverters] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/products?category=panel').then(r => r.json()),
      fetch('/api/products?category=battery').then(r => r.json()),
      fetch('/api/products?category=inverter').then(r => r.json())
    ]).then(([p, b, i]) => {
      setPanels(p);
      setBatteries(b);
      setInverters(i);
    }).catch(console.error);
  }, []);

  const rec = result?.recommendation;

  const renderSelector = (
    title: string,
    type: 'panel' | 'battery' | 'inverter',
    options: any[],
    selectedId: string | undefined,
    countOverride: number | undefined,
    isLocked: boolean | undefined,
    suggestedItem: any,
    suggestedCount: number
  ) => {
    
    const activeItem = options?.find(o => o.id === (selectedId || suggestedItem?.id));
    const activeCount = countOverride !== undefined ? countOverride : suggestedCount;

    return (
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          <button 
            onClick={() => lockComponent(type, !isLocked)}
            className={`p-1.5 rounded-lg transition-colors ${isLocked ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'bg-slate-200 text-slate-500 hover:bg-slate-300 dark:bg-slate-700'}`}
            title={isLocked ? "مغلق (تعطيل الاقتراح التلقائي)" : "مفتوح (يخضع للاقتراح التلقائي)"}
          >
            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">الموديل</label>
            <select 
              value={selectedId || suggestedItem?.id || ''}
              onChange={(e) => {
                selectComponent(type, e.target.value);
                if (!isLocked) lockComponent(type, true);
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="" disabled>اختر {title}...</option>
              {options?.map(o => (
                <option key={o.id} value={o.id}>
                  {o.brand} - {o.model} {o.cost_price ? `(${formatPrice(o.cost_price)})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">العدد المطلوب</label>
              <input 
                type="number" 
                min="0"
                value={activeCount || 0}
                onChange={(e) => setCountOverride(type, parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            {activeItem?.cost_price && (
              <div className="w-1/3">
                 <label className="text-xs text-slate-500 mb-1 block">الإجمالي</label>
                 <div className="px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700/50 rounded-lg text-center">
                   {formatPrice(activeCount * activeItem.cost_price)}
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
        <Battery className="w-5 h-5 text-blue-500" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">تحديد وإجبار المكونات</h2>
      </div>

      {!result && (
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg flex items-start gap-2 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>قم بتحديث الحسابات أولاً للحصول على اقتراحات النظام، ثم يمكنك تعديل المكونات وتثبيتها من هنا.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {renderSelector(
          'الألواح الشمسية',
          'panel',
          panels || [],
          selectedComponents.panelId,
          selectedComponents.panelCountOverride,
          selectedComponents.lockPanel,
          rec?.panels?.item,
          rec?.panels?.count || 0
        )}
        
        {renderSelector(
          'البطاريات',
          'battery',
          batteries || [],
          selectedComponents.batteryId,
          selectedComponents.batteryCountOverride,
          selectedComponents.lockBattery,
          rec?.batteries?.item,
          rec?.batteries?.count || 0
        )}

        {renderSelector(
          'الإنفرتر',
          'inverter',
          inverters || [],
          selectedComponents.inverterId,
          selectedComponents.inverterQtyOverride,
          selectedComponents.lockInverter,
          rec?.inverter?.item,
          rec?.inverter?.count || 1 // defaulting inverter count to 1 if not provided by backend explicitly
        )}
      </div>
    </div>
  );
}
