'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const PUBLIC_LINKS = [
  { href: '/about',   label: 'من نحن' },
  { href: '/team',    label: 'فريقنا' },
  { href: '/faq',     label: 'الأسئلة الشائعة' },
  { href: '/contact', label: 'تواصل معنا' },
  { href: '/pricing', label: 'الأسعار' },
];

export default function PublicNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50"
         style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center text-white font-black text-base">م</div>
          <span className="font-bold text-gray-900 text-sm sm:text-base">منشأتي AI</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {PUBLIC_LINKS.map(link => (
            <Link key={link.href} href={link.href}
              className={cn(
                'px-3 py-2 text-sm rounded-lg transition-colors font-medium',
                pathname === link.href
                  ? 'text-brand-700 bg-brand-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/auth/login"
            className="hidden sm:block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
            تسجيل الدخول
          </Link>
          <Link href="/auth/signup"
            className="px-4 py-2 bg-brand-500 text-white text-sm font-bold rounded-xl hover:bg-brand-600 transition-colors">
            ابدأ مجاناً
          </Link>
        </div>
      </div>
    </nav>
  );
}
