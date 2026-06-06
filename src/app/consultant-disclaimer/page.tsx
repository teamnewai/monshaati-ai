import Link from 'next/link';
import PublicNav from '@/components/marketing/PublicNav';
import PublicFooter from '@/components/marketing/PublicFooter';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'إخلاء مسؤولية المستشارين',
  description: 'شروط وأحكام خدمة المستشارين في منشأتي AI',
};

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <PublicNav />
      <main className="flex-1 py-12 px-4">
        <div className="max-w-3xl mx-auto prose prose-gray">
          
          <h1 className="text-3xl font-black text-gray-900 mb-2">إخلاء مسؤولية المستشارين</h1>
          <p className="text-gray-500 text-sm mb-8">آخر تحديث: 1 يناير 2025</p>

          <section className="space-y-6 text-gray-700 leading-loose">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">طبيعة خدمة المستشارين</h2>
              <p>منشأتي AI تعمل كوسيط يربط أصحاب المنشآت بمستشارين مستقلين. المستشارون يُقدمون آراءهم المهنية بشكل مستقل ولا يمثلون منشأتي AI.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">التحقق من المستشارين</h2>
              <p>نقوم بمراجعة خبرات المستشارين وتقييماتهم، لكن لا نتحمل مسؤولية دقة جميع ادعاءاتهم المهنية. ننصح بالتحقق المستقل من مؤهلات المستشار قبل الاعتماد على استشارته في قرارات مهمة.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">المسؤولية القانونية</h2>
              <p>منشأتي AI غير مسؤولة عن:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>دقة أو نتائج الاستشارات المقدمة من المستشارين</li>
                <li>أي قرارات تتخذها بناءً على توصيات المستشارين</li>
                <li>أي خسائر مالية أو تشغيلية ناتجة عن تطبيق الاستشارات</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">الاستشارات المالية والقانونية</h2>
              <p>الاستشارات المتعلقة بالمسائل القانونية أو المالية أو الضريبية تحتاج تحقق من مختص مرخص. استشاراتنا ذات طابع إرشادي.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">سياسة الإلغاء والاسترداد</h2>
              <p>راجع <a href="/refund" className="text-brand-600">سياسة الاسترداد</a> للاطلاع على شروط إلغاء جلسات المستشارين.</p>
            </div>
          </section>

        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
