import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type BadgeVariant = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  icon?: ReactNode;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'border-border bg-elevated text-foreground',
  primary: 'border-primary/30 bg-primary/15 text-[#d9b9ff]',
  info: 'border-secondary/30 bg-secondary/15 text-secondary',
  success: 'border-success/30 bg-success/15 text-success',
  warning: 'border-warning/30 bg-warning/15 text-warning',
  danger: 'border-destructive/30 bg-destructive/15 text-[#ffb4aa]',
};

export function Badge({ children, className, icon, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 w-fit items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-bold leading-4',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}
