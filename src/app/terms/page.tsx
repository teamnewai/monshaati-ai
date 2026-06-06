import Link from 'next/link';
import PublicNav from '@/components/marketing/PublicNav';
import PublicFooter from '@/components/marketing/PublicFooter';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'الشروط والأحكام',
  description: 'شروط وأحكام استخدام منصة منشأتي AI',
};

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <PublicNav />
      <main className="flex-1 py-12 px-4">
        <div className="max-w-3xl mx-auto prose prose-gray">
          
          <h1 className="text-3xl font-black text-gray-900 mb-2">الشروط والأحكام</h1>
          <p className="text-gray-500 text-sm mb-8">آخر تحديث: 1 يناير 2025 | شركة منشأتي لتقنية المعلومات</p>

          <section className="space-y-6 text-gray-700 leading-loose">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">1. القبول بالشروط</h2>
              <p>باستخدام منصة منشأتي AI، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي من هذه الشروط، يرجى عدم استخدام المنصة.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">2. وصف الخدمة</h2>
              <p>منشأتي AI هي منصة برمجية (SaaS) تستخدم الذكاء الاصطناعي لإنشاء الهياكل التنظيمية والسياسات والأوصاف الوظيفية ومؤشرات الأداء للمنشآت. جميع المخرجات ذات طابع استرشادي وتحتاج مراجعة من متخصصين قبل التطبيق.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">3. حسابات المستخدمين</h2>
              <p>أنت مسؤول عن الحفاظ على سرية بيانات اعتمادك وعن جميع الأنشطة التي تتم تحت حسابك. يجب أن تكون بالغاً (18 سنة فأكثر) لاستخدام المنصة.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">4. الاشتراكات والمدفوعات</h2>
              <p>تُدار المدفوعات عبر Stripe. الاشتراكات تُجدَّد تلقائياً ما لم يتم الإلغاء قبل 24 ساعة من تاريخ التجديد. جميع الأسعار بالريال السعودي شاملة ضريبة القيمة المضافة (15%).</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">5. الملكية الفكرية</h2>
              <p>المحتوى المُنشأ بواسطة المنصة باستخدام بيانات منشأتك يعود ملكيته لك. منشأتي AI تحتفظ بحقوق منصتها وتقنيتها وقاعدة بياناتها المحتوى الأساسية.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">6. إخلاء المسؤولية</h2>
              <p>المنصة تُقدَّم "كما هي". لا نضمن دقة أو اكتمال أي مخرجات AI. لا نتحمل مسؤولية أي قرارات تجارية أو قانونية أو مالية تتخذها بناءً على هذه المخرجات.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">7. تحديد المسؤولية</h2>
              <p>لا تتجاوز مسؤوليتنا الإجمالية تجاهك مبلغ الاشتراك الذي دفعته خلال الـ 3 أشهر السابقة لأي مطالبة.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">8. إنهاء الخدمة</h2>
              <p>يحق لنا إنهاء أو تعليق حسابك في حالة انتهاك هذه الشروط. يمكنك إلغاء اشتراكك في أي وقت عبر إعدادات حسابك.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">9. القانون المنظم</h2>
              <p>تخضع هذه الشروط لأنظمة وقوانين المملكة العربية السعودية. أي نزاعات تُحال للمحاكم المختصة في مدينة الرياض.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">10. التواصل</h2>
              <p>للاستفسارات القانونية: <a href="mailto:legal@monshaati.ai" className="text-brand-600">legal@monshaati.ai</a></p>
            </div>
          </section>

        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
