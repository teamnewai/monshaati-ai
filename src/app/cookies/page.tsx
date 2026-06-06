import Link from 'next/link';
import PublicNav from '@/components/marketing/PublicNav';
import PublicFooter from '@/components/marketing/PublicFooter';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'سياسة الكوكيز',
  description: 'كيف تستخدم منشأتي AI ملفات الكوكيز',
};

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <PublicNav />
      <main className="flex-1 py-12 px-4">
        <div className="max-w-3xl mx-auto prose prose-gray">
          
          <h1 className="text-3xl font-black text-gray-900 mb-2">سياسة الكوكيز</h1>
          <p className="text-gray-500 text-sm mb-8">آخر تحديث: 1 يناير 2025</p>

          <section className="space-y-6 text-gray-700 leading-loose">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">ما هي الكوكيز؟</h2>
              <p>الكوكيز ملفات نصية صغيرة تُخزَّن على جهازك عند زيارة موقعنا، تساعد في تذكر تفضيلاتك وتحسين تجربتك.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">الكوكيز التي نستخدمها</h2>
              <table className="w-full text-sm border-collapse mt-3">
                <thead><tr className="bg-gray-50"><th className="border border-gray-200 px-3 py-2 text-right">الكوكي</th><th className="border border-gray-200 px-3 py-2 text-right">الغرض</th><th className="border border-gray-200 px-3 py-2 text-right">المدة</th></tr></thead>
                <tbody>
                  <tr><td className="border border-gray-200 px-3 py-2">sb-auth-token</td><td className="border border-gray-200 px-3 py-2">جلسة تسجيل الدخول (Supabase)</td><td className="border border-gray-200 px-3 py-2">ساعة</td></tr>
                  <tr><td className="border border-gray-200 px-3 py-2">sb-refresh-token</td><td className="border border-gray-200 px-3 py-2">تجديد الجلسة تلقائياً</td><td className="border border-gray-200 px-3 py-2">30 يوم</td></tr>
                  <tr><td className="border border-gray-200 px-3 py-2">pwa-dismissed</td><td className="border border-gray-200 px-3 py-2">تذكر إغلاق بانر التثبيت</td><td className="border border-gray-200 px-3 py-2">دائم</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">الكوكيز التي لا نستخدمها</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>كوكيز التتبع الإعلاني</li>
                <li>كوكيز التحليلات من جهات ثالثة (Google Analytics إلخ)</li>
                <li>كوكيز وسائل التواصل الاجتماعي</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">التحكم في الكوكيز</h2>
              <p>يمكنك حذف الكوكيز من إعدادات متصفحك. ملاحظة: حذف كوكيز الجلسة سيُخرجك من حسابك.</p>
            </div>
          </section>

        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
