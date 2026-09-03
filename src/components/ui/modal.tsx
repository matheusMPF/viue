'use client';

import { X } from 'lucide-react';
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/cn';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type ModalContextValue = {
  descriptionId: string;
  onClose: () => void;
  titleId: string;
};

const ModalContext = createContext<ModalContextValue | null>(null);

function useRequiredModalContext(consumer: string): ModalContextValue {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error(`${consumer} deve ser usado dentro de <Modal.Root>.`);
  }
  return context;
}

export interface ModalRootProps {
  children: ReactNode;
  /** Fecha o modal ao clicar fora do conteúdo. Padrão: true. */
  closeOnOverlayClick?: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  /** Largura do modal centralizado em telas de desktop. Padrão: 'md'. */
  size?: 'sm' | 'md';
}

function Root({
  children,
  closeOnOverlayClick = true,
  onOpenChange,
  open,
  size = 'md',
}: ModalRootProps) {
  const generatedId = useId().replaceAll(':', '');
  const titleId = `modal-${generatedId}-title`;
  const descriptionId = `modal-${generatedId}-description`;
  const contentRef = useRef<HTMLDivElement>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  function close() {
    onOpenChange(false);
  }

  useEffect(() => {
    if (!open) return;

    lastFocusedElement.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frame = requestAnimationFrame(() => {
      const focusable = contentRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (focusable ?? contentRef.current)?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = originalOverflow;
      lastFocusedElement.current?.focus();
    };
  }, [open]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      return;
    }

    if (event.key !== 'Tab' || !contentRef.current) return;

    const focusableElements = Array.from(
      contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    if (focusableElements.length === 0) return;

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleOverlayClick(event: MouseEvent<HTMLDivElement>) {
    if (closeOnOverlayClick && event.target === event.currentTarget) close();
  }

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <ModalContext.Provider value={{ descriptionId, onClose: close, titleId }}>
      <div className="modal-overlay" onClick={handleOverlayClick}>
        <div
          aria-describedby={descriptionId}
          aria-labelledby={titleId}
          aria-modal="true"
          className={cn('modal-content', size === 'sm' && 'modal-content-sm')}
          onKeyDown={handleKeyDown}
          ref={contentRef}
          role="dialog"
          tabIndex={-1}
        >
          {children}
        </div>
      </div>
    </ModalContext.Provider>,
    document.body,
  );
}

function Header({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('modal-header', className)}>{children}</div>;
}

function Title({ children, className }: { children: ReactNode; className?: string }) {
  const { titleId } = useRequiredModalContext('<Modal.Title />');
  return (
    <h2 className={cn('modal-title', className)} id={titleId}>
      {children}
    </h2>
  );
}

function Description({ children, className }: { children: ReactNode; className?: string }) {
  const { descriptionId } = useRequiredModalContext('<Modal.Description />');
  return (
    <p className={cn('modal-description', className)} id={descriptionId}>
      {children}
    </p>
  );
}

function Body({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('modal-body', className)}>{children}</div>;
}

function Footer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('modal-footer', className)}>{children}</div>;
}

function CloseButton({ 'aria-label': ariaLabel = 'Fechar' }: { 'aria-label'?: string }) {
  const { onClose } = useRequiredModalContext('<Modal.CloseButton />');
  return (
    <button aria-label={ariaLabel} className="modal-close" onClick={onClose} type="button">
      <X aria-hidden="true" size={18} />
    </button>
  );
}

/**
 * Modal base seguindo composition pattern: `Modal.Root` cuida do portal, overlay,
 * bloqueio de scroll, foco e Escape. Modais concretos (ex: `ConfirmDialog`) compõem
 * `Header`/`Title`/`Description`/`Body`/`Footer`/`CloseButton` a partir dele.
 */
export const Modal = {
  Body,
  CloseButton,
  Description,
  Footer,
  Header,
  Root,
  Title,
};

/** Permite que qualquer elemento dentro de um modal (ex: botão "Cancelar") o feche. */
export function useModalClose(): () => void {
  return useRequiredModalContext('useModalClose()').onClose;
}
