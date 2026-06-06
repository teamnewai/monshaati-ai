'use client';
import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { ConsultantProfile, ConsultantReview } from '@/types/database';
import toast from 'react-hot-toast';

const DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

export default function ConsultantProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data,      setData]      = useState<{ consultant: ConsultantProfile; reviews: ConsultantReview[]; availability: Record<string,unknown>[] } | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [duration,  setDuration]  = useState<'30min' | '60min'>('60min');
  const [booking,   setBooking]   = useState(false);
  const [orgId,     setOrgId]     = useState<string | null>(null);
  const [selDay,    setSelDay]    = useState<number | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    const [consultRes, orgsRes] = await Promise.all([
      fetch(`/api/consultants/${id}`),
      fetch('/api/organizations'),
    ]);
    if (consultRes.ok) setData(await consultRes.json());
    if (orgsRes.ok) {
      const d = await orgsRes.json();
      setOrgId(d.organizations?.[0]?.id ?? null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleBook = async () => {
    if (!orgId) { router.push('/onboarding'); return; }
    if (selDay === null) { toast.error('اختر يوماً للجلسة'); return; }
    setBooking(true);
    try {
      const now = new Date();
      const daysUntil = (selDay - now.getDay() + 7) % 7 || 7;
      const scheduled = new Date(now.getTime() + daysUntil * 86400000);
      scheduled.setHours(10, 0, 0, 0);

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultant_id: id, duration, scheduled_at: scheduled.toISOString(), org_id: orgId }),
      });
      const d = await res.json();
      if (d.url) window.location.href = d.url;
      else toast.error(d.error ?? 'حدث خطأ');
    } finally { setBooking(false); }
  };

  if (loading) return <DashboardLayout><LoadingSpinner className="py-32" size="lg" /></DashboardLayout>;
  if (!data)   return <DashboardLayout><div className="text-center py-20 text-gray-500">لم يُوجد المستشار</div></DashboardLayout>;

  const { consultant: c, reviews, availability } = data;
  const price = duration === '30min' ? c.price_30min_sar : c.price_60min_sar;
  const availDays = availability.map((a: Record<string,unknown>) => a.day_of_week as number);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 bg-brand-100 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0">
              {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-20 h-20 rounded-2xl object-cover" /> : '👤'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{c.display_name_ar ?? c.display_name}</h1>
                {c.is_featured && <Badge variant="info">⭐ مستشار مميز</Badge>}
                {c.verified_at && <Badge variant="success">✓ موثق</Badge>}
              </div>
              <p className="text-gray-500 mb-2">{c.years_experience} سنوات خبرة | {c.country}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {c.specializations.map(s => <Badge key={s}>{s}</Badge>)}
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div>⭐ {c.avg_rating > 0 ? c.avg_rating.toFixed(1) : '—'} ({c.total_reviews} تقييم)</div>
                <div>📋 {c.total_sessions} جلسة</div>
                <div>🌍 {c.languages.join('، ')}</div>
              </div>
            </div>
          </div>
          {c.bio_ar && <p className="text-gray-700 mt-4 leading-relaxed">{c.bio_ar}</p>}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Availability */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">أيام التوفر</h2>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day, i) => (
                  <button key={i}
                    onClick={() => setSelDay(i)}
                    disabled={!availDays.includes(i)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      selDay === i ? 'bg-brand-500 text-white' :
                      availDays.includes(i) ? 'bg-brand-50 text-brand-700 hover:bg-brand-100' :
                      'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}>
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">التقييمات ({reviews.length})</h2>
              {reviews.length === 0 ? (
                <p className="text-gray-400 text-sm">لا توجد تقييمات بعد</p>
              ) : reviews.map(r => (
                <div key={r.id} className="py-4 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm">{r.rating === 5 ? '⭐⭐⭐⭐⭐' : r.rating === 4 ? '⭐⭐⭐⭐' : '⭐⭐⭐'}</span>
                    {r.title && <span className="font-semibold text-gray-800">{r.title}</span>}
                  </div>
                  {r.body && <p className="text-sm text-gray-600">{r.body}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Booking Card */}
          <div className="bg-white rounded-2xl border-2 border-brand-200 p-5 h-fit sticky top-24">
            <h3 className="font-bold text-gray-900 mb-4">احجز جلسة</h3>
            <div className="space-y-3 mb-4">
              {(['30min','60min'] as const).map(dur => (
                <button key={dur}
                  onClick={() => setDuration(dur)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    duration === dur ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <span className="text-sm font-medium">{dur === '30min' ? '30 دقيقة' : '60 دقيقة'}</span>
                  <span className="font-bold text-brand-600">
                    {dur === '30min' ? c.price_30min_sar.toFixed(0) : c.price_60min_sar.toFixed(0)} ريال
                  </span>
                </button>
              ))}
            </div>
            {selDay !== null && (
              <p className="text-sm text-gray-500 mb-3">📅 يوم {DAYS[selDay]} القادم</p>
            )}
            <Button className="w-full" onClick={handleBook} loading={booking}
              disabled={selDay === null}>
              احجز الآن — {price.toFixed(0)} ريال
            </Button>
            <p className="text-xs text-gray-400 text-center mt-2">الدفع آمن عبر Stripe</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
