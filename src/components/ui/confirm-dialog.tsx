'use client';

import type { ReactNode } from 'react';

import { Button, type ButtonVariant } from './button';
import { Modal } from './modal';

export interface ConfirmDialogProps {
  cancelLabel?: string;
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
  description: ReactNode;
  isConfirming?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: ReactNode;
}

/**
 * Modal de confirmação genérico ("tem certeza?"), composto a partir do `Modal` base.
 * Reutilize para qualquer ação que precise de uma confirmação simples antes de agir.
 */
export function ConfirmDialog({
  cancelLabel = 'Cancelar',
  confirmLabel,
  confirmVariant = 'primary',
  description,
  isConfirming = false,
  onConfirm,
  onOpenChange,
  open,
  title,
}: ConfirmDialogProps) {
  return (
    <Modal.Root onOpenChange={onOpenChange} open={open} size="sm">
      <Modal.Header>
        <Modal.Title>{title}</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>
      <Modal.Body>
        <Modal.Description>{description}</Modal.Description>
      </Modal.Body>
      <Modal.Footer>
        <Button
          disabled={isConfirming}
          onClick={() => onOpenChange(false)}
          type="button"
          variant="ghost"
        >
          {cancelLabel}
        </Button>
        <Button
          isLoading={isConfirming}
          onClick={onConfirm}
          type="button"
          variant={confirmVariant}
        >
          {confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal.Root>
  );
}
