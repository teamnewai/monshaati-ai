import { cn } from '@/lib/utils';
import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children?: ReactNode;
}

export function Card({ className, title, subtitle, action, children, ...props }: CardProps) {
  return (
    <div className={cn('bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden', className)} {...props}>
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            {title    && <h3 className="text-base font-bold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

export function StatCard({ value, label, icon, color = 'brand' }: {
  value: string | number;
  label: string;
  icon: string;
  color?: string;
}) {
  const colors: Record<string, string> = {
    brand:  'bg-brand-50 text-brand-600',
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    red:    'bg-red-50 text-red-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-2xl', colors[color] ?? colors.brand)}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-400 mt-0.5">{label}</div>
      </div>
    </div>
  );
}
