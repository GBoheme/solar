import { useEffect, useRef } from 'react';
import { useConfirmStore } from '../store/confirmStore';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const variantConfig = {
  danger: {
    icon: <Trash2 className="w-6 h-6" />,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    buttonBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6" />,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    buttonBg: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
  },
  info: {
    icon: <Info className="w-6 h-6" />,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    buttonBg: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  },
};

export default function ConfirmDialog() {
  const { isOpen, title, message, confirmLabel, cancelLabel, variant, onConfirm, onCancel } = useConfirmStore();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus the cancel button (safer default)
      setTimeout(() => confirmRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel?.();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);

  const config = variantConfig[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir="rtl">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => onCancel?.()}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={() => onCancel?.()}
              className="absolute top-4 left-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="p-6 pt-8 text-center">
              {/* Icon */}
              <div className={`w-16 h-16 ${config.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-4 ${config.iconColor}`}>
                {config.icon}
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                {title}
              </h3>

              {/* Message */}
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                {message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 p-4 sm:p-6 pt-2">
              <button
                ref={confirmRef}
                onClick={() => onConfirm?.()}
                className={`flex-1 ${config.buttonBg} text-white font-bold py-3 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98]`}
              >
                {confirmLabel}
              </button>
              <button
                onClick={() => onCancel?.()}
                className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 px-4 rounded-xl text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors active:scale-[0.98]"
              >
                {cancelLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
