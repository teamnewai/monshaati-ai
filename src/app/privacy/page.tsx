import Link from 'next/link';
import PublicNav from '@/components/marketing/PublicNav';
import PublicFooter from '@/components/marketing/PublicFooter';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'سياسة الخصوصية',
  description: 'كيف تجمع منشأتي AI بياناتك وتستخدمها وتحميها',
};

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <PublicNav />
      <main className="flex-1 py-12 px-4">
        <div className="max-w-3xl mx-auto prose prose-gray">
          
          <h1 className="text-3xl font-black text-gray-900 mb-2">سياسة الخصوصية</h1>
          <p className="text-gray-500 text-sm mb-8">آخر تحديث: 1 يناير 2025 | شركة منشأتي لتقنية المعلومات</p>

          <section className="space-y-6 text-gray-700 leading-loose">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">1. البيانات التي نجمعها</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>بيانات الحساب: الاسم، البريد الإلكتروني، كلمة المرور (مُشفَّرة)</li>
                <li>بيانات المنشأة: اسم المنشأة، القطاع، الحجم، الموقع</li>
                <li>بيانات الاستخدام: الصفحات المُزارة، عمليات التوليد، وقت الاستخدام</li>
                <li>بيانات الدفع: تُعالَج عبر Stripe ولا نحتفظ ببيانات البطاقة</li>
                <li>ملفات الكوكيز والبيانات التقنية: عنوان IP، المتصفح، الجهاز</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">2. كيف نستخدم بياناتك</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>تقديم وتطوير خدمات المنصة</li>
                <li>إرسال إيميلات الخدمة (تأكيد، إشعارات، فواتير)</li>
                <li>تحسين تجربة المستخدم وتخصيص المحتوى</li>
                <li>الامتثال للمتطلبات القانونية والتنظيمية</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">3. مشاركة البيانات</h2>
              <p>لا نبيع بياناتك لأي طرف ثالث. نشارك البيانات فقط مع:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Supabase: تخزين قاعدة البيانات (مُشفَّر)</li>
                <li>OpenAI: معالجة طلبات AI (بدون تخزين دائم)</li>
                <li>Stripe: معالجة المدفوعات</li>
                <li>Resend: إرسال الإيميلات</li>
                <li>Vercel: استضافة التطبيق</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">4. أمان البيانات</h2>
              <p>نستخدم تشفير AES-256 للبيانات في التخزين والنقل، مع Row Level Security على جميع 52 جدولاً في قاعدة البيانات. بيانات منشأتك معزولة تماماً عن باقي المستخدمين.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">5. حقوقك</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>حق الوصول: طلب نسخة من بياناتك</li>
                <li>حق التصحيح: تعديل بياناتك غير الدقيقة</li>
                <li>حق الحذف: طلب حذف حسابك وبياناتك</li>
                <li>حق الاعتراض: الاعتراض على معالجة معينة</li>
              </ul>
              <p className="mt-2">لممارسة حقوقك: <a href="mailto:legal@monshaati.ai" className="text-brand-600">legal@monshaati.ai</a></p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">6. الكوكيز</h2>
              <p>نستخدم كوكيز ضرورية لعمل الجلسة وتسجيل الدخول. لا نستخدم كوكيز تتبع إعلاني. راجع <a href="/cookies" className="text-brand-600">سياسة الكوكيز</a> لمزيد من التفاصيل.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">7. الاحتفاظ بالبيانات</h2>
              <p>نحتفظ ببياناتك طوال فترة اشتراكك + 30 يوماً بعد الإلغاء. بيانات الفوترة تُحتفظ بها 7 سنوات وفق المتطلبات القانونية.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">8. تحديثات السياسة</h2>
              <p>نُعلمك بأي تغييرات جوهرية عبر البريد الإلكتروني قبل 30 يوماً من التطبيق.</p>
            </div>
          </section>

        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
