'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Suspense } from 'react';
import type { Subscription, Invoice, SubPlan } from '@/types/database';
import { PLAN_LIMITS } from '@/types/database';
import toast from 'react-hot-toast';

interface SubData {
  subscription: Subscription | null;
  plan:   SubPlan;
  limits: typeof PLAN_LIMITS[SubPlan];
  usage:  { used: number; limit: number };
  trial_ends_at: string | null;
}

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' }> = {
  active:   { label: 'نشط',          variant: 'success' },
  trialing: { label: 'تجريبي',        variant: 'info' },
  past_due: { label: 'متأخر الدفع',   variant: 'warning' },
  canceled: { label: 'ملغى',          variant: 'error' },
  unpaid:   { label: 'غير مدفوع',     variant: 'error' },
};

function BillingContent() {
  const [subData,  setSubData]  = useState<SubData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [orgId,    setOrgId]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [portal,   setPortal]   = useState(false);
  const router    = useRouter();
  const params    = useSearchParams();
  const supabase  = createClient();

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }

    const orgsRes = await fetch('/api/organizations');
    if (!orgsRes.ok) { setLoading(false); return; }
    const { organizations } = await orgsRes.json();
    const org = organizations?.[0];
    if (!org) { setLoading(false); return; }
    setOrgId(org.id);

    const [subRes, invRes] = await Promise.all([
      fetch(`/api/stripe/subscription?org_id=${org.id}`),
      fetch(`/api/stripe/invoices?org_id=${org.id}`),
    ]);

    if (subRes.ok) setSubData(await subRes.json());
    if (invRes.ok) {
      const d = await invRes.json();
      setInvoices(d.invoices ?? []);
    }
    setLoading(false);
  }, [router, supabase.auth]);

  useEffect(() => {
    loadData();
    if (params.get('success') === 'true') {
      toast.success('🎉 تم الاشتراك بنجاح! مرحباً بك في منشأتي AI');
    }
    if (params.get('canceled') === 'true') {
      toast.error('تم إلغاء عملية الدفع');
    }
  }, [loadData, params]);

  const openPortal = async () => {
    if (!orgId) return;
    setPortal(true);
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      });
      const { url, error } = await res.json();
      if (error) { toast.error(error); return; }
      window.location.href = url;
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setPortal(false);
    }
  };

  if (loading) return <DashboardLayout><LoadingSpinner className="py-32" size="lg" /></DashboardLayout>;

  const plan   = subData?.plan ?? 'free_trial';
  const limits = subData?.limits ?? PLAN_LIMITS.free_trial;
  const usage  = subData?.usage ?? { used: 0, limit: 3 };
  const pct    = Math.min(100, Math.round((usage.used / usage.limit) * 100));
  const sub    = subData?.subscription;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-0 sm:px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">الاشتراك والفوترة</h1>
          <p className="text-gray-500 mt-1">إدارة اشتراكك وعرض الفواتير</p>
        </div>

        {/* Current Plan */}
        <Card title="الباقة الحالية" className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold text-gray-900">{limits.label}</h2>
                {sub?.status && STATUS_BADGE[sub.status] && (
                  <Badge variant={STATUS_BADGE[sub.status].variant}>
                    {STATUS_BADGE[sub.status].label}
                  </Badge>
                )}
                {!sub && <Badge variant="info">تجريبي مجاني</Badge>}
              </div>
              <div className="text-sm text-gray-500 space-y-1">
                {sub?.current_period_end && (
                  <div>📅 تجديد تلقائي: {new Date(sub.current_period_end).toLocaleDateString('ar-SA')}</div>
                )}
                {!sub && subData?.trial_ends_at && (
                  <div>⏱ التجربة تنتهي: {new Date(subData.trial_ends_at).toLocaleDateString('ar-SA')}</div>
                )}
                {sub?.cancel_at_period_end && (
                  <div className="text-amber-600">⚠️ الاشتراك سينتهي عند نهاية الدورة الحالية</div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {sub?.stripe_customer_id ? (
                <Button variant="outline" size="sm" onClick={openPortal} loading={portal}>
                  إدارة الاشتراك ↗
                </Button>
              ) : (
                <Button size="sm" onClick={() => router.push('/pricing')}>
                  ترقية الباقة ⬆
                </Button>
              )}
            </div>
          </div>

          {/* Usage bar */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-700">التوليدات هذا الشهر</span>
              <span className="text-sm text-gray-500">
                {usage.used} / {usage.limit === 999 ? '∞' : usage.limit}
              </span>
            </div>
            <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-brand-500'
                }`}
                style={{ width: `${usage.limit === 999 ? 10 : pct}%` }}
              />
            </div>
            {pct >= 90 && usage.limit !== 999 && (
              <p className="text-xs text-red-600 mt-1.5">
                ⚠️ اقتربت من الحد. <button className="underline" onClick={() => router.push('/pricing')}>ترقية الباقة</button>
              </p>
            )}
          </div>

          {/* Plan features */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            {[
              ['🤖', `${usage.limit === 999 ? '∞' : usage.limit}`, 'توليد/شهر'],
              ['🏢', `${limits.orgs === 99 ? '∞' : limits.orgs}`, 'منشأة'],
              ['👥', `${limits.members === 99 ? '∞' : limits.members}`, 'مستخدم'],
            ].map(([icon, val, label]) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <div className="text-2xl">{icon}</div>
                <div className="text-lg font-bold text-gray-900">{val}</div>
                <div className="text-xs text-gray-400">{label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Upgrade CTA */}
        {plan === 'free_trial' && (
          <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl p-6 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold mb-1">ترقية للحصول على المزيد</div>
                <div className="opacity-90 text-sm">احصل على 15 توليداً شهرياً مقابل 99 ريال فقط</div>
              </div>
              <Button
                variant="secondary"
                onClick={() => router.push('/pricing')}
                className="bg-white text-brand-700 hover:bg-gray-50 flex-shrink-0"
              >
                اشترك الآن
              </Button>
            </div>
          </div>
        )}

        {/* Invoices */}
        <Card title="الفواتير" subtitle={`${invoices.length} فاتورة`}>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">🧾</div>
              <p>لا توجد فواتير بعد</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-4">
                  <div>
                    <div className="font-medium text-gray-900">
                      فاتورة {inv.stripe_invoice_id?.slice(-8) ?? inv.id.slice(-8)}
                    </div>
                    <div className="text-sm text-gray-400">
                      {inv.period_start ? new Date(inv.period_start).toLocaleDateString('ar-SA') : '—'}
                      {' – '}
                      {inv.period_end   ? new Date(inv.period_end).toLocaleDateString('ar-SA')   : '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {(inv.amount_paid / 100).toLocaleString()} {inv.currency.toUpperCase()}
                      </div>
                      <Badge variant={inv.status === 'paid' ? 'success' : 'warning'}>
                        {inv.status === 'paid' ? 'مدفوعة' : inv.status}
                      </Badge>
                    </div>
                    {inv.invoice_pdf && (
                      <a
                        href={inv.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                      >
                        PDF ↗
                      </a>
                    )}
                    {inv.hosted_invoice_url && (
                      <a
                        href={inv.hosted_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-gray-700 text-sm"
                      >
                        عرض ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<DashboardLayout><LoadingSpinner className="py-32" size="lg" /></DashboardLayout>}>
      <BillingContent />
    </Suspense>
  );
}
