import type { Metadata } from 'next';
import PublicNav from '@/components/marketing/PublicNav';
import PublicFooter from '@/components/marketing/PublicFooter';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'فريقنا',
  description: 'تعرّف على الفريق الذي بنى منشأتي AI — خبراء في الذكاء الاصطناعي وإدارة الأعمال والسوق السعودي.',
  openGraph: {
    title: 'فريقنا | منشأتي AI',
    description: 'فريق من الخبراء السعوديين في الذكاء الاصطناعي وإدارة الأعمال.',
  },
};

const TEAM = [
  {
    name: 'فريق القيادة',
    members: [
      {
        name: 'محمد العمري',
        role: 'الرئيس التنفيذي والمؤسس',
        bio: 'أكثر من 12 عاماً في إدارة الأعمال والتحول الرقمي. عمل مع كبرى المنشآت في المملكة على بناء أنظمة التشغيل المؤسسي.',
        icon: '👔',
        linkedin: '#',
      },
      {
        name: 'سارة الغامدي',
        role: 'مديرة التقنية والذكاء الاصطناعي',
        bio: 'متخصصة في الذكاء الاصطناعي وتعلم الآلة. درست هندسة الحاسب في جامعة الملك عبدالله للعلوم والتقنية (كاوست).',
        icon: '💻',
        linkedin: '#',
      },
      {
        name: 'عبدالرحمن السالم',
        role: 'مدير المنتج',
        bio: 'خبرة 8 سنوات في تصميم منتجات SaaS للسوق العربي. شغل سابقاً مناصب قيادية في كبرى شركات التقنية السعودية.',
        icon: '🎨',
        linkedin: '#',
      },
    ],
  },
  {
    name: 'فريق الخبراء الاستشاريين',
    members: [
      {
        name: 'د. خالد المالكي',
        role: 'مستشار قانوني — نظام العمل السعودي',
        bio: 'محامٍ معتمد ومتخصص في نظام العمل السعودي ولوائح الموارد البشرية. عضو هيئة المحامين السعوديين.',
        icon: '⚖️',
        linkedin: '#',
      },
      {
        name: 'نورة القحطاني',
        role: 'خبيرة الموارد البشرية وتطوير المنظمات',
        bio: 'خبرة أكثر من 15 عاماً في إدارة الموارد البشرية وتطوير المنظمات في قطاعي البنوك والتجزئة.',
        icon: '👥',
        linkedin: '#',
      },
      {
        name: 'أحمد الشهري',
        role: 'مستشار مالي وامتثال رؤية 2030',
        bio: 'متخصص في متطلبات هيئة الزكاة والضريبة والامتثال التنظيمي وربط استراتيجيات الأعمال بمبادرات رؤية 2030.',
        icon: '📊',
        linkedin: '#',
      },
    ],
  },
];

const PERKS = [
  { icon: '🌍', text: 'فريق موزع في الرياض وجدة والدمام' },
  { icon: '🎓', text: 'خلفيات أكاديمية وعملية متنوعة' },
  { icon: '💡', text: 'ثقافة ابتكار وتجريب مستمر' },
  { icon: '🤝', text: 'نؤمن بالتعاون وبناء الشراكات' },
];

export default function TeamPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <PublicNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-gray-50 to-white py-16 sm:py-20 px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-4">فريقنا</div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
              الأشخاص الذين يبنون منشأتي AI
            </h1>
            <p className="text-gray-600 leading-relaxed text-lg">
              فريق متنوع من الخبراء في الذكاء الاصطناعي، وإدارة الأعمال، والقانون، والموارد البشرية —
              كلهم يجمعهم هدف واحد: بناء أفضل أداة لتشغيل المنشآت السعودية.
            </p>
          </div>
        </section>

        {/* Team sections */}
        {TEAM.map(section => (
          <section key={section.name} className="py-12 sm:py-16 px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-xl font-bold text-gray-700 mb-8 pb-4 border-b border-gray-200">
                {section.name}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {section.members.map(member => (
                  <div key={member.name}
                    className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-brand-300 hover:shadow-md transition-all">
                    <div className="w-16 h-16 bg-gradient-to-br from-brand-50 to-brand-100 rounded-2xl flex items-center justify-center text-3xl mb-4">
                      {member.icon}
                    </div>
                    <h3 className="font-bold text-gray-900 text-base mb-0.5">{member.name}</h3>
                    <div className="text-xs text-brand-600 font-semibold mb-3">{member.role}</div>
                    <p className="text-sm text-gray-600 leading-relaxed">{member.bio}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* Culture */}
        <section className="py-12 sm:py-16 bg-brand-500 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-black text-white mb-2">ثقافتنا</h2>
              <p className="text-brand-100">نؤمن بأن بيئة العمل الصحية تُنتج منتجات أفضل</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {PERKS.map(p => (
                <div key={p.text} className="bg-white/10 rounded-2xl p-5 text-center">
                  <div className="text-3xl mb-2">{p.icon}</div>
                  <div className="text-white text-xs font-medium leading-snug">{p.text}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Join us */}
        <section className="py-12 sm:py-16 px-4 text-center">
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-black text-gray-900 mb-3">انضم إلى فريقنا</h2>
            <p className="text-gray-600 mb-6">
              نبحث دائماً عن مواهب استثنائية تؤمن برسالتنا وتريد أن تُحدث أثراً حقيقياً في السوق السعودي.
            </p>
            <Link href="/contact"
              className="inline-block px-8 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-colors">
              أرسل سيرتك الذاتية
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
