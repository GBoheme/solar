import React, { useState } from 'react';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { Zap, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { WorkspaceLoadItem } from '../../../types/abpe';

export default function LoadProfileBuilder() {
  const { loads, addLoad, removeLoad, updateLoad, setQuickAmpereLoad } = useWorkspaceStore();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [quickAmps, setQuickAmps] = useState('');

  const handleAddRow = () => {
    addLoad({
      label: 'جهاز جديد',
      watts: 100,
      hoursDaily: 4,
      quantity: 1,
      usagePeriod: 'both'
    });
  };

  const handleQuickAmps = (e: React.FormEvent) => {
    e.preventDefault();
    const amps = parseFloat(quickAmps);
    if (!isNaN(amps) && amps > 0) {
      setQuickAmpereLoad(amps, 220, 4); // Default 220V and 4 hours
      setQuickAmps('');
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">بناء الأحمال (Load Profile)</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleQuickAmps} className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
            <input 
              type="number" 
              placeholder="أمبير سريع"
              value={quickAmps}
              onChange={(e) => setQuickAmps(e.target.value)}
              className="w-24 bg-transparent outline-none px-2 text-sm dark:text-white"
            />
            <button type="submit" className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-xs font-bold transition-colors">
              حساب
            </button>
          </form>

          <button 
            onClick={handleAddRow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة جهاز
          </button>
        </div>
      </div>

      {loads.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
          <Zap className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">لم يتم إضافة أي أحمال بعد</p>
          <p className="text-sm text-slate-400 mt-1">أضف جهاز أو استخدم الأمبير السريع للبدء</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">الجهاز</th>
                <th className="px-4 py-3 font-semibold w-24">العدد</th>
                <th className="px-4 py-3 font-semibold w-32">القدرة (وات)</th>
                <th className="px-4 py-3 font-semibold w-32">ساعات العمل</th>
                <th className="px-4 py-3 font-semibold w-32">فترة التشغيل</th>
                <th className="px-4 py-3 font-semibold w-24 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {loads.map((load) => (
                <LoadRow 
                  key={load.id} 
                  load={load} 
                  isEditing={isEditing === load.id}
                  onEdit={() => setIsEditing(load.id)}
                  onUpdate={(updates) => { updateLoad(load.id, updates); setIsEditing(null); }}
                  onRemove={() => removeLoad(load.id)}
                  onCancel={() => setIsEditing(null)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface LoadRowProps {
  key?: string | number;
  load: WorkspaceLoadItem;
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (u: Partial<WorkspaceLoadItem>) => void;
  onRemove: () => void;
  onCancel: () => void;
}

function LoadRow({ 
  load, isEditing, onEdit, onUpdate, onRemove, onCancel 
}: LoadRowProps) {
  const [state, setState] = useState(load);

  if (isEditing) {
    return (
      <tr className="bg-indigo-50/50 dark:bg-indigo-900/10">
        <td className="px-4 py-2">
          <input className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800" value={state.label} onChange={e => setState({...state, label: e.target.value})} />
        </td>
        <td className="px-4 py-2">
          <input type="number" className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800" value={state.quantity} onChange={e => setState({...state, quantity: parseInt(e.target.value) || 1})} />
        </td>
        <td className="px-4 py-2">
          <input type="number" className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800" value={state.watts} onChange={e => setState({...state, watts: parseInt(e.target.value) || 0})} />
        </td>
        <td className="px-4 py-2">
          <input type="number" step="0.5" className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800" value={state.hoursDaily} onChange={e => setState({...state, hoursDaily: parseFloat(e.target.value) || 0})} />
        </td>
        <td className="px-4 py-2">
          <select className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800" value={state.usagePeriod} onChange={e => setState({...state, usagePeriod: e.target.value as any})}>
            <option value="both">موزع</option>
            <option value="day">نهاراً</option>
            <option value="night">ليلاً</option>
          </select>
        </td>
        <td className="px-4 py-2 text-center flex justify-center gap-2">
          <button onClick={() => onUpdate(state)} className="p-1 hover:bg-emerald-100 text-emerald-600 rounded"><Check className="w-4 h-4" /></button>
          <button onClick={onCancel} className="p-1 hover:bg-red-100 text-red-600 rounded"><X className="w-4 h-4" /></button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">{load.label}</td>
      <td className="px-4 py-3 text-slate-500">{load.quantity}</td>
      <td className="px-4 py-3 text-slate-500">{load.watts} W</td>
      <td className="px-4 py-3 text-slate-500">{load.hoursDaily} h</td>
      <td className="px-4 py-3 text-slate-500">
        <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider ${
          load.usagePeriod === 'day' ? 'bg-amber-100 text-amber-700' :
          load.usagePeriod === 'night' ? 'bg-indigo-100 text-indigo-700' :
          'bg-slate-200 text-slate-700'
        }`}>
          {load.usagePeriod}
        </span>
      </td>
      <td className="px-4 py-3 text-center flex justify-center gap-1 opacity-0 group-hover:opacity-100 hover:opacity-100">
        <button onClick={onEdit} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded-lg"><Edit2 className="w-4 h-4" /></button>
        <button onClick={onRemove} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
      </td>
    </tr>
  );
}
