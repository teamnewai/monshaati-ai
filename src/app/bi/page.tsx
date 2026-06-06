'use client';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, StatCard } from '@/components/ui/Card';

const BI_MODULES = [
  { href: '/bi/funding',        icon: '💰', title: 'التمويل والدعم',         desc: 'برامج حكومية، مسرعات، بنوك، منح', color: 'text-green-600',  bg: 'bg-green-50' },
  { href: '/bi/cost',           icon: '📊', title: 'محاسبة التكاليف',        desc: 'تكلفة الوحدة، نقطة التعادل، هامش الربح', color: 'text-blue-600', bg: 'bg-blue-50' },
  { href: '/bi/financial',      icon: '📈', title: 'الإدارة المالية',          desc: 'التدفق النقدي، P&L، تحليل الإيرادات', color: 'text-purple-600', bg: 'bg-purple-50' },
  { href: '/bi/loss-analysis',  icon: '🚨', title: 'تحليل الخسائر والإنقاذ', desc: 'تحليل أسباب الخسارة، خطة إنقاذ 30/90/180 يوم', color: 'text-red-600', bg: 'bg-red-50' },
  { href: '/bi/business-state', icon: '🎯', title: 'تحليل الوضع الحالي',     desc: 'الوضع الحالي vs المستهدف، تحليل الفجوة', color: 'text-amber-600', bg: 'bg-amber-50' },
  { href: '/bi/recommendations',icon: '🤖', title: 'توصيات الذكاء الاصطناعي','desc': 'توصيات مخصصة مع شرح "لماذا؟"', color: 'text-brand-600', bg: 'bg-brand-50' },
];

export default function BIHomePage() {
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ذكاء الأعمال 🧠</h1>
        <p className="text-gray-500 mt-1">تحليلات متقدمة وتوصيات مدعومة بالذكاء الاصطناعي</p>
      </div>

      <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl p-6 mb-8 text-white">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🤖</div>
          <div>
            <h2 className="text-xl font-bold mb-1">Business Intelligence مدعوم بـ GPT-4o</h2>
            <p className="opacity-90 text-sm">
              تحليلات مالية، توصيات تمويلية، خطط إنقاذ، وتحليل الفجوة — كل ذلك مخصص لمنشأتك
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {BI_MODULES.map(m => (
          <Link key={m.href} href={m.href}>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer h-full">
              <div className={`w-14 h-14 ${m.bg} rounded-2xl flex items-center justify-center text-3xl mb-4`}>
                {m.icon}
              </div>
              <h3 className={`text-lg font-bold mb-1 ${m.color}`}>{m.title}</h3>
              <p className="text-sm text-gray-500">{m.desc}</p>
              <div className={`mt-4 text-xs font-semibold ${m.color} flex items-center gap-1`}>
                ابدأ التحليل ←
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 bg-gray-50 rounded-2xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-900 mb-3">🔍 نظام المساعدة السياقية</h3>
        <p className="text-sm text-gray-600 mb-3">
          جميع حقول الإدخال في منظومة BI مزودة بأيقونة <span className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">ℹ</span> التي تقدم:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['📝 تعريف الحقل', '💡 مثال عملي', '📐 المعادلة', '📌 نصائح'].map(tip => (
            <div key={tip} className="bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700 text-center">{tip}</div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
