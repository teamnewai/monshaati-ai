'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard',    icon: '🏠', label: 'الرئيسية' },
  { href: '/ai-consultant',icon: '🤖', label: 'مستشاري' },
  { href: '/bi',           icon: '📊', label: 'تحليلات' },
  { href: '/marketplace',  icon: '🛒', label: 'المتجر' },
  { href: '/support',      icon: '🎧', label: 'الدعم' },
  { href: '/billing',      icon: '💳', label: 'اشتراكي' },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white border-t border-gray-200 safe-bottom"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-14">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors',
                active ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'
              )}>
              <span className="text-xl leading-none">{item.icon}</span>
              <span className={cn('text-[9px] font-semibold leading-none', active && 'text-brand-600')}>
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-brand-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
