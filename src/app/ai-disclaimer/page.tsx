import Link from 'next/link';
import PublicNav from '@/components/marketing/PublicNav';
import PublicFooter from '@/components/marketing/PublicFooter';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'إخلاء مسؤولية الذكاء الاصطناعي',
  description: 'إخلاء المسؤولية عن مخرجات الذكاء الاصطناعي في منشأتي AI',
};

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <PublicNav />
      <main className="flex-1 py-12 px-4">
        <div className="max-w-3xl mx-auto prose prose-gray">
          
          <h1 className="text-3xl font-black text-gray-900 mb-2">إخلاء مسؤولية الذكاء الاصطناعي</h1>
          <p className="text-gray-500 text-sm mb-8">آخر تحديث: 1 يناير 2025</p>

          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 mb-8">
            <p className="text-amber-900 font-bold text-lg leading-relaxed">
              ⚠️ تم إنشاء جميع التوصيات والوثائق والتحليلات الواردة في هذه المنصة بواسطة الذكاء الاصطناعي
              لأغراض استرشادية فقط، ولا تُعدّ استشارة قانونية أو مالية أو استثمارية أو مهنية ملزمة.
            </p>
          </div>

          <section className="space-y-6 text-gray-700 leading-loose">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">طبيعة مخرجات الذكاء الاصطناعي</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>المخرجات مُنشأة بواسطة نماذج لغوية كبيرة (GPT-4o) وقد تحتوي على أخطاء أو معلومات غير محدّثة</li>
                <li>الهياكل التنظيمية والسياسات تمثل أطراً مقترحة، ليست قرارات نهائية</li>
                <li>مؤشرات الأداء KPIs تحتاج مراجعة وتكييف مع واقع منشأتك الفعلي</li>
                <li>الأوصاف الوظيفية قد لا تعكس جميع المتطلبات التنظيمية المحلية</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">ما يجب مراجعته من متخصصين</h2>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>قانوني:</strong> أي سياسة تؤثر على حقوق الموظفين أو التزامات قانونية</li>
                <li><strong>مالي:</strong> أي توصيات تتعلق بالاستثمار أو التمويل أو الميزانية</li>
                <li><strong>HR:</strong> عقود العمل وسياسات التوظيف والراتب</li>
                <li><strong>ضريبي/محاسبي:</strong> أي بيانات مالية أو إقرارات ضريبية</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">مسؤولية المستخدم</h2>
              <p>يتحمل المستخدم مسؤولية:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>التحقق من دقة وصحة جميع المخرجات قبل تطبيقها</li>
                <li>مراجعة المختصين المرخصين قبل اتخاذ أي قرارات مهمة</li>
                <li>التأكد من توافق المخرجات مع الأنظمة والقوانين المحلية</li>
              </ul>
            </div>
          </section>

        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
