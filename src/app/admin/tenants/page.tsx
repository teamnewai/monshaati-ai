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
import type { Tenant } from '@/types/database';

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [total,   setTotal]   = useState(0);
  const [filter,  setFilter]  = useState('');
  const [acting,  setActing]  = useState<string | null>(null);
  const router   = useRouter();
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set('q', search);
    if (filter) p.set('status', filter);
    const res = await fetch(`/api/admin/tenants?${p}`);
    if (res.status === 403) { router.push('/dashboard'); return; }
    if (res.ok) { const d = await res.json(); setTenants(d.tenants ?? []); setTotal(d.total ?? 0); }
    setLoading(false);
  }, [search, filter, router, supabase.auth]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id: string, action: string) => {
    setActing(id);
    await fetch('/api/admin/tenants', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
    setActing(null);
    load();
  };

  const activeTenants = tenants.filter(t => t.is_active && !t.suspended_at);
  const totalRevenue  = tenants.reduce((s, t) => s + (t.total_revenue ?? 0), 0);

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">White Label Control Center</h1>
          <p className="text-gray-500 mt-1">{total} مستأجر</p>
        </div>
        <Link href="/admin/tenants/new">
          <Button>+ إنشاء مستأجر</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard value={String(total)}         label="إجمالي المستأجرين" icon="🏢" color="brand" />
        <StatCard value={String(activeTenants.length)} label="نشط" icon="✅" color="green" />
        <StatCard value={`$${totalRevenue.toFixed(0)}`} label="إجمالي الإيرادات" icon="💰" color="purple" />
        <StatCard value={`$299`}                label="سعر الباقة/شهر" icon="📦" color="blue" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input placeholder="بحث بالاسم أو الـ slug..." value={search}
          onChange={(e: { target: { value: string } }) => setSearch(e.target.value)} className="flex-1" />
        {['', 'active', 'suspended'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${filter === s ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-gray-300 text-gray-600'}`}>
            {s === '' ? 'الكل' : s === 'active' ? '✅ نشط' : '🚫 موقوف'}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner className="py-20" size="lg" /> :
       tenants.length === 0 ? (
        <EmptyState icon="🏢" title="لا توجد مستأجرون" description="أنشئ أول مستأجر White Label"
          action={{ label: 'إنشاء مستأجر', href: '/admin/tenants/new' }} />
       ) : (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {tenants.map(t => (
            <div key={t.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: t.primary_color ?? '#c8912a' }}>
                {t.logo_url ? <img src={t.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover" /> : t.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 truncate">{t.name_ar ?? t.name}</span>
                  <Badge variant={t.is_active && !t.suspended_at ? 'success' : 'error'}>
                    {t.is_active && !t.suspended_at ? 'نشط' : 'موقوف'}
                  </Badge>
                  {t.domain_verified && <Badge variant="info">✓ دومين</Badge>}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  /{t.slug} | {t.custom_domain ?? 'لا يوجد دومين'} | {t.orgs_count} منشأة | ${t.total_revenue?.toFixed(0) ?? 0} إيراد
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link href={`/admin/tenants/${t.id}`}>
                  <Button size="sm" variant="outline">إدارة</Button>
                </Link>
                <button
                  onClick={() => handleAction(t.id, t.suspended_at ? 'activate' : 'suspend')}
                  disabled={acting === t.id}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    t.suspended_at ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}>
                  {acting === t.id ? '...' : t.suspended_at ? 'تفعيل' : 'إيقاف'}
                </button>
              </div>
            </div>
          ))}
        </div>
       )}
    </DashboardLayout>
  );
}
