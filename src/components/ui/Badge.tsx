import type React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps { children?: React.ReactNode; variant?: 'default'|'success'|'warning'|'error'|'info'; className?: string; }

export default function Badge({ children, variant='default', className }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-700 border-gray-200',
    success: 'bg-green-50 text-green-800 border-green-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    error:   'bg-red-50 text-red-800 border-red-200',
    info:    'bg-blue-50 text-blue-800 border-blue-200',
  };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border', variants[variant], className)}>
      {children}
    </span>
  );
}
