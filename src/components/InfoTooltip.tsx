import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface InfoTooltipProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md';
}

export default function InfoTooltip({ text, className = '', size = 'sm' }: InfoTooltipProps) {
  const [show, setShow] = useState(false);
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-slate-400 hover:text-amber-500 transition-colors cursor-help p-0.5"
        aria-label="معلومات"
      >
        <HelpCircle className={iconSize} />
      </button>

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 bottom-full right-0 mb-2 w-64 bg-slate-900 text-white text-sm p-3 rounded-xl shadow-xl border border-slate-700 leading-relaxed pointer-events-none"
          >
            <div className="absolute -bottom-1.5 right-3 w-3 h-3 bg-slate-900 border-b border-r border-slate-700 rotate-45" />
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
