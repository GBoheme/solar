import { create } from 'zustand';

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: 'danger' | 'warning' | 'info';
  onConfirm: (() => void) | null;
  onCancel: (() => void) | null;

  confirm: (options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
  }) => Promise<boolean>;

  close: () => void;
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  confirmLabel: 'تأكيد',
  cancelLabel: 'إلغاء',
  variant: 'danger',
  onConfirm: null,
  onCancel: null,

  confirm: (options) => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel || 'تأكيد',
        cancelLabel: options.cancelLabel || 'إلغاء',
        variant: options.variant || 'danger',
        onConfirm: () => {
          set({ isOpen: false });
          resolve(true);
        },
        onCancel: () => {
          set({ isOpen: false });
          resolve(false);
        },
      });
    });
  },

  close: () => set({ isOpen: false }),
}));
