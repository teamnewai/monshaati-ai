'use client';
import { useState } from 'react';
import PublicNav from '@/components/marketing/PublicNav';
import PublicFooter from '@/components/marketing/PublicFooter';
import Link from 'next/link';

const FAQ_CATEGORIES = [
  {
    id: 'product',
    label: '🛠️ المنتج',
    questions: [
      {
        q: 'ما الذي يفعله منشأتي AI بالضبط؟',
        a: 'منشأتي AI هي منصة ذكاء اصطناعي تُنشئ نظام التشغيل الكامل لمنشأتك: الهيكل التنظيمي، الأوصاف الوظيفية، السياسات والإجراءات، مؤشرات الأداء KPIs، وخطة التوظيف — كل ذلك في دقائق بدلاً من أسابيع.',
      },
      {
        q: 'كيف يعمل الذكاء الاصطناعي في توليد المحتوى؟',
        a: 'ندخل بيانات منشأتك (القطاع، الحجم، النشاط، الموقع) ثم نستخدم GPT-4o لتوليد محتوى مخصص ومتوافق مع السياق السعودي ونظام العمل. كل مخرج يُراجَع ويُضبط بناءً على المعايير المحلية.',
      },
      {
        q: 'هل يمكنني تعديل المخرجات بعد التوليد؟',
        a: 'نعم. جميع المخرجات قابلة للتعديل والتصدير بصيغة PDF أو Word. المنصة تعطيك نقطة انطلاق احترافية يمكنك تخصيصها حسب احتياجات منشأتك.',
      },
      {
        q: 'هل المحتوى متوافق مع نظام العمل السعودي؟',
        a: 'نعم. جميع السياسات والوثائق مبنية مع مراعاة نظام العمل السعودي، متطلبات التأمينات الاجتماعية، ومعايير رؤية 2030. ننصح دائماً بمراجعة مستشار قانوني للوثائق الحساسة.',
      },
      {
        q: 'ما القطاعات التي يدعمها منشأتي AI؟',
        a: 'نغطي أكثر من 14 قطاعاً: الصحة، التجزئة، التقنية، التعليم، المالية، الإنشاءات، اللوجستيات، الضيافة، العقارات، الطاقة، التصنيع، الاستشارات، غير الربحي، والحكومي.',
      },
    ],
  },
  {
    id: 'pricing',
    label: '💰 الأسعار',
    questions: [
      {
        q: 'هل هناك تجربة مجانية؟',
        a: 'نعم! يمكنك البدء مجاناً لمدة 14 يوماً مع 3 توليدات كاملة بدون أي بطاقة ائتمان. ستحصل على وصول كامل لجميع ميزات المنصة.',
      },
      {
        q: 'ما الفرق بين الباقات؟',
        a: 'الباقة الأساسية (99 ريال/شهر): 15 توليد + 3 منشآت. بيزنس (299 ريال/شهر): 50 توليد + 10 منشآت + أعضاء فريق. الاحترافية (799 ريال/شهر): توليد غير محدود + 99 منشأة + دعم أولوية.',
      },
      {
        q: 'هل يمكن الدفع بالريال السعودي؟',
        a: 'نعم. نقبل الدفع بالريال السعودي عبر بطاقات الائتمان والخصم المباشر. جميع الفواتير بالريال السعودي وتشمل ضريبة القيمة المضافة.',
      },
      {
        q: 'ماذا يحدث إذا أردت إلغاء اشتراكي؟',
        a: 'يمكن الإلغاء في أي وقت بدون رسوم. ستحتفظ بوصولك حتى نهاية الفترة المدفوعة، وستبقى بياناتك محفوظة لمدة 30 يوماً بعد الإلغاء.',
      },
    ],
  },
  {
    id: 'security',
    label: '🔒 الأمان',
    questions: [
      {
        q: 'كيف تحمون بيانات منشأتي؟',
        a: 'بياناتك مشفرة بـ AES-256 في كل وقت (أثناء النقل والتخزين). نستخدم Supabase مع Row Level Security لعزل كامل بين بيانات المستخدمين. لا تتشارك بيانات منشأتك مع أي منشأة أخرى.',
      },
      {
        q: 'هل تستخدمون بياناتنا لتدريب الذكاء الاصطناعي؟',
        a: 'لا. بيانات منشأتك ليست جزءاً من أي عملية تدريب. نستخدم OpenAI API مع إعدادات صارمة لضمان عدم استخدام البيانات للتدريب.',
      },
      {
        q: 'هل يمكن للمستخدمين المتعددين الوصول للمنشأة الواحدة؟',
        a: 'نعم. تدعم المنصة إدارة الأعضاء مع صلاحيات مختلفة (مالك، مدير، عضو، مشاهد). كل مستخدم له صلاحيات محددة.',
      },
      {
        q: 'هل المنصة تعمل 24/7؟',
        a: 'نعم. نضمن uptime أكثر من 99.9% مع مراقبة مستمرة. في حالة أي صيانة، نُخطر المستخدمين مسبقاً.',
      },
    ],
  },
  {
    id: 'consultants',
    label: '👥 المستشارون',
    questions: [
      {
        q: 'ما الفرق بين مستشار AI ومستشار بشري؟',
        a: 'مستشار AI متاح 24/7 ويجيب على أسئلتك الإدارية والمالية والتشغيلية بناءً على بيانات منشأتك الفعلية. المستشار البشري يوفر خبرة متعمقة ومتخصصة للحالات المعقدة التي تتجاوز قدرة الذكاء الاصطناعي.',
      },
      {
        q: 'كيف أحجز جلسة مع مستشار بشري؟',
        a: 'من قائمة المستشارين، اختر المستشار المناسب لاحتياجك، اختر الوقت المناسب، وأتم الدفع. ستتلقى رابط الاجتماع (Zoom أو Google Meet) فوراً.',
      },
      {
        q: 'هل المستشارون معتمدون؟',
        a: 'جميع المستشارين يمرون بعملية تحقق صارمة تشمل مراجعة الخبرات، الشهادات، وتقييمات العملاء قبل الموافقة على انضمامهم للمنصة.',
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-2xl transition-all ${open ? 'border-brand-300 bg-brand-50' : 'border-gray-200 bg-white'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-right gap-4">
        <span className={`font-semibold text-sm sm:text-base leading-snug ${open ? 'text-brand-800' : 'text-gray-900'}`}>
          {q}
        </span>
        <span className={`text-xl flex-shrink-0 transition-transform ${open ? 'rotate-45 text-brand-500' : 'text-gray-400'}`}>+</span>
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed border-t border-brand-200 pt-4">
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState('product');
  const active = FAQ_CATEGORIES.find(c => c.id === activeCategory) ?? FAQ_CATEGORIES[0];

  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <PublicNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-gray-50 to-white py-14 sm:py-20 px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-4">الأسئلة الشائعة</div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">كيف يمكننا مساعدتك؟</h1>
            <p className="text-gray-600 leading-relaxed">
              إجابات على أكثر الأسئلة شيوعاً حول منشأتي AI.
              لم تجد إجابتك؟{' '}
              <Link href="/contact" className="text-brand-600 font-semibold hover:underline">تواصل معنا مباشرةً</Link>.
            </p>
          </div>
        </section>

        {/* FAQ Content */}
        <section className="py-8 sm:py-12 px-4">
          <div className="max-w-4xl mx-auto">
            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
              {FAQ_CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    activeCategory === cat.id
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Questions */}
            <div className="space-y-3">
              {active.questions.map(item => (
                <FAQItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </section>

        {/* Still have questions */}
        <section className="py-12 sm:py-16 bg-gray-50 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-4xl mb-4">💬</div>
            <h2 className="text-xl font-black text-gray-900 mb-2">لا تزال لديك أسئلة؟</h2>
            <p className="text-gray-600 mb-6">فريق الدعم متاح خلال ساعات العمل — وسنرد خلال 24 ساعة.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/contact"
                className="px-6 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-colors">
                تواصل مع الدعم
              </Link>
              <a href="mailto:support@monshaati.ai"
                className="px-6 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors">
                support@monshaati.ai
              </a>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
