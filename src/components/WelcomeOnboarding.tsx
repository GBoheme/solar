import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Battery, Zap, ArrowLeft, ArrowRight, Sparkles, Home, X } from 'lucide-react';

interface WelcomeOnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: Sun,
    iconBg: 'bg-amber-500',
    title: 'كيف تعمل الطاقة الشمسية؟',
    description: 'الألواح الشمسية تحوّل ضوء الشمس إلى كهرباء. كلما زادت ساعات الشمس في منطقتك، زادت الكهرباء المنتجة وقلّ عدد الألواح المطلوبة.',
    visual: (
      <div className="flex items-center justify-center gap-3 py-4">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center"><Sun className="w-8 h-8 text-amber-500" /></div>
          <span className="text-xs mt-2 text-slate-500 font-medium">ضوء الشمس</span>
        </div>
        <ArrowLeft className="w-6 h-6 text-amber-400 animate-pulse" />
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center"><Zap className="w-8 h-8 text-blue-500" /></div>
          <span className="text-xs mt-2 text-slate-500 font-medium">ألواح شمسية</span>
        </div>
        <ArrowLeft className="w-6 h-6 text-blue-400 animate-pulse" />
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center"><Battery className="w-8 h-8 text-emerald-500" /></div>
          <span className="text-xs mt-2 text-slate-500 font-medium">تخزين بطاريات</span>
        </div>
        <ArrowLeft className="w-6 h-6 text-emerald-400 animate-pulse" />
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center"><Home className="w-8 h-8 text-purple-500" /></div>
          <span className="text-xs mt-2 text-slate-500 font-medium">منزلك</span>
        </div>
      </div>
    ),
  },
  {
    icon: Battery,
    iconBg: 'bg-emerald-500',
    title: 'ماذا تحتاج لمنظومة شمسية؟',
    description: 'المنظومة الشمسية تتكون من 4 أجزاء رئيسية. لا تقلق — سنختار لك الأنسب تلقائياً بناءً على استهلاكك!',
    visual: (
      <div className="grid grid-cols-2 gap-3 py-4">
        {[
          { name: 'ألواح شمسية', desc: 'تنتج الكهرباء من الشمس', color: 'bg-amber-50 border-amber-200 text-amber-700' },
          { name: 'بطاريات', desc: 'تخزن الكهرباء لليل والانقطاع', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          { name: 'محوّل (انفرتر)', desc: 'يحوّل الكهرباء لتعمل أجهزتك', color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { name: 'منظم شحن', desc: 'يحمي البطاريات من الشحن الزائد', color: 'bg-purple-50 border-purple-200 text-purple-700' },
        ].map((item, i) => (
          <div key={i} className={`p-3 rounded-xl border ${item.color} text-center`}>
            <div className="font-bold text-sm">{item.name}</div>
            <div className="text-xs mt-1 opacity-75">{item.desc}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Sparkles,
    iconBg: 'bg-purple-500',
    title: 'كيف سنساعدك؟',
    description: 'في 4 خطوات بسيطة فقط، سنصمم لك المنظومة المثالية:',
    visual: (
      <div className="space-y-3 py-4">
        {[
          { step: '1', text: 'اختر نوع المبنى (منزل، محل، مكتب)', color: 'bg-amber-500' },
          { step: '2', text: 'حدد موقعك ونوع النظام المطلوب', color: 'bg-blue-500' },
          { step: '3', text: 'أضف الأجهزة التي تريد تشغيلها', color: 'bg-emerald-500' },
          { step: '4', text: 'احصل على التوصية والسعر فوراً!', color: 'bg-purple-500' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-8 h-8 ${item.color} text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0`}>{item.step}</div>
            <span className="text-slate-700 font-medium text-sm">{item.text}</span>
          </div>
        ))}
      </div>
    ),
  },
];

export default function WelcomeOnboarding({ onComplete }: WelcomeOnboardingProps) {
  const [current, setCurrent] = useState(0);

  const next = () => {
    if (current < slides.length - 1) setCurrent(current + 1);
    else onComplete();
  };
  const prev = () => {
    if (current > 0) setCurrent(current - 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
      >
        {/* Skip button */}
        <div className="flex justify-end p-4 pb-0">
          <button onClick={onComplete} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className={`p-4 ${slides[current].iconBg} text-white rounded-2xl shadow-lg`}>
                  {React.createElement(slides[current].icon, { className: 'w-8 h-8' })}
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-slate-800 text-center mb-3">{slides[current].title}</h2>
              <p className="text-slate-500 text-center leading-relaxed text-sm">{slides[current].description}</p>

              {/* Visual */}
              {slides[current].visual}
            </motion.div>
          </AnimatePresence>

          {/* Dots */}
          <div className="flex justify-center gap-2 mb-6">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${i === current ? 'bg-amber-500 w-6' : 'bg-slate-200'}`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            {current > 0 && (
              <button onClick={prev} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                <ArrowRight className="w-4 h-4" />
                السابق
              </button>
            )}
            <button onClick={next} className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20">
              {current === slides.length - 1 ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  ابدأ التصميم!
                </>
              ) : (
                <>
                  التالي
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
