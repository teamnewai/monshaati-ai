import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <input id={id} ref={ref}
        className={cn(
          'w-full px-4 py-2.5 rounded-xl border text-right text-sm transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
          'placeholder:text-gray-400',
          error
            ? 'border-red-400 bg-red-50 focus:ring-red-300'
            : 'border-gray-300 bg-white hover:border-gray-400 focus:bg-white',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">⚠️ {error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-gray-400">{hint}</p>}
    </div>
  )
);
Input.displayName = 'Input';
export default Input;
