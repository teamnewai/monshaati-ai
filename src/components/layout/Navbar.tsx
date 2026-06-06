'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import NotificationBell from './NotificationBell';
import MobileDrawer from './MobileDrawer';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard',      label: 'الرئيسية' },
  { href: '/onboarding',     label: '+ منشأة' },
  { href: '/ai-consultant',  label: '🤖 مستشاري' },
  { href: '/support',         label: '🎧 الدعم' },
  { href: '/consultants',    label: 'مستشارون' },
  { href: '/marketplace',    label: 'المتجر' },
  { href: '/library',        label: 'المكتبة 🇸🇦' },
  { href: '/billing',        label: 'اشتراكي' },
  { href: '/bi',             label: '🧠 BI' },
];

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router   = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <>
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50"
           style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center text-white font-black text-sm">م</div>
            <span className="text-sm font-bold text-gray-900 hidden sm:block">منشأتي AI</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-0.5 overflow-x-auto flex-1 mx-2">
            {NAV.map(item => (
              <Link key={item.href} href={item.href}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                  (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)))
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                )}>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <NotificationBell />
            {/* Desktop only */}
            <Link href="/referrals" className="hidden sm:flex w-8 h-8 rounded-lg items-center justify-center text-sm text-gray-500 hover:bg-gray-100">🎁</Link>
            <Link href="/profile"   className="hidden sm:flex w-8 h-8 rounded-lg items-center justify-center text-sm text-gray-500 hover:bg-gray-100">👤</Link>
            <Button size="sm" variant="ghost" onClick={handleLogout} className="hidden md:inline-flex text-xs px-2 py-1">خروج</Button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
              aria-label="القائمة">
              <div className="space-y-1.5">
                <span className="block w-5 h-0.5 bg-gray-600 rounded" />
                <span className="block w-4 h-0.5 bg-gray-600 rounded mr-auto" />
                <span className="block w-5 h-0.5 bg-gray-600 rounded" />
              </div>
            </button>
          </div>
        </div>
      </nav>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
