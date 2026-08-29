import type { LabelHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
  optional?: boolean;
  required?: boolean;
}

export function Label({ children, className, optional, required, ...props }: LabelProps) {
  return (
    <label className={cn('text-sm font-bold leading-5 text-foreground', className)} {...props}>
      {children}
      {required && (
        <>
          <span aria-hidden="true" className="ml-1 text-destructive">
            *
          </span>
          <span className="sr-only"> (obrigatório)</span>
        </>
      )}
      {optional && !required && (
        <span className="ml-1 font-normal text-muted-foreground">(opcional)</span>
      )}
    </label>
  );
}
