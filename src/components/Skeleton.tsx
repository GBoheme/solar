/** Reusable skeleton loading components */
import React from 'react';

function Pulse({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg ${className}`} />
  );
}

/** Single KPI card skeleton */
export function SkeletonKpiCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700">
      <div className="flex justify-between items-start mb-4">
        <Pulse className="w-12 h-12 !rounded-2xl" />
        <Pulse className="w-16 h-6 !rounded-full" />
      </div>
      <Pulse className="w-24 h-4 mb-2" />
      <Pulse className="w-32 h-8 mb-2" />
      <Pulse className="w-28 h-3" />
    </div>
  );
}

/** Table row skeleton */
export const SkeletonTableRow: React.FC<{ cols?: number }> = ({ cols = 6 }) => {
  return (
    <tr className="border-b border-slate-50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Pulse className={`h-4 ${i === 0 ? 'w-32' : i === cols - 1 ? 'w-24' : 'w-20'}`} />
        </td>
      ))}
    </tr>
  );
};

/** Multiple table rows */
export function SkeletonTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} cols={cols} />
      ))}
    </>
  );
}

/** Card grid skeleton (for AdminCatalog) */
export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Pulse className="w-10 h-10 !rounded-xl" />
          <div>
            <Pulse className="w-20 h-4 mb-2" />
            <Pulse className="w-28 h-3" />
          </div>
        </div>
        <Pulse className="w-14 h-5 !rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Pulse className="h-14 !rounded-xl" />
        <Pulse className="h-14 !rounded-xl" />
        <Pulse className="h-14 !rounded-xl" />
        <Pulse className="h-14 !rounded-xl" />
      </div>
      <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
        <Pulse className="flex-1 h-9 !rounded-xl" />
        <Pulse className="w-12 h-9 !rounded-xl" />
      </div>
    </div>
  );
}

/** Dashboard page skeleton */
export function SkeletonDashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 animate-pulse">
        <div className="flex items-center gap-4">
          <Pulse className="w-14 h-14 !rounded-2xl" />
          <div>
            <Pulse className="w-48 h-7 mb-2" />
            <Pulse className="w-32 h-4" />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SkeletonKpiCard />
        <SkeletonKpiCard />
        <SkeletonKpiCard />
        <SkeletonKpiCard />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700">
          <Pulse className="w-40 h-6 mb-4" />
          <Pulse className="w-full h-64 !rounded-2xl" />
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700">
          <Pulse className="w-32 h-6 mb-4" />
          <Pulse className="w-40 h-40 !rounded-full mx-auto mb-4" />
          <div className="space-y-2">
            <Pulse className="w-full h-4" />
            <Pulse className="w-full h-4" />
            <Pulse className="w-3/4 h-4" />
          </div>
        </div>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <Pulse className="w-40 h-6" />
          </div>
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
                <Pulse className="w-10 h-10 !rounded-full" />
                <div className="flex-1">
                  <Pulse className="w-28 h-4 mb-2" />
                  <Pulse className="w-20 h-3" />
                </div>
                <Pulse className="w-16 h-5" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <Pulse className="w-36 h-6" />
          </div>
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
                <Pulse className="w-10 h-10 !rounded-full" />
                <div className="flex-1">
                  <Pulse className="w-24 h-4 mb-2" />
                  <Pulse className="w-16 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Stat cards row skeleton */
export function SkeletonStats({ count = 3 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${count} gap-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white/80 dark:bg-slate-800 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex items-center gap-4 animate-pulse">
          <Pulse className="w-12 h-12 !rounded-xl shrink-0" />
          <div>
            <Pulse className="w-20 h-3 mb-2" />
            <Pulse className="w-12 h-7" />
          </div>
        </div>
      ))}
    </div>
  );
}
