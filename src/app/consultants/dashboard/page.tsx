'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, StatCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import type { ConsultantProfile, ConsultantBooking } from '@/types/database';
import toast from 'react-hot-toast';

const STATUS_LABELS: Record<string, { label: string; variant: 'success'|'warning'|'error'|'info'|'default' }> = {
  pending:   { label: 'قيد الانتظار', variant: 'warning' },
  confirmed: { label: 'مؤكد',          variant: 'success' },
  completed: { label: 'مكتمل',         variant: 'info' },
  cancelled: { label: 'ملغى',          variant: 'error' },
  no_show:   { label: 'لم يحضر',       variant: 'default' },
};

export default function ConsultantDashboardPage() {
  const [profile,  setProfile]  = useState<ConsultantProfile | null>(null);
  const [bookings, setBookings] = useState<ConsultantBooking[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [applying, setApplying] = useState(false);
  const router  = useRouter();
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }

    const [profRes, bookRes] = await Promise.all([
      fetch('/api/consultants?my=true'),
      fetch('/api/bookings?role=consultant'),
    ]);

    if (profRes.ok) {
      const d = await profRes.json();
      // Find own profile
      const own = (d.consultants ?? []).find((c: ConsultantProfile) => true); // first result for now
      setProfile(own ?? null);
    }
    if (bookRes.ok) {
      const d = await bookRes.json();
      setBookings(d.bookings ?? []);
    }
    setLoading(false);
  }, [router, supabase.auth]);

  useEffect(() => { load(); }, [load]);

  const applyAsConsultant = async () => {
    setApplying(true);
    const res = await fetch('/api/consultants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name:    'اسمك الكامل',
        display_name_ar: 'اسمك بالعربية',
        specializations: ['استشارات إدارية'],
        languages:       ['ar'],
        years_experience: 5,
        country: 'SA',
        price_30min_usd: 15,
        price_60min_usd: 25,
        price_30min_sar: 56.25,
        price_60min_sar: 93.75,
      }),
    });
    if (res.ok) { toast.success('تم تقديم الطلب! سيراجعه الفريق خلال 24 ساعة'); await load(); }
    else { const d = await res.json(); toast.error(d.error ?? 'خطأ'); }
    setApplying(false);
  };

  const updateStatus = async (bookingId: string, status: string) => {
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}) }),
    });
    if (res.ok) { toast.success('تم التحديث'); await load(); }
    else toast.error('خطأ في التحديث');
  };

  if (loading) return <DashboardLayout><LoadingSpinner className="py-32" size="lg" /></DashboardLayout>;

  const handleStripeConnect = async () => {
    if (!profile) return;
    const res = await fetch('/api/consultant/stripe-connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consultant_id: profile.id }),
    });
    const d = await res.json();
    if (d.url) window.location.href = d.url;
    else toast.error(d.error ?? 'خطأ');
  };

  // Stats
  const totalEarnings   = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + b.price_usd, 0);
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const completedCount  = bookings.filter(b => b.status === 'completed').length;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">لوحة تحكم المستشار</h1>
          <p className="text-gray-500 mt-1">إدارة ملفك وجلساتك الاستشارية</p>
        </div>

        {!profile ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">👤</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">انضم كمستشار معتمد</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              شارك خبرتك مع المنشآت السعودية واحصل على عمولة من كل جلسة استشارية
            </p>
            <div className="grid grid-cols-3 gap-4 mb-8 max-w-sm mx-auto text-sm text-gray-600">
              <div className="bg-gray-50 rounded-xl p-3"><div className="font-bold text-brand-600">20%</div>عمولة المنصة</div>
              <div className="bg-gray-50 rounded-xl p-3"><div className="font-bold text-brand-600">80%</div>عائدك</div>
              <div className="bg-gray-50 rounded-xl p-3"><div className="font-bold text-brand-600">24h</div>مراجعة الطلب</div>
            </div>
            <Button onClick={applyAsConsultant} loading={applying} size="lg">
              التقديم كمستشار
            </Button>
          </div>
        ) : (
          <>
            {/* Status banner */}
            {profile.status === 'pending' && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
                <span className="text-2xl">⏳</span>
                <div>
                  <div className="font-semibold text-amber-800">طلبك قيد المراجعة</div>
                  <div className="text-sm text-amber-600">سيراجع الفريق ملفك خلال 24-48 ساعة</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 mb-8">
              <StatCard value={`$${totalEarnings.toFixed(0)}`} label="أرباحي المكتملة" icon="💰" color="green" />
              <StatCard value={String(pendingBookings)} label="حجوزات معلقة"   icon="⏰" color="orange" />
              <StatCard value={`${profile.avg_rating > 0 ? profile.avg_rating.toFixed(1) : '—'} ⭐`} label="متوسط التقييم" icon="⭐" color="brand" />
            </div>

            {/* Profile info */}
            <Card title="ملفك الشخصي" className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{profile.display_name_ar ?? profile.display_name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={profile.status === 'active' ? 'success' : profile.status === 'pending' ? 'warning' : 'error'}>
                      {profile.status === 'active' ? 'نشط' : profile.status === 'pending' ? 'قيد المراجعة' : 'معلق'}
                    </Badge>
                    <span className="text-sm text-gray-500">{profile.total_sessions} جلسة | {profile.total_reviews} تقييم</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {profile.specializations.map(s => <Badge key={s}>{s}</Badge>)}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => router.push(`/consultants/${profile.id}`)}>
                  عرض الملف العام
                </Button>
              </div>
            </Card>

            {/* Stripe Connect */}
            {!profile.stripe_onboarded ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">💳</span>
                  <div>
                    <div className="font-bold text-amber-800">اربط حساب Stripe للحصول على مدفوعاتك</div>
                    <div className="text-sm text-amber-600">مطلوب لاستلام أرباحك من الجلسات</div>
                  </div>
                </div>
                <Button onClick={handleStripeConnect} className="w-full bg-amber-500 hover:bg-amber-600">
                  ربط Stripe Connect →
                </Button>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div className="flex-1">
                  <div className="font-semibold text-green-800">Stripe متصل — أرباحك محمية</div>
                  <div className="text-sm text-green-600">يمكنك استلام مدفوعاتك تلقائياً</div>
                </div>
              </div>
            )}

            {/* Bookings */}
            <Card title={`الحجوزات (${bookings.length})`}>
              {bookings.length === 0 ? (
                <EmptyState icon="📅" title="لا توجد حجوزات بعد" description="ستظهر هنا حجوزات العملاء بعد الإعلان عن ملفك" />
              ) : (
                <div className="divide-y divide-gray-100">
                  {bookings.map(b => {
                    // bAny intentionally unused
                    const status = STATUS_LABELS[b.status] ?? STATUS_LABELS.pending;
                    return (
                      <div key={b.id} className="py-4 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium text-gray-900">
                            {b.duration === '30min' ? '30 دقيقة' : '60 دقيقة'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(b.scheduled_at).toLocaleString('ar-SA')}
                          </div>
                          <div className="text-sm text-gray-400">${b.price_usd}</div>
                          {b.meeting_url && (
                            <a href={b.meeting_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-brand-600 hover:underline">🔗 رابط الجلسة</a>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={status.variant}>{status.label}</Badge>
                          {b.status === 'confirmed' && (
                            <Button size="sm" onClick={() => updateStatus(b.id, 'completed')}>
                              إنهاء الجلسة
                            </Button>
                          )}
                          {b.status === 'pending' && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, 'cancelled')}>
                              رفض
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
