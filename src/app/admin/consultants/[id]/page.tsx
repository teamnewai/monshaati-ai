'use client';
import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, StatCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

type Action = 'approve' | 'reject' | 'suspend' | 'activate';

export default function AdminConsultantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data,     setData]     = useState<Record<string, unknown> | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [acting,   setActing]   = useState(false);
  const [notes,    setNotes]    = useState('');
  const [tab,      setTab]      = useState<'overview' | 'bookings' | 'payouts' | 'settings'>('overview');
  const [payAmount, setPayAmount] = useState('');
  const [paying,   setPaying]   = useState(false);
  const router   = useRouter();
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }
    const res = await fetch(`/api/admin/consultants/${id}`);
    if (res.status === 403) { router.push('/admin/consultants'); return; }
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [id, router, supabase.auth]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (action: Action) => {
    setActing(true);
    const res = await fetch(`/api/admin/consultants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes: notes || undefined }),
    });
    const d = await res.json();
    if (d.consultant) {
      toast.success(action === 'approve' ? '✅ تم قبول المستشار' : '✅ تم التحديث');
      setNotes('');
      await load();
    } else toast.error(d.error ?? 'خطأ');
    setActing(false);
  };

  const handlePayout = async () => {
    if (!payAmount) return;
    setPaying(true);
    const cons = data?.consultant as Record<string,unknown> ?? {};
    const stats = data?.stats as Record<string,unknown> ?? {};
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const periodEnd   = now.toISOString().split('T')[0];
    const res = await fetch('/api/consultant/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consultant_id: id,
        amount_usd: Number(payAmount),
        period_start: periodStart,
        period_end: periodEnd,
        bookings_count: stats.completed_sessions ?? 0,
      }),
    });
    const d = await res.json();
    if (d.payout) {
      toast.success('تم إنشاء الدفعة!');
      setPayAmount('');
      await load();
    } else toast.error(d.error ?? 'خطأ');
    setPaying(false);
  };

  if (loading) return <DashboardLayout><LoadingSpinner className="py-32" size="lg" /></DashboardLayout>;
  if (!data)   return <DashboardLayout><div className="text-center py-20">غير موجود</div></DashboardLayout>;

  const cons   = data.consultant as Record<string,unknown>;
  const stats  = data.stats as Record<string,unknown>;
  const profile = cons.profiles as Record<string,unknown> | undefined;
  const bookings = data.recent_bookings as Record<string,unknown>[];
  const payouts  = data.payouts as Record<string,unknown>[];
  const status   = cons.status as string;

  const TABS = [
    { id: 'overview', label: '📊 نظرة عامة' },
    { id: 'bookings', label: `📅 الحجوزات (${bookings.length})` },
    { id: 'payouts',  label: `💰 المدفوعات (${payouts.length})` },
    { id: 'settings', label: '⚙️ الإعدادات' },
  ] as const;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center text-white font-black text-2xl flex-shrink-0">
            {(cons.display_name_ar as string ?? cons.display_name as string ?? '?')[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{cons.display_name_ar as string ?? cons.display_name as string}</h1>
              <Badge variant={status === 'active' ? 'success' : status === 'pending' ? 'warning' : 'error'}>
                {status === 'active' ? 'نشط' : status === 'pending' ? 'مراجعة' : status === 'suspended' ? 'موقوف' : 'مرفوض'}
              </Badge>
              {cons.stripe_onboarded && <Badge variant="info">💳 Stripe Connected</Badge>}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{profile?.email as string} | {cons.years_experience as number} سنوات خبرة</p>
          </div>
          <Link href="/admin/consultants"><Button variant="outline" size="sm">← الرجوع</Button></Link>
        </div>

        {/* Quick Actions */}
        {status === 'pending' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
            <div className="font-semibold text-amber-800 mb-3">⏳ في انتظار المراجعة</div>
            <div className="mb-3">
              <label className="text-xs font-semibold text-gray-700 block mb-1">ملاحظات (اختياري)</label>
              <textarea value={notes} onChange={(e: { target: { value: string } }) => setNotes(e.target.value)} rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-brand-400 focus:outline-none"
                placeholder="ملاحظات للمستشار..." />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => handleAction('approve')} loading={acting} className="flex-1 bg-green-600 hover:bg-green-700">
                ✅ قبول وتفعيل
              </Button>
              <Button onClick={() => handleAction('reject')} loading={acting} variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50">
                ❌ رفض
              </Button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard value={String(stats.completed_sessions ?? 0)} label="جلسات مكتملة" icon="✅" color="green" />
          <StatCard value={`$${Number(stats.total_earned_usd ?? 0).toFixed(0)}`} label="إجمالي الإيرادات" icon="💰" color="brand" />
          <StatCard value={Number(stats.avg_rating ?? 0).toFixed(1)} label="متوسط التقييم" icon="⭐" color="blue" />
          <StatCard value={String(stats.pending_bookings ?? 0)} label="حجوزات معلقة" icon="⏰" color="orange" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <Card title="معلومات الملف الشخصي">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['التخصصات', ((cons.specializations as string[]) ?? []).join('، ')],
                  ['القطاعات', ((cons.industries as string[]) ?? []).join('، ')],
                  ['الدولة', cons.country as string],
                  ['اللغات', ((cons.languages as string[]) ?? []).join('، ')],
                  ['سعر 30 دقيقة', `${cons.price_30min_sar as number} ريال`],
                  ['سعر 60 دقيقة', `${cons.price_60min_sar as number} ريال`],
                  ['عمولة المنصة', `${cons.platform_commission_pct as number}%`],
                  ['Stripe Account', cons.stripe_account_id as string ?? 'غير مربوط'],
                ].map((row, idx) => {
                  const lbl = row[0] ?? '';
                  const val = row[1] ?? '—';
                  return (
                  <div key={idx} className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-400 mb-1">{lbl}</div>
                    <div className="font-medium text-gray-900 text-xs truncate">{val}</div>
                  </div>
                  );
                })}
              </div>
              {cons.bio_ar ? <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100">{String(cons.bio_ar)}</p> : null}
            </Card>
          </div>
        )}

        {/* BOOKINGS */}
        {tab === 'bookings' && (
          <Card title="الحجوزات">
            {bookings.length === 0 ? <div className="text-center py-8 text-gray-400 text-sm">لا توجد حجوزات</div> : (
              <div className="divide-y divide-gray-100">
                {bookings.map(b => (
                  <div key={b.id as string} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-medium">{b.duration as string === '30min' ? '30 دقيقة' : '60 دقيقة'}</div>
                      <div className="text-xs text-gray-400">{new Date(b.scheduled_at as string).toLocaleDateString('ar-SA')}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-bold text-brand-600">${Number(b.price_usd ?? 0).toFixed(0)}</div>
                      <Badge variant={b.status === 'completed' ? 'success' : b.status === 'confirmed' ? 'info' : b.status === 'cancelled' ? 'error' : 'warning'}>
                        {b.status as string}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* PAYOUTS */}
        {tab === 'payouts' && (
          <div className="space-y-4">
            {status === 'active' && (
              <Card title="إنشاء دفعة جديدة">
                <div className="flex gap-3">
                  <input type="number" value={payAmount} onChange={(e: { target: { value: string } }) => setPayAmount(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
                    placeholder="المبلغ بالدولار" />
                  <Button onClick={handlePayout} loading={paying} disabled={!cons.stripe_onboarded}>
                    {cons.stripe_onboarded ? 'إرسال الدفعة' : 'يحتاج Stripe Connect'}
                  </Button>
                </div>
                {!cons.stripe_onboarded && (
                  <p className="text-xs text-amber-600 mt-2">⚠️ يجب أن يكمل المستشار ربط حساب Stripe أولاً</p>
                )}
              </Card>
            )}
            <Card title="سجل المدفوعات">
              {payouts.length === 0 ? <div className="text-center py-8 text-gray-400 text-sm">لا توجد مدفوعات بعد</div> : (
                <div className="divide-y divide-gray-100">
                  {payouts.map(p => (
                    <div key={p.id as string} className="flex items-center justify-between py-3">
                      <div>
                        <div className="text-sm font-medium">{p.period_start as string} → {p.period_end as string}</div>
                        <div className="text-xs text-gray-400">{p.bookings_count as number} جلسة | عمولة: ${Number(p.platform_fee_usd ?? 0).toFixed(0)}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-bold text-green-700">${Number(p.net_amount_usd ?? 0).toFixed(0)}</div>
                          <div className="text-xs text-gray-400">من ${Number(p.amount_usd ?? 0).toFixed(0)}</div>
                        </div>
                        <Badge variant={p.status === 'paid' ? 'success' : p.status === 'processing' ? 'info' : 'warning'}>
                          {p.status as string === 'paid' ? 'مدفوع' : p.status as string === 'processing' ? 'جاري' : 'معلق'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <Card title="إجراءات الحساب">
            <div className="space-y-3">
              {status === 'active' && (
                <Button variant="outline" className="w-full border-amber-300 text-amber-600"
                  onClick={() => handleAction('suspend')} loading={acting}>
                  🚫 إيقاف المستشار مؤقتاً
                </Button>
              )}
              {(status === 'suspended' || status === 'inactive') && (
                <Button className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => handleAction('activate')} loading={acting}>
                  ✅ إعادة تفعيل المستشار
                </Button>
              )}
              {status === 'pending' && (
                <Button variant="outline" className="w-full border-red-300 text-red-600"
                  onClick={() => handleAction('reject')} loading={acting}>
                  ❌ رفض الطلب
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
