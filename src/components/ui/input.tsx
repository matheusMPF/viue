'use client';

import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { Label } from './label';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
  description?: ReactNode;
  error?: ReactNode;
  inputClassName?: string;
  label?: ReactNode;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
}

export function Input({
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  className,
  containerClassName,
  description,
  disabled,
  error,
  id,
  inputClassName,
  label,
  leftElement,
  required,
  rightElement,
  ...props
}: InputProps) {
  const generatedId = useId();
  const hasError = Boolean(error);
  const inputId = id ?? `input-${generatedId.replaceAll(':', '')}`;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy =
    [ariaDescribedBy, descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('grid gap-2', containerClassName)}>
      {label && (
        <Label htmlFor={inputId} required={required}>
          {label}
        </Label>
      )}

      <div
        className={cn(
          'flex min-h-12 items-center gap-2 rounded-lg border border-input bg-white/[0.04] px-3 text-muted-foreground transition focus-within:border-ring focus-within:bg-white/[0.06] focus-within:ring-2 focus-within:ring-ring/20',
          hasError &&
            'border-destructive focus-within:border-destructive focus-within:ring-destructive/20',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        {leftElement && <span className="flex shrink-0 items-center">{leftElement}</span>}
        <input
          aria-describedby={describedBy}
          aria-invalid={hasError ? true : ariaInvalid}
          className={cn(
            'h-12 min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed',
            inputClassName,
          )}
          disabled={disabled}
          id={inputId}
          required={required}
          {...props}
        />
        {rightElement && <span className="flex shrink-0 items-center">{rightElement}</span>}
      </div>

      {description && (
        <p className="text-xs leading-5 text-muted-foreground" id={descriptionId}>
          {description}
        </p>
      )}
      {error && (
        <p
          aria-live="polite"
          className="text-xs font-semibold leading-5 text-destructive"
          id={errorId}
        >
          {error}
        </p>
      )}
    </div>
  );
}
