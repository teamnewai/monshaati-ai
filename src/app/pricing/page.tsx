'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const PLANS = [
  {
    id:       'starter',
    name:     'ستارتر',
    nameEn:   'Starter',
    price:    99,
    currency: 'ريال',
    period:   'شهرياً',
    badge:    null,
    color:    'blue',
    features: [
      '15 توليد شهرياً',
      '3 منشآت',
      '5 مستخدمين',
      'الهيكل التنظيمي',
      'الأوصاف الوظيفية',
      'السياسات والإجراءات',
      'مؤشرات الأداء (KPIs)',
      'خطة التوظيف',
      'تصدير PDF + Word',
      'دعم بالبريد الإلكتروني',
    ],
    cta: 'ابدأ مجاناً 7 أيام',
    trial: true,
  },
  {
    id:       'business',
    name:     'بيزنس',
    nameEn:   'Business',
    price:    299,
    currency: 'ريال',
    period:   'شهرياً',
    badge:    '🔥 الأكثر شعبية',
    color:    'brand',
    features: [
      '50 توليد شهرياً',
      '10 منشآت',
      '20 مستخدماً',
      'جميع مميزات ستارتر',
      'إدارة الأعضاء',
      'تتبع مؤشرات الأداء',
      'تصدير متقدم',
      'لوحة تحكم الإدارة',
      'API وصول',
      'دعم ذو أولوية',
    ],
    cta: 'ابدأ الآن',
    trial: false,
  },
  {
    id:       'professional',
    name:     'احترافي',
    nameEn:   'Professional',
    price:    799,
    currency: 'ريال',
    period:   'شهرياً',
    badge:    '⚡ غير محدود',
    color:    'purple',
    features: [
      'توليد غير محدود',
      'منشآت غير محدودة',
      'مستخدمون غير محدودون',
      'جميع مميزات بيزنس',
      'White-label (علامتك التجارية)',
      'تكاملات مخصصة',
      'مدير حساب مخصص',
      'SLA ضمان الأداء 99.9%',
      'تدريب الفريق',
      'دعم على مدار الساعة',
    ],
    cta: 'تواصل معنا',
    trial: false,
  },
];

const COLOR_MAP: Record<string, { border: string; badge: string; btn: string; check: string }> = {
  blue:   { border: 'border-blue-400',   badge: 'bg-blue-100 text-blue-800',    btn: 'bg-blue-600 hover:bg-blue-700',     check: 'text-blue-500' },
  brand:  { border: 'border-brand-500',  badge: 'bg-brand-100 text-brand-800',  btn: 'bg-brand-500 hover:bg-brand-600',   check: 'text-brand-500' },
  purple: { border: 'border-purple-400', badge: 'bg-purple-100 text-purple-800',btn: 'bg-purple-600 hover:bg-purple-700', check: 'text-purple-500' },
};

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [orgId,   setOrgId]   = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const router  = useRouter();
  const supabase = createClient();

  const loadOrg = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setIsAuthed(true);
    const res = await fetch('/api/organizations');
    if (res.ok) {
      const { organizations } = await res.json();
      if (organizations?.length) setOrgId(organizations[0].id);
    }
  }, [supabase.auth]);

  useEffect(() => { loadOrg(); }, [loadOrg]);

  const handleSubscribe = async (planId: string) => {
    if (!isAuthed) { router.push('/auth/signup'); return; }
    if (!orgId) { router.push('/onboarding'); return; }

    setLoading(planId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan: planId, org_id: orgId }),
      });
      const { url, error } = await res.json();
      if (error) { toast.error(error); return; }
      window.location.href = url;
    } catch {
      toast.error('حدث خطأ. حاول مرة أخرى');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center text-white font-black">م</div>
            <span className="font-bold text-gray-900">منشأتي AI</span>
          </Link>
          {isAuthed
            ? <Link href="/dashboard"><Button variant="outline" size="sm">لوحة التحكم</Button></Link>
            : <Link href="/auth/login"><Button size="sm">تسجيل الدخول</Button></Link>
          }
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-16">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="inline-block bg-brand-100 text-brand-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            💎 الباقات والأسعار
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
            اختر الباقة المناسبة لمنشأتك
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            ابدأ مجاناً لـ 14 يوم. لا حاجة لبطاقة ائتمانية. ألغِ في أي وقت.
          </p>
        </div>

        {/* Free trial banner */}
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl p-6 mb-10 text-white text-center">
          <div className="text-2xl font-bold mb-1">🎉 جميع الحسابات الجديدة تحصل على 3 توليدات مجانية</div>
          <div className="opacity-90">لا تحتاج بطاقة ائتمانية للبدء</div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-12">
          {PLANS.map(plan => {
            const colors = COLOR_MAP[plan.color];
            const isPopular = plan.color === 'brand';
            return (
              <div key={plan.id} className={cn(
                'bg-white rounded-2xl border-2 overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-xl',
                isPopular ? `${colors.border} shadow-lg shadow-brand-100` : 'border-gray-200'
              )}>
                {plan.badge && (
                  <div className={cn('text-center py-2.5 text-sm font-bold', colors.badge)}>
                    {plan.badge}
                  </div>
                )}
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-black text-gray-900">{plan.name}</h2>
                    <div className="text-gray-400 text-sm">{plan.nameEn}</div>
                    <div className="mt-4 flex items-end gap-2">
                      <span className="text-3xl sm:text-4xl font-black text-gray-900">{plan.price}</span>
                      <div className="text-gray-500 pb-1">
                        <div className="text-sm font-medium">{plan.currency}</div>
                        <div className="text-xs">{plan.period}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loading === plan.id}
                    className={cn(
                      'w-full py-3 rounded-xl text-white font-bold text-sm transition-all mb-6',
                      colors.btn,
                      'disabled:opacity-60 disabled:cursor-not-allowed'
                    )}
                  >
                    {loading === plan.id ? '⏳ جاري التحميل...' : plan.cta}
                  </button>

                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <span className={cn('font-bold flex-shrink-0 mt-0.5', colors.check)}>✓</span>
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">الأسئلة الشائعة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {[
              ['هل يمكنني إلغاء الاشتراك؟', 'نعم، يمكنك الإلغاء في أي وقت بدون رسوم إضافية. ستبقى خدماتك تعمل حتى نهاية فترة الفوترة.'],
              ['ما هي طرق الدفع المقبولة؟', 'نقبل جميع بطاقات الائتمان والخصم (Visa, Mastercard, Amex) وApple Pay.'],
              ['هل يمكنني الترقية أو الخفض؟', 'نعم، يمكنك تغيير باقتك في أي وقت. سيتم احتساب الفرق تلقائياً.'],
              ['هل بياناتي آمنة؟', 'نعم. نستخدم تشفير SSL/TLS وقواعد بيانات آمنة. لا نشارك بياناتك مع أطراف ثالثة.'],
            ].map(([q, a]) => (
              <div key={q}>
                <h3 className="font-semibold text-gray-900 mb-1">{q}</h3>
                <p className="text-sm text-gray-500">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
