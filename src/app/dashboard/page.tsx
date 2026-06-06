'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, StatCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, ENTITY_TYPES, ORG_SIZES } from '@/lib/utils';
import type { Organization, AIGeneration } from '@/types/database';

// Shape returned by the /api/organizations endpoint (org + joined generations)
type OrgWithGens = Organization & {
  ai_generations: Pick<AIGeneration, 'id' | 'status' | 'created_at' | 'completed_at' | 'total_tokens'>[];
};

export default function DashboardPage() {
  const [orgs, setOrgs]         = useState<OrgWithGens[]>([]);
  const [loading, setLoading]   = useState(true);
  const [userName, setUserName] = useState('');
  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return; }
      const name = (user.user_metadata?.full_name as string | undefined) ||
                   user.email?.split('@')[0] || '';
      setUserName(name);
      fetchOrgs();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOrgs = async () => {
    const res = await fetch('/api/organizations');
    if (!res.ok) { setLoading(false); return; }
    const { organizations } = await res.json() as { organizations: OrgWithGens[] };
    setOrgs(organizations || []);
    setLoading(false);
  };

  const getLastGen = (org: OrgWithGens) => {
    if (!org.ai_generations?.length) return null;
    return [...org.ai_generations].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  };

  const statusBadge = (status?: string) => {
    const map: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' }> = {
      completed:  { label: '✅ مكتمل',    variant: 'success' },
      generating: { label: '⚙️ يتولّد',   variant: 'info' },
      pending:    { label: '⏳ معلق',      variant: 'warning' },
      failed:     { label: '❌ فشل',       variant: 'error' },
    };
    const cfg = status ? map[status] : undefined;
    return cfg ? <Badge variant={cfg.variant}>{cfg.label}</Badge> : null;
  };

  const completedCount = orgs.filter(o =>
    o.ai_generations?.some(g => g.status === 'completed')
  ).length;
  const totalGens = orgs.reduce((s, o) => s + (o.ai_generations?.length || 0), 0);

  if (loading) {
    return <DashboardLayout><LoadingSpinner className="py-32" size="lg" /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            مرحباً{userName ? `، ${userName}` : ''} 👋
          </h1>
          <p className="text-gray-500 mt-1">إدارة منشآتك وتوليد الهياكل التنظيمية بالذكاء الاصطناعي</p>
        </div>
        <Link href="/onboarding">
          <Button size="lg">➕ منشأة جديدة</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard value={orgs.length}   label="إجمالي المنشآت"   icon="🏢" />
        <StatCard value={completedCount} label="منشآت مكتملة"    icon="✅" color="green" />
        <StatCard value={totalGens}      label="إجمالي التوليدات" icon="🤖" color="purple" />
      </div>

      {/* Empty state */}
      {orgs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <div className="text-7xl mb-6">🏗️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">ابدأ منشأتك الأولى</h3>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            أدخل بيانات منشأتك وسيقوم الذكاء الاصطناعي خلال دقيقة بإنشاء الهيكل التنظيمي،
            الأوصاف الوظيفية، السياسات، مؤشرات الأداء، وخطة التوظيف.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-8 text-sm">
            {['🏗️ هيكل تنظيمي', '📋 وصف وظيفي', '📜 سياسات', '📊 KPIs', '👥 خطة توظيف'].map(f => (
              <span key={f} className="bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full">{f}</span>
            ))}
          </div>
          <Link href="/onboarding">
            <Button size="lg">🚀 إنشاء منشأتي الأولى</Button>
          </Link>
        </div>
      ) : (
        <Card
          title="منشآتي"
          subtitle={`${orgs.length} منشأة`}
          action={
            <Link href="/onboarding">
              <Button size="sm">➕ إضافة</Button>
            </Link>
          }
        >
          <div className="space-y-3">
            {orgs.map(org => {
              const lastGen      = getLastGen(org);
              const completedGen = org.ai_generations?.find(g => g.status === 'completed');

              return (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-brand-200 hover:bg-brand-50/20 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      {org.name?.[0] ?? '؟'}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 group-hover:text-brand-700 transition-colors">
                        {org.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-400">{ENTITY_TYPES[org.entity_type]}</span>
                        <span className="text-gray-200">|</span>
                        <span className="text-xs text-gray-400">{ORG_SIZES[org.employee_count]}</span>
                        <span className="text-gray-200">|</span>
                        <span className="text-xs text-gray-400">{org.city}، {org.country}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                        {org.primary_activity}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {lastGen && statusBadge(lastGen.status)}
                    <span className="text-xs text-gray-300 hidden md:block">
                      {formatDate(org.created_at)}
                    </span>
                    {completedGen && (
                      <Link href={`/results/${completedGen.id}`}>
                        <Button size="sm" variant="outline">عرض النتائج</Button>
                      </Link>
                    )}
                    {!org.ai_generations?.length && (
                      <Link href={`/onboarding?org_id=${org.id}`}>
                        <Button size="sm">توليد ←</Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </DashboardLayout>
  );
}
