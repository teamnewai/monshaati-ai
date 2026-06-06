import Link from 'next/link';
import PublicNav from '@/components/marketing/PublicNav';
import PublicFooter from '@/components/marketing/PublicFooter';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'سياسة الاسترداد',
  description: 'سياسة استرداد الأموال في منشأتي AI',
};

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <PublicNav />
      <main className="flex-1 py-12 px-4">
        <div className="max-w-3xl mx-auto prose prose-gray">
          
          <h1 className="text-3xl font-black text-gray-900 mb-2">سياسة الاسترداد</h1>
          <p className="text-gray-500 text-sm mb-8">آخر تحديث: 1 يناير 2025 | شركة منشأتي لتقنية المعلومات</p>

          <section className="space-y-6 text-gray-700 leading-loose">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">1. الاشتراكات الشهرية</h2>
              <p>يمكن إلغاء الاشتراك في أي وقت. <strong>لا يوجد استرداد جزئي</strong> للفترة المتبقية من الشهر الحالي — ستحتفظ بالوصول حتى نهاية الفترة المدفوعة.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">2. ضمان استرداد الأموال (7 أيام)</h2>
              <p>إذا كنت غير راضٍ خلال أول 7 أيام من أول اشتراك مدفوع، سنرد لك المبلغ كاملاً دون أسئلة. أرسل طلبك إلى: <a href="mailto:legal@monshaati.ai" className="text-brand-600">legal@monshaati.ai</a></p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">3. خدمات Pay As You Go</h2>
              <p>مدفوعات PAYG (الخدمات المدفوعة منفردة) غير قابلة للاسترداد بعد تقديم الخدمة.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">4. جلسات المستشارين</h2>
              <p>يمكن إلغاء جلسة المستشار واسترداد المبلغ كاملاً إذا تم الإلغاء قبل 24 ساعة من الموعد. الإلغاء بعد ذلك لا يستحق استرداداً.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">5. العطل التقنية</h2>
              <p>في حالة انقطاع الخدمة لأكثر من 24 ساعة متواصلة بسبب خطأ من طرفنا، سنُعوِّضك بأيام مجانية مساوية لفترة الانقطاع.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">6. كيفية طلب الاسترداد</h2>
              <p>أرسل طلبك إلى <a href="mailto:legal@monshaati.ai" className="text-brand-600">legal@monshaati.ai</a> مع رقم الفاتورة. نعالج الطلبات خلال 3-5 أيام عمل.</p>
            </div>
          </section>

        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
