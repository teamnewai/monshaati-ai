import type { Metadata } from 'next';
import Link from 'next/link';
import PublicNav from '@/components/marketing/PublicNav';
import PublicFooter from '@/components/marketing/PublicFooter';

export const metadata: Metadata = {
  title: 'من نحن',
  description: 'تعرّف على منشأتي AI — المنصة الأولى للذكاء الاصطناعي المتخصصة في بناء أنظمة التشغيل للمنشآت السعودية والخليجية.',
  openGraph: {
    title: 'من نحن | منشأتي AI',
    description: 'رؤيتنا أن تمتلك كل منشأة في السوق السعودي نظام تشغيل مؤسسي متكامل بدون تعقيد.',
  },
};

const STATS = [
  { value: '500+', label: 'منشأة تستخدم المنصة' },
  { value: '15,000+', label: 'وثيقة مؤسسية أُنشئت' },
  { value: '8',  label: 'قطاعات تجارية مدعومة' },
  { value: '99%', label: 'رضا العملاء' },
];

const VALUES = [
  { icon: '🎯', title: 'دقة المحتوى', body: 'كل مخرجاتنا مراجعة من خبراء ومبنية على أفضل الممارسات في السوق السعودي وفق نظام العمل ومتطلبات رؤية 2030.' },
  { icon: '⚡', title: 'السرعة في التنفيذ', body: 'ما كان يستغرق أسابيع مع مكاتب الاستشارات، يمكنك الحصول عليه في دقائق مع الحفاظ على الجودة والاحترافية.' },
  { icon: '🔒', title: 'الأمان والخصوصية', body: 'بياناتك مشفرة ومعزولة. لا تتشارك بيانات منشأتك مع أي طرف آخر. أمان بنك على منصة SaaS.' },
  { icon: '🇸🇦', title: 'السياق المحلي', body: 'نفهم السوق السعودي. من نطاقات إلى الزكاة، من رؤية 2030 إلى بيئة العمل — منصتنا مصممة للسياق المحلي.' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <PublicNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-brand-50 to-white py-16 sm:py-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block bg-brand-100 text-brand-700 text-xs font-bold px-3 py-1 rounded-full mb-6">
              🇸🇦 صُنع في المملكة للمملكة
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-gray-900 leading-tight mb-6">
              نبني معك أساس منشأتك
              <br />
              <span className="text-brand-500">بسرعة الذكاء الاصطناعي</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
              منشأتي AI هي منصة التشغيل المؤسسي الأولى في السوق السعودي التي تستخدم الذكاء الاصطناعي
              لبناء الهيكل التنظيمي، والسياسات، والأوصاف الوظيفية، ومؤشرات الأداء — كلها في دقائق.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 border-y border-gray-100 bg-gray-50 px-4">
          <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
            {STATS.map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-brand-600 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Mission */}
        <section className="py-16 sm:py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid sm:grid-cols-2 gap-12 items-center">
              <div>
                <div className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-4">رؤيتنا</div>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">
                  كل منشأة تستحق نظام تشغيل مؤسسي متكامل
                </h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  كانت أنظمة التشغيل المؤسسية حكراً على الشركات الكبيرة القادرة على تحمّل تكاليف الاستشارات. نحن غيّرنا ذلك.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  مع منشأتي AI، تستطيع أي منشأة — صغيرة كانت أم كبيرة — الحصول على هيكل تنظيمي احترافي،
                  سياسات متوافقة مع نظام العمل السعودي، ومؤشرات أداء مخصصة لقطاعها.
                </p>
              </div>
              <div className="bg-gradient-to-br from-brand-50 to-brand-100 rounded-3xl p-8 space-y-4">
                {['نظام العمل السعودي', 'رؤية 2030', 'نطاقات والسعودة', 'معايير الجودة الدولية'].map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-800 font-medium text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 sm:py-20 bg-gray-50 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-3">قيمنا</div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900">ما يميزنا</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {VALUES.map(v => (
                <div key={v.title} className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-brand-300 transition-colors">
                  <div className="text-3xl mb-3">{v.icon}</div>
                  <h3 className="font-bold text-gray-900 mb-2">{v.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="py-16 sm:py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <div className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-3">قصتنا</div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900">كيف بدأنا؟</h2>
            </div>
            <div className="space-y-5 text-gray-600 leading-loose text-base">
              <p>
                بدأت فكرة منشأتي AI من تجربة حقيقية — رأينا كيف تُعاني المنشآت الصغيرة والمتوسطة في السوق السعودي
                من غياب الهياكل التنظيمية، وعدم وجود سياسات واضحة، وضعف مؤشرات قياس الأداء.
              </p>
              <p>
                كانت الحلول التقليدية إما باهظة التكلفة مع مكاتب الاستشارات، أو تستغرق أسابيع في التنفيذ.
                قررنا أن نبني حلاً يجمع بين سرعة الذكاء الاصطناعي وعمق الخبرة الاستشارية المحلية.
              </p>
              <p>
                اليوم، منشأتي AI يخدم مئات المنشآت في المملكة العربية السعودية والإمارات، ويساعدها على بناء
                أسس مؤسسية متينة تتوافق مع رؤية 2030 ومتطلبات السوق المتنامية.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-brand-500 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">ابدأ رحلتك معنا اليوم</h2>
            <p className="text-brand-100 mb-8">جرّب المنصة مجاناً لمدة 14 يوماً — بدون بطاقة ائتمان</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/signup"
                className="px-8 py-3 bg-white text-brand-600 font-bold rounded-xl hover:bg-gray-50 transition-colors">
                ابدأ مجاناً
              </Link>
              <Link href="/contact"
                className="px-8 py-3 border-2 border-white/30 text-white font-bold rounded-xl hover:bg-white/10 transition-colors">
                تواصل معنا
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
