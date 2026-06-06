'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const SECTIONS = [
  {
    title: 'الرئيسية',
    items: [
      { href: '/dashboard',    icon: '🏠', label: 'لوحة التحكم' },
      { href: '/onboarding',   icon: '➕', label: 'منشأة جديدة' },
      { href: '/ai-consultant',icon: '🤖', label: 'مستشار AI' },
      { href: '/support',        icon: '🎧', label: 'مركز الدعم' },
    ],
  },
  {
    title: 'ذكاء الأعمال',
    items: [
      { href: '/bi',              icon: '🧠', label: 'تحليلات الأعمال' },
      { href: '/bi/funding',      icon: '💰', label: 'التمويل والدعم' },
      { href: '/bi/cost',         icon: '📊', label: 'محاسبة التكاليف' },
      { href: '/bi/loss-analysis',icon: '🚨', label: 'تحليل الخسائر' },
    ],
  },
  {
    title: 'الخدمات',
    items: [
      { href: '/consultants', icon: '👥', label: 'المستشارون' },
      { href: '/marketplace',  icon: '🛒', label: 'المتجر الرقمي' },
      { href: '/library',      icon: '📚', label: 'المكتبة السعودية 🇸🇦' },
      { href: '/referrals',    icon: '🎁', label: 'الإحالات' },
    ],
  },
  {
    title: 'الحساب',
    items: [
      { href: '/billing',  icon: '💳', label: 'الاشتراك والفوترة' },
      { href: '/profile',  icon: '👤', label: 'الملف الشخصي' },
      { href: '/settings', icon: '⚙️', label: 'الإعدادات' },
    ],
  },
];

interface MobileDrawerProps {
  open:    boolean;
  onClose: () => void;
}

export default function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else       document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn('fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none')}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={cn(
        'fixed top-0 right-0 bottom-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden overflow-y-auto',
        open ? 'translate-x-0' : 'translate-x-full'
      )} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-l from-brand-500 to-brand-600">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white font-black text-lg">م</div>
            <div>
              <div className="text-white font-bold text-sm">منشأتي AI</div>
              <div className="text-white/70 text-xs">نظام التشغيل الذكي</div>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white text-xl">
            ✕
          </button>
        </div>

        {/* Nav sections */}
        <div className="p-3 space-y-4">
          {SECTIONS.map(section => (
            <div key={section.title}>
              <div className="text-xs font-bold text-gray-400 px-3 mb-1 uppercase tracking-wider">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link key={item.href} href={item.href} onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                        active
                          ? 'bg-brand-50 text-brand-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      )}>
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Logout */}
          <div className="pt-4 border-t border-gray-100">
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
              <span>🚪</span>
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
