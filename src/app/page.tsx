import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import PublicNav from '@/components/marketing/PublicNav';
import PublicFooter from '@/components/marketing/PublicFooter';

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <PublicNav />
      <main className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl mx-auto mb-6">م</div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">
            منشأتي AI
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            نظام التشغيل الذكي للمنشآت السعودية والخليجية
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/signup"
              className="px-8 py-4 bg-brand-500 text-white font-bold text-lg rounded-xl hover:bg-brand-600 transition-colors">
              ابدأ مجاناً — 14 يوم
            </Link>
            <Link href="/about"
              className="px-8 py-4 border-2 border-gray-300 text-gray-700 font-bold text-lg rounded-xl hover:bg-gray-50 transition-colors">
              اعرف أكثر
            </Link>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-400">
            <Link href="/about" className="hover:text-brand-600 transition-colors">من نحن</Link>
            <Link href="/pricing" className="hover:text-brand-600 transition-colors">الأسعار</Link>
            <Link href="/faq" className="hover:text-brand-600 transition-colors">الأسئلة الشائعة</Link>
            <Link href="/contact" className="hover:text-brand-600 transition-colors">تواصل</Link>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
