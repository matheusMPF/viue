'use client';

import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { useEffect, type ComponentType } from 'react';

import { Button } from '@/components/ui/button';
import { useToastStore, type ToastMessage, type ToastVariant } from '@/stores/toast-store';

const variantIcons: Record<ToastVariant, ComponentType<{ 'aria-hidden': true; size: number }>> = {
  error: CircleAlert,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
};

function ToastItem({ toast }: { toast: ToastMessage }) {
  const dismissToast = useToastStore((state) => state.dismissToast);
  const Icon = variantIcons[toast.variant];

  useEffect(() => {
    if (toast.duration <= 0) return;
    const timer = window.setTimeout(() => dismissToast(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [dismissToast, toast.duration, toast.id]);

  return (
    <article
      aria-atomic="true"
      className="toast-item"
      data-variant={toast.variant}
      role={toast.variant === 'error' ? 'alert' : 'status'}
    >
      <span aria-hidden="true" className="toast-icon">
        <Icon aria-hidden size={19} />
      </span>
      <div className="toast-content">
        <strong>{toast.title}</strong>
        {toast.description && <p>{toast.description}</p>}
      </div>
      <Button
        aria-label="Fechar notificação"
        className="toast-close"
        onClick={() => dismissToast(toast.id)}
        size="icon"
        title="Fechar notificação"
        variant="ghost"
      >
        <X aria-hidden="true" size={17} />
      </Button>
    </article>
  );
}

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div aria-label="Notificações" className="toast-viewport">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
