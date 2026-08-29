import { create } from 'zustand';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastInput {
  description?: string;
  duration?: number;
  title: string;
  variant?: ToastVariant;
}

export interface ToastMessage extends Required<Pick<ToastInput, 'duration' | 'title' | 'variant'>> {
  description?: string;
  id: string;
}

interface ToastState {
  dismissToast: (id: string) => void;
  showToast: (toast: ToastInput) => string;
  toasts: ToastMessage[];
}

let toastSequence = 0;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  showToast: (toast) => {
    const id = `toast-${Date.now()}-${++toastSequence}`;
    set((state) => ({
      toasts: [
        ...state.toasts.slice(-3),
        {
          description: toast.description,
          duration: toast.duration ?? 5000,
          id,
          title: toast.title,
          variant: toast.variant ?? 'info',
        },
      ],
    }));
    return id;
  },
  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
}));
