import { cn } from '@/lib/utils';
export default function LoadingSpinner({ className, size='md' }: { className?: string; size?: 'sm'|'md'|'lg' }) {
  const sizes = { sm:'h-4 w-4', md:'h-8 w-8', lg:'h-12 w-12' };
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className={cn('rounded-full border-4 border-gray-200 border-t-brand-500 animate-spin', sizes[size])} />
    </div>
  );
}
