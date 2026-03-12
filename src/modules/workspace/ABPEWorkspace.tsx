import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Save, RefreshCw, Download, Calculator, Settings, Activity, Battery, Zap, AlertCircle, ArrowLeftRight } from 'lucide-react';
import ConfigPanel from './components/ConfigPanel';
import LoadProfileBuilder from './components/LoadProfileBuilder';
import ComponentSelector from './components/ComponentSelector';
import CalculationResults from './components/CalculationResults';
import PricingCapacityPanel from './components/PricingCapacityPanel';
import ScenarioLab from './components/ScenarioLab';
import FastEstimatePanel from './components/FastEstimatePanel';
import WorkspaceReportA4 from './components/WorkspaceReportA4';

export default function ABPEWorkspace() {
  const { config, loadPresets, calculate, isCalculating, result } = useWorkspaceStore();
  const [activeMode, setActiveMode] = useState<'fast' | 'detailed'>('fast');

  useEffect(() => {
    // Load presets on mount if needed
    loadPresets();
  }, [loadPresets]);

  return (
    <>
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12 print:hidden">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Calculator className="w-7 h-7 text-emerald-500" />
            مساحة التسعير والحسابات المتقدمة
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            صمم، احسب، وسعّر المنظومات الشمسية بدقة عالية في مساحة عمل واحدة (إصدار تجريبي)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Mode Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveMode('fast')}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                activeMode === 'fast' 
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" /> التسعير السريع
              </span>
            </button>
            <button
              onClick={() => setActiveMode('detailed')}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                activeMode === 'detailed' 
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <Settings className="w-4 h-4" /> الوضع الهندسي
              </span>
            </button>
          </div>

          {activeMode === 'detailed' && (
            <>
              <button 
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors text-sm font-semibold whitespace-nowrap"
                // onClick={() => { /* Handle Save Preset */ }}
              >
                <Save className="w-4 h-4" />
                حفظ كقالب
              </button>
              
              <button 
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors shadow-lg shadow-emerald-500/20 text-sm font-bold disabled:opacity-50 whitespace-nowrap"
                onClick={() => calculate()}
                disabled={isCalculating}
              >
                {isCalculating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Activity className="w-4 h-4" />
                )}
                تحديث الحسابات
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeMode === 'fast' ? (
        <FastEstimatePanel 
          onConvertToDetailed={() => {
            setActiveMode('detailed');
            // Allow state to settle before triggering calculation
            setTimeout(() => calculate(), 100);
          }} 
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Left Column (Main Builder Form) */}
        <div className="col-span-1 lg:col-span-8 space-y-6">
          
          {/* Section 1: Configuration */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
             <ConfigPanel />
          </section>

          {/* Section 2: Load Profile */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
             <LoadProfileBuilder />
          </section>

          {/* Section 3: Component Selection */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
             <ComponentSelector />
          </section>

        </div>

        {/* Right Column (Live Results & Pricing) */}
        <div className="col-span-1 lg:col-span-4 space-y-6">
          <div className="sticky top-6">
            <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[calc(100vh-120px)] max-h-[850px]">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-500" />
                  موجز الحسابات والتسعير
                </h2>
              </div>
              
              <div className="p-5 flex-1 overflow-y-auto">
                <CalculationResults />
                <PricingCapacityPanel />
              </div>
              
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <button 
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl transition-colors font-bold text-sm"
                >
                  <Download className="w-4 h-4" />
                  طباعة أو حفظ تقرير (PDF)
                </button>
              </div>
            </section>
            <ScenarioLab />
          </div>
        </div>
        </div>
      )}
    </div>
    
    <WorkspaceReportA4 />
    </>
  );
}
