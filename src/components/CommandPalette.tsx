import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, LayoutDashboard, FolderPlus, Users, FileText,
  Package, Settings, BarChart3, Zap, Command, ArrowLeft
} from 'lucide-react';

interface SearchItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  keywords: string[];
}

const NAVIGATION_ITEMS: SearchItem[] = [
  { id: 'dashboard', label: 'لوحة المشاريع', description: 'الصفحة الرئيسية والإحصائيات', icon: <LayoutDashboard className="w-4 h-4" />, path: '/', keywords: ['dashboard', 'home', 'الرئيسية', 'مشاريع', 'إحصائيات'] },
  { id: 'new-project', label: 'مشروع جديد', description: 'إنشاء حسبة شمسية جديدة', icon: <Zap className="w-4 h-4" />, path: '/project/new', keywords: ['project', 'new', 'مشروع', 'جديد', 'حسبة', 'شمسية'] },
  { id: 'quotes', label: 'عروض الأسعار', description: 'جميع عروض الأسعار والتسعيرات', icon: <FileText className="w-4 h-4" />, path: '/quotes', keywords: ['quotes', 'عروض', 'أسعار', 'تسعير', 'فاتورة'] },
  { id: 'clients', label: 'إدارة العملاء', description: 'قاعدة بيانات العملاء', icon: <Users className="w-4 h-4" />, path: '/clients', keywords: ['clients', 'عملاء', 'زبائن', 'إدارة'] },
  { id: 'admin', label: 'لوحة التحكم', description: 'إحصائيات الإدارة المتقدمة', icon: <BarChart3 className="w-4 h-4" />, path: '/admin', keywords: ['admin', 'إدارة', 'تحكم', 'لوحة'] },
  { id: 'catalog', label: 'الكاتالوج', description: 'إدارة المنتجات والمكونات', icon: <Package className="w-4 h-4" />, path: '/admin/catalog', keywords: ['catalog', 'كاتالوج', 'منتجات', 'بطارية', 'ألواح', 'انفيرتر'] },
  { id: 'analytics', label: 'التحليلات والذكاء', description: 'ربحية، توقعات، تقسيم العملاء، المخزون', icon: <BarChart3 className="w-4 h-4" />, path: '/admin/analytics', keywords: ['analytics', 'تحليلات', 'ذكاء', 'ربحية', 'توقع', 'مخزون', 'عملاء', 'هامش', 'أداء'] },
  { id: 'settings', label: 'الإعدادات المتقدمة', description: 'سعر الصرف وهامش الربح', icon: <Settings className="w-4 h-4" />, path: '/admin/settings', keywords: ['settings', 'إعدادات', 'صرف', 'هامش', 'ربح'] },
];

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filtered = query.trim()
    ? NAVIGATION_ITEMS.filter(item =>
        item.label.includes(query) ||
        item.description.includes(query) ||
        item.keywords.some(k => k.toLowerCase().includes(query.toLowerCase()))
      )
    : NAVIGATION_ITEMS;

  const handleSelect = useCallback((item: SearchItem) => {
    setIsOpen(false);
    navigate(item.path);
  }, [navigate]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filtered.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (filtered[selectedIndex]) handleSelect(filtered[selectedIndex]);
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, filtered, selectedIndex, handleSelect]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[15vh] p-4" dir="rtl">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن صفحة أو إجراء..."
                className="flex-1 bg-transparent text-slate-800 dark:text-white text-sm placeholder-slate-400 outline-none"
              />
              <kbd className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-400 text-[10px] font-mono">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[40vh] overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">لا توجد نتائج لـ "{query}"</p>
                </div>
              ) : (
                filtered.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-4 px-5 py-3 text-right transition-colors ${
                      idx === selectedIndex
                        ? 'bg-amber-50 dark:bg-amber-900/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      idx === selectedIndex
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${
                        idx === selectedIndex ? 'text-amber-700 dark:text-amber-400' : 'text-slate-800 dark:text-white'
                      }`}>
                        {item.label}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{item.description}</p>
                    </div>
                    {idx === selectedIndex && (
                      <ArrowLeft className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className="px-5 py-2.5 border-t border-slate-100 dark:border-slate-700 flex items-center gap-4 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono">↑↓</kbd>
                للتنقل
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono">Enter</kbd>
                للفتح
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono">Esc</kbd>
                للإغلاق
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
