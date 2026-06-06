'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, StatCard } from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface RevenueSummary {
  total_revenue_usd:    number;
  subscription_revenue: number;
  payg_revenue:         number;
  consultation_revenue: number;
  marketplace_revenue:  number;
  active_subscriptions: number;
  this_month_payg:      number;
}

interface PlanBreakdown { starter: number; business: number; professional: number; }

export default function RevenueAdminPage() {
  const [summary,   setSummary]   = useState<RevenueSummary | null>(null);
  const [plans,     setPlans]     = useState<PlanBreakdown | null>(null);
  const [loading,   setLoading]   = useState(true);
  const router  = useRouter();
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }
    const res = await fetch('/api/admin/revenue');
    if (res.status === 403) { router.push('/dashboard'); return; }
    if (res.ok) {
      const d = await res.json();
      setSummary(d.summary);
      setPlans(d.plan_breakdown);
    }
    setLoading(false);
  }, [router, supabase.auth]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <DashboardLayout><LoadingSpinner className="py-32" size="lg" /></DashboardLayout>;
  if (!summary) return <DashboardLayout><div className="text-center py-20 text-gray-500">غير مصرح</div></DashboardLayout>;

  const fmt = (n: number) => `$${n.toLocaleString('en', { maximumFractionDigits: 0 })}`;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">لوحة الإيرادات 💰</h1>
        <p className="text-gray-500 mt-1">تحليلات إيرادات المنصة الشاملة</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard value={fmt(summary.total_revenue_usd)}    label="إجمالي الإيرادات"        icon="💰" color="brand" />
        <StatCard value={fmt(summary.subscription_revenue)} label="إيرادات الاشتراكات"       icon="🔄" color="blue" />
        <StatCard value={fmt(summary.payg_revenue)}          label="Pay As You Go"           icon="⚡" color="purple" />
        <StatCard value={fmt(summary.consultation_revenue)}  label="إيرادات الاستشارات"      icon="👥" color="green" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card title="توزيع الاشتراكات">
          <div className="space-y-3">
            {[
              { label: 'ستارتر', key: 'starter',      price: 99,  color: 'bg-blue-500' },
              { label: 'بيزنس',  key: 'business',     price: 299, color: 'bg-brand-500' },
              { label: 'احترافي',key: 'professional', price: 799, color: 'bg-purple-500' },
            ].map(p => {
              const count = (plans as unknown as Record<string,number>)?.[p.key] ?? 0;
              const total = (plans?.starter ?? 0) + (plans?.business ?? 0) + (plans?.professional ?? 0);
              const pct   = total > 0 ? Math.round(count / total * 100) : 0;
              return (
                <div key={p.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{p.label}</span>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${p.color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="pt-3 border-t border-gray-100 text-sm text-gray-500">
              إجمالي الاشتراكات الفعالة: {summary.active_subscriptions}
            </div>
          </div>
        </Card>

        <Card title="مصادر الإيراد">
          {[
            { label: 'اشتراكات',      value: summary.subscription_revenue,  pct: summary.total_revenue_usd > 0 ? summary.subscription_revenue / summary.total_revenue_usd * 100 : 0,  color: 'bg-blue-500' },
            { label: 'Pay As You Go', value: summary.payg_revenue,           pct: summary.total_revenue_usd > 0 ? summary.payg_revenue           / summary.total_revenue_usd * 100 : 0,  color: 'bg-purple-500' },
            { label: 'استشارات',      value: summary.consultation_revenue,   pct: summary.total_revenue_usd > 0 ? summary.consultation_revenue    / summary.total_revenue_usd * 100 : 0,  color: 'bg-green-500' },
            { label: 'متجر رقمي',     value: summary.marketplace_revenue,    pct: summary.total_revenue_usd > 0 ? summary.marketplace_revenue     / summary.total_revenue_usd * 100 : 0,  color: 'bg-orange-500' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3 py-2">
              <div className={`w-3 h-3 rounded-full ${s.color} flex-shrink-0`} />
              <span className="text-sm text-gray-700 flex-1">{s.label}</span>
              <span className="font-semibold text-gray-900">{fmt(s.value)}</span>
              <span className="text-xs text-gray-400 w-10 text-left">{s.pct.toFixed(0)}%</span>
            </div>
          ))}
        </Card>
      </div>

      <Card title="إيرادات هذا الشهر — Pay As You Go">
        <div className="text-3xl font-black text-gray-900">{fmt(summary.this_month_payg)}</div>
        <div className="text-sm text-gray-400 mt-1">مقارنة بالشهر الماضي: جارٍ الحساب...</div>
      </Card>
    </DashboardLayout>
  );
}
