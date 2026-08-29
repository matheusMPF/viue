'use client';

import { useToastStore, type ToastInput } from '@/stores/toast-store';

export type ShowToast = (toast: ToastInput) => string;

export function useToast(): ShowToast {
  return useToastStore((state) => state.showToast);
}
