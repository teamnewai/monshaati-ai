import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary'|'secondary'|'outline'|'ghost'|'danger';
  size?: 'xs'|'sm'|'md'|'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant='primary', size='md', loading, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';
    const variants = {
      primary:   'bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white focus:ring-brand-400 shadow-sm',
      secondary: 'bg-gray-900 hover:bg-gray-800 text-white focus:ring-gray-700 shadow-sm',
      outline:   'border-2 border-brand-500 text-brand-600 hover:bg-brand-500 hover:text-white focus:ring-brand-400',
      ghost:     'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-300',
      danger:    'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm',
    };
    const sizes = {
      xs: 'px-2.5 py-1 text-xs',
      sm: 'px-3.5 py-2 text-sm',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-7 py-3.5 text-base',
    };
    return (
      <button ref={ref} disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)} {...props}>
        {loading && (
          <svg className="animate-spin -mr-0.5 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
export default Button;
