'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type TabsVariant = 'segment' | 'underline';

export interface TabItem {
  content?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  label: ReactNode;
  value: string;
}

export interface TabsProps {
  ariaLabel: string;
  className?: string;
  defaultValue?: string;
  items: readonly TabItem[];
  listClassName?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  panelClassName?: string;
  value?: string;
  variant?: TabsVariant;
}

export function Tabs({
  ariaLabel,
  className,
  defaultValue,
  items,
  listClassName,
  onValueChange,
  orientation = 'horizontal',
  panelClassName,
  value,
  variant = 'segment',
}: TabsProps) {
  const generatedId = useId().replaceAll(':', '');
  const firstEnabledValue = items.find((item) => !item.disabled)?.value ?? '';
  const [internalValue, setInternalValue] = useState(defaultValue ?? firstEnabledValue);
  const requestedValue = value ?? internalValue;
  const activeValue = items.some((item) => item.value === requestedValue && !item.disabled)
    ? requestedValue
    : firstEnabledValue;
  const activeItem = items.find((item) => item.value === activeValue);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function selectTab(nextValue: string) {
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentValue: string) {
    const enabledItems = items.filter((item) => !item.disabled);
    const currentIndex = enabledItems.findIndex((item) => item.value === currentValue);
    const previousKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
    const nextKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
    let nextIndex: number | undefined;

    if (event.key === previousKey) {
      nextIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length;
    } else if (event.key === nextKey) {
      nextIndex = (currentIndex + 1) % enabledItems.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = enabledItems.length - 1;
    }

    if (nextIndex === undefined || enabledItems.length === 0) {
      return;
    }

    event.preventDefault();
    const nextValue = enabledItems[nextIndex].value;
    selectTab(nextValue);
    tabRefs.current[nextValue]?.focus();
  }

  return (
    <div className={cn('w-full', className)}>
      <div
        aria-label={ariaLabel}
        aria-orientation={orientation}
        className={cn(
          variant === 'segment' &&
            'flex min-h-11 rounded-lg border border-border bg-white/[0.04] p-1',
          variant === 'underline' && 'flex border-b border-border',
          orientation === 'vertical' && 'flex-col',
          listClassName,
        )}
        role="tablist"
      >
        {items.map((item) => {
          const isActive = item.value === activeValue;
          const tabId = `${generatedId}-tab-${item.value}`;
          const panelId = `${generatedId}-panel-${item.value}`;

          return (
            <button
              aria-controls={item.content !== undefined ? panelId : undefined}
              aria-selected={isActive}
              className={cn(
                'inline-flex min-h-9 flex-1 items-center justify-center gap-2 px-3 text-sm font-extrabold transition focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40',
                variant === 'segment' && 'rounded-md text-muted-foreground hover:text-foreground',
                variant === 'segment' && isActive && 'bg-primary text-primary-foreground',
                variant === 'underline' &&
                  '-mb-px border-b-2 border-transparent text-muted-foreground hover:text-foreground',
                variant === 'underline' && isActive && 'border-primary text-foreground',
              )}
              disabled={item.disabled}
              id={tabId}
              key={item.value}
              onClick={() => selectTab(item.value)}
              onKeyDown={(event) => handleKeyDown(event, item.value)}
              ref={(node) => {
                tabRefs.current[item.value] = node;
              }}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              type="button"
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>

      {activeItem?.content !== undefined && (
        <div
          aria-labelledby={`${generatedId}-tab-${activeItem.value}`}
          className={cn('pt-4 focus-visible:outline-none', panelClassName)}
          id={`${generatedId}-panel-${activeItem.value}`}
          role="tabpanel"
          tabIndex={0}
        >
          {activeItem.content}
        </div>
      )}
    </div>
  );
}
