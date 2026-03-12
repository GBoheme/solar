import { useToastStore } from '../store/toastStore';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const iconMap = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
};

const colorMap = {
    success: 'bg-emerald-50 border-emerald-400 text-emerald-800',
    error: 'bg-red-50 border-red-400 text-red-800',
    warning: 'bg-amber-50 border-amber-400 text-amber-800',
    info: 'bg-blue-50 border-blue-400 text-blue-800'
};

const iconColorMap = {
    success: 'text-emerald-500',
    error: 'text-red-500',
    warning: 'text-amber-500',
    info: 'text-blue-500'
};

export default function ToastContainer() {
    const { toasts, removeToast } = useToastStore();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-16 md:top-4 left-1/2 -translate-x-1/2 z-[999] flex flex-col gap-2 max-w-md w-full px-4">
            {toasts.map((toast) => {
                const Icon = iconMap[toast.type];
                return (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-slide-down ${colorMap[toast.type]}`}
                    >
                        <Icon className={`w-5 h-5 shrink-0 ${iconColorMap[toast.type]}`} />
                        <span className="flex-1 text-sm font-medium">{toast.message}</span>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
