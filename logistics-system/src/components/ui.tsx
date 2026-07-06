"use client";

import { useEffect, useState } from "react";
import { STATUSES, STATUS_COLORS } from "@/lib/constants";

// مكونات واجهة موحدة

export function Field({ label, children, hint, required }: {
  label: string; children: React.ReactNode; hint?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
        {label} {required && <span className="text-rose-600">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_COLORS[status] ?? "bg-slate-200 text-slate-700"}`}>
      {(STATUSES as Record<string, string>)[status] ?? status}
    </span>
  );
}

export function Modal({ title, open, onClose, children, wide }: {
  title: string; open: boolean; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-12" onClick={onClose}>
      <div
        className={`card w-full ${wide ? "max-w-4xl" : "max-w-lg"} p-5`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Alert({ kind, children }: { kind: "error" | "warn" | "info" | "success"; children: React.ReactNode }) {
  const styles = {
    error: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200",
    warn: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
    info: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200",
    success: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
  };
  return <div className={`rounded-lg border px-3 py-2 text-sm ${styles[kind]}`}>{children}</div>;
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center p-8 text-slate-400">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="p-8 text-center text-sm text-slate-400">{text}</div>;
}

export function ProgressBar({ value }: { value: number }) {
  const color = value >= 90 ? "bg-emerald-500" : value >= 60 ? "bg-teal-500" : value >= 30 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="text-xs font-bold tabular-nums">{value}%</span>
    </div>
  );
}

/** رسالة مؤقتة (Toast) */
export function useToast() {
  const [msg, setMsg] = useState<{ text: string; kind: "success" | "error" } | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4500);
    return () => clearTimeout(t);
  }, [msg]);
  const toast = (text: string, kind: "success" | "error" = "success") => setMsg({ text, kind });
  const node = msg ? (
    <div className={`fixed bottom-5 right-5 z-[60] max-w-md rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-lg ${msg.kind === "success" ? "bg-emerald-700" : "bg-rose-700"}`}>
      {msg.text}
    </div>
  ) : null;
  return { toast, node };
}

export function ConfirmButton({ label, message, onConfirm, className }: {
  label: string; message: string; onConfirm: () => void; className?: string;
}) {
  return (
    <button
      className={className ?? "btn-danger"}
      onClick={() => { if (confirm(message)) onConfirm(); }}
    >
      {label}
    </button>
  );
}
