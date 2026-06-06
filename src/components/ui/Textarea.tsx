import { cn } from '@/lib/utils';
import { TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={id}
        ref={ref}
        className={cn(
          'w-full px-4 py-2.5 rounded-xl border text-right text-sm transition-all duration-200 resize-y min-h-[100px]',
          'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
          'placeholder:text-gray-400',
          error
            ? 'border-red-400 bg-red-50 focus:ring-red-300'
            : 'border-gray-300 bg-white hover:border-gray-400 focus:bg-white',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-600">⚠️ {error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-gray-400">{hint}</p>}
    </div>
  )
);
Textarea.displayName = 'Textarea';
export default Textarea;
