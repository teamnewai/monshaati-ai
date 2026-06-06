'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, StatCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const TOPIC_LABELS: Record<string, string> = {
  administrative: '🏛️ إدارية', operational: '⚙️ تشغيلية', hr: '👥 موارد بشرية',
  financial: '💰 مالية', growth: '📈 نمو', funding: '🏦 تمويل',
  restructuring: '🔧 هيكلة', strategic: '🎯 استراتيجية',
};

const STATUS_CONF: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  active:    { label: 'نشطة',   variant: 'success' },
  closed:    { label: 'مغلقة',  variant: 'default' },
  escalated: { label: 'تصعيد', variant: 'warning' },
};

export default function AIConsultantAdminPage() {
  const [stats,   setStats]   = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const router   = useRouter();
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }

    const res = await fetch('/api/ai-consultant/stats');
    if (res.status === 403) { router.push('/dashboard'); return; }
    if (res.ok) setStats(await res.json());
    setLoading(false);
  }, [router, supabase.auth]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <DashboardLayout><LoadingSpinner className="py-32" size="lg" /></DashboardLayout>;
  if (!stats)  return <DashboardLayout><div className="text-center py-20 text-gray-500">غير مصرح</div></DashboardLayout>;

  const ov      = (stats.overview ?? {}) as Record<string, unknown>;
  const topics  = (stats.topics_breakdown ?? {}) as Record<string, number>;
  const recent  = (stats.recent_conversations ?? []) as Record<string, unknown>[];
  const totalTp = Object.values(topics).reduce((s, v) => s + v, 0) || 1;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">لوحة تحكم AI Consultant</h1>
        <p className="text-gray-500 mt-1">إحصاءات استخدام المستشار الذكي</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard value={String(ov.total_conversations ?? 0)}   label="إجمالي المحادثات"   icon="💬" color="brand" />
        <StatCard value={String(ov.total_messages ?? 0)}         label="إجمالي الرسائل"      icon="📨" color="blue" />
        <StatCard value={String(ov.total_recommendations ?? 0)}  label="التوصيات المقدمة"    icon="💡" color="purple" />
        <StatCard value={String(ov.total_escalations ?? 0)}      label="التصعيد لمستشارين"  icon="👨‍💼" color="orange" />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <StatCard value={ov.avg_confidence != null ? `${ov.avg_confidence}%` : '—'} label="متوسط الثقة"      icon="🎯" color="green" />
        <StatCard value={ov.avg_satisfaction != null ? `${Number(ov.avg_satisfaction).toFixed(1)}/5` : '—'} label="متوسط الرضا" icon="⭐" color="brand" />
        <StatCard value={ov.escalation_rate != null ? `${ov.escalation_rate}%` : '0%'} label="معدل التصعيد"   icon="📊" color="blue" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Topics breakdown */}
        <Card title="توزيع الموضوعات">
          {Object.keys(topics).length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">لا توجد بيانات بعد</div>
          ) : Object.entries(topics).sort((a, b) => b[1] - a[1]).map(([topic, count]) => {
            const pct = Math.round(count / totalTp * 100);
            return (
              <div key={topic} className="py-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{TOPIC_LABELS[topic] ?? topic}</span>
                  <span className="text-gray-500">{count} ({pct}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </Card>

        {/* Recent conversations */}
        <Card title="آخر المحادثات">
          {recent.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">لا توجد محادثات بعد</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recent.map(conv => {
                const statusConf = STATUS_CONF[conv.status as string] ?? STATUS_CONF.active;
                return (
                  <div key={conv.id as string} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {TOPIC_LABELS[conv.topic as string] ?? '🤖 عامة'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {conv.messages_count as number ?? 0} رسائل
                        {conv.satisfaction_score != null && ` | ⭐ ${conv.satisfaction_score}/5`}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={statusConf.variant}>{statusConf.label}</Badge>
                      <span className="text-xs text-gray-400">
                        {new Date(conv.created_at as string).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
