import Link from 'next/link';

const FOOTER_SECTIONS = [
  {
    title: 'الشركة',
    links: [
      { href: '/about',   label: 'من نحن' },
      { href: '/team',    label: 'فريقنا' },
      { href: '/contact', label: 'تواصل معنا' },
    ],
  },
  {
    title: 'المنتج',
    links: [
      { href: '/pricing',  label: 'الأسعار' },
      { href: '/faq',      label: 'الأسئلة الشائعة' },
      { href: '/library',  label: 'المكتبة السعودية' },
      { href: '/consultants', label: 'المستشارون' },
    ],
  },
  {
    title: 'القانوني',
    links: [
      { href: '/privacy',              label: 'سياسة الخصوصية' },
      { href: '/terms',                label: 'الشروط والأحكام' },
      { href: '/cookies',              label: 'سياسة الكوكيز' },
      { href: '/refund',               label: 'سياسة الاسترداد' },
      { href: '/ai-disclaimer',        label: 'إخلاء مسؤولية AI' },
      { href: '/consultant-disclaimer',label: 'إخلاء مسؤولية المستشارين' },
    ],
  },
];

const SOCIAL = [
  { href: 'https://twitter.com/monshaati_ai',  label: 'X (Twitter)',  icon: '𝕏' },
  { href: 'https://linkedin.com/company/monshaati', label: 'LinkedIn', icon: 'in' },
];

export default function PublicFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center text-white font-black">م</div>
              <span className="font-bold text-white">منشأتي AI</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              نظام التشغيل الذكي للمنشآت السعودية والخليجية.
              نبني معك الهيكل التنظيمي والسياسات ومؤشرات الأداء بدقائق.
            </p>
            <div className="flex gap-3">
              {SOCIAL.map(s => (
                <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 bg-gray-800 hover:bg-brand-500 rounded-lg flex items-center justify-center text-sm font-bold transition-colors"
                  aria-label={s.label}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {FOOTER_SECTIONS.map(section => (
            <div key={section.title}>
              <h3 className="text-white font-bold text-sm mb-4">{section.title}</h3>
              <ul className="space-y-2.5">
                {section.links.map(link => (
                  <li key={link.href}>
                    <Link href={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} منشأتي AI — جميع الحقوق محفوظة
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>🇸🇦 صُنع في المملكة العربية السعودية</span>
            <span>·</span>
            <a href="mailto:support@monshaati.ai" className="hover:text-white transition-colors">
              support@monshaati.ai
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
