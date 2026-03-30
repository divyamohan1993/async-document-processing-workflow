import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'destructive';
  onDismiss?: () => void;
}

export function Toast({ title, description, variant = 'default', onDismiss }: ToastProps) {
  return (
    <div
      className={cn(
        'pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all',
        variant === 'default' && 'border-border bg-background text-foreground',
        variant === 'success' && 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100',
        variant === 'destructive' && 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100'
      )}
    >
      <div className="grid gap-1">
        <div className="text-sm font-semibold">{title}</div>
        {description && (
          <div className="text-sm opacity-90">{description}</div>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute right-1 top-1 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none group-hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
