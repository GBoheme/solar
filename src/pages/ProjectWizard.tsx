import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAmperQuoteStore } from '../store/amperQuoteStore';
import { useProjectStore } from '../store/projectStore';
import ProjectTypeStep from '../modules/smart-assistant/ProjectTypeStep';
import RegionSelector from '../modules/smart-assistant/RegionSelector';
import ApplianceLibrary from '../modules/smart-assistant/ApplianceLibrary';
import SystemRecommendation from '../modules/smart-assistant/SystemRecommendation';
import QuickAmperStep from '../modules/smart-assistant/QuickAmperStep';
import WelcomeOnboarding from '../components/WelcomeOnboarding';
import { Zap, Home, MapPin, PlugZap, CheckCircle2, Settings2 } from 'lucide-react';

const WIZARD_STEPS = [
  { num: 1, label: 'نوع المبنى', icon: Home },
  { num: 2, label: 'الموقع والنظام', icon: MapPin },
  { num: 3, label: 'الأجهزة', icon: PlugZap },
  { num: 4, label: 'التوصية', icon: CheckCircle2 },
];

export default function ProjectWizard() {
  const { step } = useProjectStore();
  const { isQuickMode, toggleQuickMode } = useAmperQuoteStore();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('solar-onboarding-seen');
    if (!seen) setShowOnboarding(true);
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    localStorage.setItem('solar-onboarding-seen', 'true');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Welcome Onboarding for first-time users */}
      <AnimatePresence>
        {showOnboarding && <WelcomeOnboarding onComplete={handleOnboardingComplete} />}
      </AnimatePresence>

      {/* ── Visual Step Progress Bar ── */}
      {!isQuickMode && (
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {WIZARD_STEPS.map((s, i) => {
                const isActive = step === s.num;
                const isDone = step > s.num;
                const Icon = s.icon;
                return (
                  <React.Fragment key={s.num}>
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isDone ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' :
                        isActive ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-4 ring-amber-500/20' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <span className={`text-sm font-bold hidden sm:block transition-colors ${
                        isActive ? 'text-amber-600 dark:text-amber-400' :
                        isDone ? 'text-emerald-600 dark:text-emerald-400' :
                        'text-slate-400 dark:text-slate-500'
                      }`}>{s.label}</span>
                    </div>
                    {i < WIZARD_STEPS.length - 1 && (
                      <div className={`flex-1 h-1 mx-1 sm:mx-2 rounded-full transition-all duration-500 ${
                        step > s.num ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Advanced Mode Toggle (subtle, not prominent) ── */}
      <div className="max-w-5xl mx-auto px-4 pt-4 flex justify-end">
        <button
          onClick={toggleQuickMode}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isQuickMode
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          {isQuickMode ? 'العودة للوضع التفصيلي' : 'وضع متقدم (أمبير)'}
        </button>
      </div>

      <div className="pt-4 px-4 md:px-8 pb-20">
        {isQuickMode ? (
          <QuickAmperStep />
        ) : (
          <>
            {step === 1 && <ProjectTypeStep />}
            {step === 2 && <RegionSelector />}
            {step === 3 && <ApplianceLibrary />}
            {step === 4 && <SystemRecommendation />}
          </>
        )}
      </div>
    </div>
  );
}
