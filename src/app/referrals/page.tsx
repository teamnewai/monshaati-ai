'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

interface ReferralStats {
  referral_code: string | null;
  total:     number;
  converted: number;
  rewarded:  number;
  referrals: Record<string, unknown>[];
}

export default function ReferralsPage() {
  const [stats,   setStats]   = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const router  = useRouter();
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }
    const res = await fetch('/api/referrals');
    if (res.ok) setStats(await res.json());
    setLoading(false);
  }, [router, supabase.auth]);

  useEffect(() => { load(); }, [load]);

  const copyCode = () => {
    if (!stats?.referral_code) return;
    const url = `${window.location.origin}/auth/signup?ref=${stats.referral_code}`;
    navigator.clipboard.writeText(url);
    toast.success('تم نسخ رابط الإحالة!');
  };

  if (loading) return <DashboardLayout><LoadingSpinner className="py-32" size="lg" /></DashboardLayout>;

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-0 sm:px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">نظام الإحالات</h1>
          <p className="text-gray-500 mt-1">ادعُ أصدقاءك واحصل على مكافآت</p>
        </div>

        {/* Referral code */}
        <Card title="رابط الإحالة الخاص بك" className="mb-6">
          <div className="text-center py-4">
            <div className="text-4xl mb-3">🎁</div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <div className="text-xs text-gray-400 mb-1">رمز الإحالة</div>
              <div className="text-xl font-mono font-bold text-brand-600">{stats?.referral_code ?? '—'}</div>
            </div>
            <div className="text-sm text-gray-500 mb-4 break-all bg-gray-50 p-3 rounded-lg">
              {stats?.referral_code ? `${appUrl}/auth/signup?ref=${stats.referral_code}` : '—'}
            </div>
            <Button onClick={copyCode} disabled={!stats?.referral_code}>
              📋 نسخ رابط الإحالة
            </Button>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-2">كيف يعمل النظام؟</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div>1. شارك رابط الإحالة مع أصدقائك</div>
              <div>2. عندما يشتركون في منشأتي AI</div>
              <div>3. تحصل على شهر مجاني بعد اشتراكهم</div>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'إجمالي الإحالات', value: stats?.total ?? 0, icon: '👥' },
            { label: 'تم تحويله',       value: stats?.converted ?? 0, icon: '✅' },
            { label: 'مكافآت حصلت',    value: stats?.rewarded ?? 0, icon: '🎁' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Referrals list */}
        <Card title="قائمة الإحالات">
          {!stats?.referrals.length ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">📭</div>
              <p>لا توجد إحالات بعد. شارك رابطك!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {stats.referrals.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">إحالة #{i + 1}</div>
                    <div className="text-xs text-gray-400">{r.created_at ? new Date(r.created_at as string).toLocaleDateString('ar-SA') : ''}</div>
                  </div>
                  <Badge variant={r.status === 'converted' ? 'success' : r.status === 'rewarded' ? 'info' : 'default'}>
                    {r.status === 'converted' ? 'تم التحويل' : r.status === 'rewarded' ? 'تمت المكافأة' : 'قيد الانتظار'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
