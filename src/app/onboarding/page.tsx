'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { ENTITY_TYPES, ORG_SIZES, COUNTRIES, CITIES } from '@/lib/utils';
import toast from 'react-hot-toast';

const ACTIVITIES = [
  'استشارات إدارية وتنظيمية وحوكمة',
  'برمجة وتطوير البرمجيات والتطبيقات',
  'تجارة التجزئة والجملة',
  'خدمات مالية ومحاسبة وتدقيق',
  'رعاية صحية وخدمات طبية',
  'تعليم وتدريب ومراكز تعليمية',
  'إنشاء ومقاولات وتشييد',
  'تصنيع وإنتاج صناعي',
  'لوجستيات ونقل وتخزين',
  'ضيافة وفنادق ومطاعم',
  'عقارات وتطوير عقاري',
  'تسويق وإعلان وعلاقات عامة',
  'خدمات قانونية ومحاماة',
  'أغذية ومشروبات',
  'طاقة وبيئة واستدامة',
  'تأمين وإدارة مخاطر',
  'سياحة وسفر وخدمات ترفيهية',
  'زراعة وثروة حيوانية',
  'تقنية الصحة والبيانات الطبية',
  'الاقتصاد الرقمي والتجارة الإلكترونية',
];

const STEPS = [
  { id: 1, title: 'معلومات المنشأة', icon: '🏢' },
  { id: 2, title: 'النشاط التجاري',  icon: '💼' },
  { id: 3, title: 'توليد AI',         icon: '🤖' },
];

const GEN_STEPS = [
  '🏗️ تحليل بيانات المنشأة وتصنيفها...',
  '📊 بناء الهيكل التنظيمي المناسب...',
  '📋 إنشاء الأوصاف الوظيفية التفصيلية...',
  '📜 صياغة السياسات والإجراءات...',
  '📈 تحديد مؤشرات الأداء الرئيسية...',
  '👥 وضع خطة التوظيف المرحلية...',
  '✅ مراجعة النتائج وحفظها...',
];

function OnboardingContent() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep]     = useState(0);
  const [errors, setErrors]       = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name:               '',
    entity_type:        '',
    primary_activity:   '',
    secondary_activity: '',
    employee_count:     '',
    country:            'SA',
    city:               '',
  });

  const checkAuth = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) router.push('/auth/login');
  }, [router, supabase.auth]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const set = (field: string, value: string) => {
    setForm(p => ({ ...p, [field]: value }));
    setErrors(p => { const e = { ...p }; delete e[field]; return e; });
  };

  const validateStep1 = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim())    e.name          = 'اسم المنشأة مطلوب';
    if (!form.entity_type)    e.entity_type   = 'نوع الكيان مطلوب';
    if (!form.employee_count) e.employee_count = 'عدد الموظفين مطلوب';
    if (!form.city)           e.city          = 'المدينة مطلوبة';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.primary_activity) e.primary_activity = 'النشاط الرئيسي مطلوب';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleGenerate = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    setStep(3);
    setGenerating(true);

    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < GEN_STEPS.length - 1) {
        stepIdx++;
        setGenStep(stepIdx);
      } else {
        clearInterval(interval);
      }
    }, 6000);

    try {
      // 1. Create org
      const orgRes = await fetch('/api/organizations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:               form.name.trim(),
          entity_type:        form.entity_type,
          primary_activity:   form.primary_activity,
          secondary_activity: form.secondary_activity || undefined,
          employee_count:     form.employee_count,
          country:            form.country,
          city:               form.city,
        }),
      });
      const { organization, error: orgError } = await orgRes.json() as {
        organization?: { id: string };
        error?: string;
      };
      if (orgError || !organization) throw new Error(orgError ?? 'فشل في إنشاء المنشأة');

      // 2. Generate AI content
      const genRes = await fetch('/api/ai/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: organization.id,
          input: {
            org_name:           form.name.trim(),
            entity_type:        form.entity_type,
            primary_activity:   form.primary_activity,
            secondary_activity: form.secondary_activity || undefined,
            employee_count:     form.employee_count,
            country:            form.country,
            city:               form.city,
          },
        }),
      });
      const { generation_id, error: genError } = await genRes.json() as {
        generation_id?: string;
        error?: string;
      };
      if (genError || !generation_id) throw new Error(genError ?? 'فشل في توليد النظام');

      clearInterval(interval);
      setGenStep(GEN_STEPS.length - 1);
      toast.success('🎉 تم توليد النظام التشغيلي بنجاح!');
      setTimeout(() => router.push(`/results/${generation_id}`), 800);

    } catch (err: unknown) {
      clearInterval(interval);
      const msg = err instanceof Error ? err.message : 'حدث خطأ. حاول مرة أخرى';
      toast.error(msg);
      setGenerating(false);
      setLoading(false);
      setStep(2);
    }
  };

  const cityOptions    = (CITIES[form.country] ?? []).map(c => ({ value: c, label: c }));
  const entityOptions  = Object.entries(ENTITY_TYPES).map(([v, l]) => ({ value: v, label: l }));
  const sizeOptions    = Object.entries(ORG_SIZES).map(([v, l]) => ({ value: v, label: l }));
  const countryOptions = Object.entries(COUNTRIES).map(([v, l]) => ({ value: v, label: l }));
  const activityOptions = ACTIVITIES.map(a => ({ value: a, label: a }));

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all
                    ${step > s.id
                      ? 'bg-green-500 text-white'
                      : step === s.id
                        ? 'bg-brand-500 text-white shadow-lg shadow-brand-200'
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                    {step > s.id ? '✓' : s.icon}
                  </div>
                  <div className={`text-xs mt-1 font-medium ${step >= s.id ? 'text-gray-700' : 'text-gray-400'}`}>
                    {s.title}
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded-full transition-all ${step > s.id ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <Card title="معلومات المنشأة الأساسية" subtitle="أدخل البيانات الأساسية لمنشأتك">
            <div className="space-y-5">
              <Input
                label="اسم المنشأة *"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="مثال: شركة النجاح للاستشارات"
                error={errors.name}
              />
              <Select
                label="نوع الكيان القانوني *"
                options={entityOptions}
                value={form.entity_type}
                onChange={e => set('entity_type', e.target.value)}
                placeholder="اختر نوع الكيان"
                error={errors.entity_type}
              />
              <Select
                label="عدد الموظفين الحاليين *"
                options={sizeOptions}
                value={form.employee_count}
                onChange={e => set('employee_count', e.target.value)}
                placeholder="اختر الحجم"
                error={errors.employee_count}
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="الدولة *"
                  options={countryOptions}
                  value={form.country}
                  onChange={e => { set('country', e.target.value); set('city', ''); }}
                />
                <Select
                  label="المدينة *"
                  options={cityOptions}
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                  placeholder="اختر المدينة"
                  error={errors.city}
                />
              </div>

              <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm text-brand-700">
                💡 ستتمكن من تعديل جميع المعلومات لاحقاً من إعدادات المنشأة
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={() => { if (validateStep1()) setStep(2); }}
              >
                التالي: النشاط التجاري ←
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <Card title="النشاط التجاري والتخصص" subtitle="ساعدنا في فهم طبيعة عمل منشأتك">
            <div className="space-y-5">
              <Select
                label="النشاط الرئيسي *"
                options={activityOptions}
                value={form.primary_activity}
                onChange={e => set('primary_activity', e.target.value)}
                placeholder="اختر النشاط الرئيسي"
                error={errors.primary_activity}
              />
              <Input
                label="تخصص إضافي أو وصف النشاط"
                value={form.secondary_activity}
                onChange={e => set('secondary_activity', e.target.value)}
                placeholder="مثال: نركز على استشارات التحول الرقمي للبنوك"
                hint="كلما كان الوصف أدق، كانت المخرجات أفضل"
              />

              {form.primary_activity && (
                <div className="bg-gradient-to-br from-brand-50 to-blue-50 border border-brand-200 rounded-xl p-5">
                  <h4 className="font-bold text-brand-800 mb-4">✨ ملخص ما سيتم توليده</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    {([
                      ['🏢', 'المنشأة', form.name],
                      ['⚖️', 'النوع',   ENTITY_TYPES[form.entity_type]],
                      ['👥', 'الحجم',   ORG_SIZES[form.employee_count]],
                      ['📍', 'الموقع',  `${form.city} — ${form.country}`],
                      ['💼', 'النشاط',  form.primary_activity],
                    ] as [string, string, string][]).map(([icon, label, value]) => (
                      <div key={label} className="bg-white/70 rounded-lg p-2.5">
                        <div className="text-gray-400 text-xs">{icon} {label}</div>
                        <div className="font-semibold text-gray-800 mt-0.5 text-xs leading-tight">{value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['🏗️ هيكل تنظيمي','📋 أوصاف وظيفية','📜 سياسات','📊 KPIs','👥 خطة توظيف'].map(tag => (
                      <span key={tag} className="text-xs bg-brand-100 text-brand-700 px-2.5 py-1 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" size="lg" onClick={() => setStep(1)} className="flex-1">
                  ← السابق
                </Button>
                <Button
                  size="lg"
                  onClick={handleGenerate}
                  loading={loading}
                  disabled={!form.primary_activity}
                  className="flex-1"
                >
                  🤖 توليد النظام التشغيلي
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 3 — Generating */}
        {step === 3 && generating && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-brand-200 rounded-full animate-ping opacity-60" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-4xl shadow-xl">
                🤖
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">جاري بناء نظامك التشغيلي</h2>
            <p className="text-gray-400 text-sm mb-8">{form.name} | {form.primary_activity}</p>

            <div className="space-y-2 max-w-md mx-auto text-right">
              {GEN_STEPS.map((s, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500
                  ${i < genStep
                    ? 'bg-green-50 opacity-60'
                    : i === genStep
                      ? 'bg-brand-50 border border-brand-200'
                      : 'bg-gray-50 opacity-40'
                  }`}>
                  <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs
                    ${i < genStep
                      ? 'bg-green-500 text-white'
                      : i === genStep
                        ? 'border-2 border-brand-500 border-t-transparent animate-spin'
                        : 'bg-gray-200'
                    }`}>
                    {i < genStep ? '✓' : ''}
                  </div>
                  <span className={`text-sm ${i === genStep ? 'font-semibold text-brand-700' : 'text-gray-600'}`}>
                    {s}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-300 mt-8">قد يستغرق ذلك 30 — 60 ثانية</p>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
