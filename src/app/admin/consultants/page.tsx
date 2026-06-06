'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, StatCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import toast from 'react-hot-toast';

type ConsultantStatus = 'pending' | 'active' | 'suspended' | 'inactive';

const STATUS_CONFIG: Record<ConsultantStatus, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  pending:   { label: 'قيد المراجعة', variant: 'warning' },
  active:    { label: 'نشط',          variant: 'success' },
  suspended: { label: 'موقوف',        variant: 'error' },
  inactive:  { label: 'مرفوض',        variant: 'default' },
};

export default function AdminConsultantsPage() {
  const [consultants, setConsultants] = useState<Record<string, unknown>[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filter,      setFilter]      = useState<ConsultantStatus | 'all'>('all');
  const [total,       setTotal]       = useState(0);
  const [acting,      setActing]      = useState<string | null>(null);
  const router   = useRouter();
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }
    setLoading(true);
    const p = new URLSearchParams();
    if (filter !== 'all') p.set('status', filter);
    if (search)           p.set('q', search);
    const res = await fetch('/api/admin/consultants?' + p);
    if (res.status === 403) { router.push('/dashboard'); return; }
    if (res.ok) { const d = await res.json(); setConsultants(d.consultants ?? []); setTotal(d.total ?? 0); }
    setLoading(false);
  }, [filter, search, router, supabase.auth]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id: string, action: string, notes?: string) => {
    setActing(id);
    const res = await fetch(`/api/admin/consultants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes }),
    });
    const d = await res.json();
    if (d.consultant) {
      toast.success(action === 'approve' ? 'تم قبول المستشار ✅' : action === 'reject' ? 'تم الرفض' : 'تم التحديث');
      await load();
    } else { toast.error(d.error ?? 'خطأ'); }
    setActing(null);
  };

  const pendingCount = consultants.filter(c => c.status === 'pending').length;
  const activeCount  = consultants.filter(c => c.status === 'active').length;

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة المستشارين</h1>
          <p className="text-gray-500 mt-1">{total} مستشار</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard value={String(total)}        label="إجمالي"       icon="👥" color="brand" />
        <StatCard value={String(pendingCount)} label="قيد المراجعة" icon="⏳" color="orange" />
        <StatCard value={String(activeCount)}  label="نشط"          icon="✅" color="green" />
        <StatCard value={String(consultants.filter(c => c.status === 'suspended').length)} label="موقوف" icon="🚫" color="blue" />
      </div>

      <div className="flex gap-3 mb-4">
        <Input placeholder="بحث..." value={search}
          onChange={(e: { target: { value: string } }) => setSearch(e.target.value)} className="flex-1" />
        {(['all', 'pending', 'active', 'suspended', 'inactive'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${filter === s ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-gray-300 text-gray-600'}`}>
            {s === 'all' ? 'الكل' : s === 'pending' ? 'مراجعة' : s === 'active' ? 'نشط' : s === 'suspended' ? 'موقوف' : 'مرفوض'}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner className="py-20" size="lg" /> :
       consultants.length === 0 ? (
        <EmptyState icon="👥" title="لا يوجد مستشارون" description="لا توجد نتائج" />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {consultants.map(c => {
            const status  = (c.status as ConsultantStatus) ?? 'pending';
            const conf    = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
            const profile = c.profiles as Record<string,unknown> | undefined;
            return (
              <div key={c.id as string} className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors">
                <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-lg bg-brand-500">
                  {(c.display_name_ar as string ?? c.display_name as string ?? '?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-gray-900 text-sm truncate">
                      {c.display_name_ar as string ?? c.display_name as string}
                    </span>
                    <Badge variant={conf.variant}>{conf.label}</Badge>
                    {c.stripe_onboarded && <Badge variant="info">💳 Stripe</Badge>}
                  </div>
                  <div className="text-xs text-gray-400">
                    {profile?.email as string} | {c.years_experience as number} سنوات | ⭐ {Number(c.avg_rating ?? 0).toFixed(1)} ({c.total_reviews as number} تقييم)
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {((c.specializations as string[]) ?? []).slice(0,3).map((s: string) => (
                      <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <Link href={`/admin/consultants/${c.id}`}>
                    <Button size="sm" variant="outline">التفاصيل</Button>
                  </Link>
                  {status === 'pending' && (
                    <button
                      onClick={() => handleAction(c.id as string, 'approve')}
                      disabled={acting === c.id as string}
                      className="text-xs bg-green-100 text-green-700 border border-green-300 px-3 py-1.5 rounded-lg font-medium hover:bg-green-200 disabled:opacity-50 transition-colors">
                      {acting === c.id as string ? '...' : '✅ قبول'}
                    </button>
                  )}
                  {status === 'pending' && (
                    <button
                      onClick={() => handleAction(c.id as string, 'reject', 'لا يستوفي المتطلبات')}
                      disabled={acting === c.id as string}
                      className="text-xs bg-red-100 text-red-700 border border-red-300 px-3 py-1.5 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50 transition-colors">
                      ❌ رفض
                    </button>
                  )}
                  {status === 'active' && (
                    <button
                      onClick={() => handleAction(c.id as string, 'suspend')}
                      disabled={acting === c.id as string}
                      className="text-xs bg-amber-100 text-amber-700 border border-amber-300 px-3 py-1.5 rounded-lg font-medium hover:bg-amber-200 disabled:opacity-50 transition-colors">
                      🚫 إيقاف
                    </button>
                  )}
                  {(status === 'suspended' || status === 'inactive') && (
                    <button
                      onClick={() => handleAction(c.id as string, 'activate')}
                      disabled={acting === c.id as string}
                      className="text-xs bg-green-100 text-green-700 border border-green-300 px-3 py-1.5 rounded-lg font-medium hover:bg-green-200 disabled:opacity-50 transition-colors">
                      ✅ تفعيل
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
