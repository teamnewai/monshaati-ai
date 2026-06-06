'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, StatCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, ENTITY_TYPES, ORG_SIZES } from '@/lib/utils';
import type { DashboardStats, Organization, AIGeneration } from '@/types/database';

type OrgWithMeta = Organization & {
  ai_generations: Pick<AIGeneration, 'id' | 'status' | 'created_at'>[];
  profiles?: { full_name: string | null; email: string };
};

export default function AdminPage() {
  const [stats,     setStats]     = useState<DashboardStats | null>(null);
  const [orgs,      setOrgs]      = useState<OrgWithMeta[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const router   = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return; }
      fetchAll();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAll = async () => {
    const [statsRes, orgsRes] = await Promise.all([
      fetch('/api/admin/stats'),
      fetch('/api/admin/orgs'),
    ]);

    if (statsRes.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }

    const [statsData, orgsData] = await Promise.all([
      statsRes.json() as Promise<DashboardStats>,
      orgsRes.json()  as Promise<{ organizations: OrgWithMeta[] }>,
    ]);

    setStats(statsData);
    setOrgs(orgsData.organizations || []);
    setLoading(false);
  };

  if (loading) {
    return <DashboardLayout><LoadingSpinner className="py-32" size="lg" />      {/* Support Operations */}
      <div className="mt-4 bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-lg">مركز الدعم 🎧</div>
            <div className="text-white/80 text-sm mt-1">التذاكر والمكالمات والوكلاء</div>
          </div>
          <a href="/admin/support" className="bg-white text-teal-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
            إدارة الدعم →
          </a>
        </div>
      </div>

      {/* Consultants Management */}
      <div className="mt-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-lg">إدارة المستشارين 👥</div>
            <div className="text-white/80 text-sm mt-1">مراجعة وقبول المستشارين + تتبع المدفوعات</div>
          </div>
          <a href="/admin/consultants" className="bg-white text-blue-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
            إدارة المستشارين →
          </a>
        </div>
      </div>

      {/* White Label Control Center */}
      <div className="mt-6 bg-gradient-to-r from-purple-500 to-brand-500 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-lg">White Label Control Center 🏢</div>
            <div className="text-white/80 text-sm mt-1">إدارة جميع مستأجري White Label</div>
          </div>
          <a href="/admin/tenants" className="bg-white text-brand-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
            إدارة المستأجرين →
          </a>
        </div>
      </div>
          <div className="mt-4 bg-gradient-to-r from-purple-500 to-brand-500 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-lg">AI Consultant Dashboard 🤖</div>
            <div className="text-white/80 text-sm mt-1">إحصاءات المستشار الذكي</div>
          </div>
          <a href="/admin/ai-consultant" className="bg-white text-purple-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
            عرض الإحصاءات →
          </a>
        </div>
      </div>
    </DashboardLayout>;
  }

  if (forbidden) {
    return (
      <DashboardLayout>
        <div className="text-center py-32">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">غير مصرح</h2>
          <p className="text-gray-500">هذه الصفحة للمشرفين العامين (super_admin) فقط</p>
        </div>
            {/* Support Operations */}
      <div className="mt-4 bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-lg">مركز الدعم 🎧</div>
            <div className="text-white/80 text-sm mt-1">التذاكر والمكالمات والوكلاء</div>
          </div>
          <a href="/admin/support" className="bg-white text-teal-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
            إدارة الدعم →
          </a>
        </div>
      </div>

      {/* Consultants Management */}
      <div className="mt-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-lg">إدارة المستشارين 👥</div>
            <div className="text-white/80 text-sm mt-1">مراجعة وقبول المستشارين + تتبع المدفوعات</div>
          </div>
          <a href="/admin/consultants" className="bg-white text-blue-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
            إدارة المستشارين →
          </a>
        </div>
      </div>

      {/* White Label Control Center */}
      <div className="mt-6 bg-gradient-to-r from-purple-500 to-brand-500 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-lg">White Label Control Center 🏢</div>
            <div className="text-white/80 text-sm mt-1">إدارة جميع مستأجري White Label</div>
          </div>
          <a href="/admin/tenants" className="bg-white text-brand-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
            إدارة المستأجرين →
          </a>
        </div>
      </div>
          <div className="mt-4 bg-gradient-to-r from-purple-500 to-brand-500 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-lg">AI Consultant Dashboard 🤖</div>
            <div className="text-white/80 text-sm mt-1">إحصاءات المستشار الذكي</div>
          </div>
          <a href="/admin/ai-consultant" className="bg-white text-purple-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
            عرض الإحصاءات →
          </a>
        </div>
      </div>
    </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">لوحة تحكم المشرف</h1>
          <p className="text-gray-500 mt-1">إدارة المنصة ومراقبة الاستخدام</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-gray-500">النظام يعمل</span>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <StatCard value={stats.total_orgs.toLocaleString()}        label="إجمالي المنشآت"    icon="🏢" />
          <StatCard value={stats.total_users.toLocaleString()}        label="إجمالي المستخدمين" icon="👥" color="blue" />
          <StatCard value={stats.total_generations.toLocaleString()}  label="إجمالي التوليدات"  icon="🤖" color="purple" />
          <StatCard value={stats.generations_today.toLocaleString()}  label="توليدات اليوم"     icon="📈" color="green" />
        </div>
      )}

      {/* Organizations Table */}
      <Card title="المنشآت المسجلة" subtitle={`${orgs.length} منشأة`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['المنشأة', 'النوع', 'الحجم', 'الدولة', 'الخطة', 'التوليدات', 'تاريخ الإنشاء'].map(h => (
                  <th key={h} className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orgs.map(org => {
                const completed = org.ai_generations?.filter(g => g.status === 'completed').length ?? 0;
                const total     = org.ai_generations?.length ?? 0;
                return (
                  <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{org.name}</div>
                      <div className="text-xs text-gray-400">{org.primary_activity}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{ENTITY_TYPES[org.entity_type]}</td>
                    <td className="py-3 px-4 text-gray-600">{ORG_SIZES[org.employee_count]}</td>
                    <td className="py-3 px-4 text-gray-600">{org.city}، {org.country}</td>
                    <td className="py-3 px-4">
                      <Badge variant={org.subscription_plan === 'free_trial' ? 'warning' : 'success'}>
                        {org.subscription_plan}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-gray-900">{completed}</span>
                      <span className="text-gray-400"> / {total}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(org.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {orgs.length === 0 && (
            <div className="text-center py-12 text-gray-400">لا توجد منشآت بعد</div>
          )}
        </div>
      </Card>
          {/* Support Operations */}
      <div className="mt-4 bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-lg">مركز الدعم 🎧</div>
            <div className="text-white/80 text-sm mt-1">التذاكر والمكالمات والوكلاء</div>
          </div>
          <a href="/admin/support" className="bg-white text-teal-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
            إدارة الدعم →
          </a>
        </div>
      </div>

      {/* Consultants Management */}
      <div className="mt-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-lg">إدارة المستشارين 👥</div>
            <div className="text-white/80 text-sm mt-1">مراجعة وقبول المستشارين + تتبع المدفوعات</div>
          </div>
          <a href="/admin/consultants" className="bg-white text-blue-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
            إدارة المستشارين →
          </a>
        </div>
      </div>

      {/* White Label Control Center */}
      <div className="mt-6 bg-gradient-to-r from-purple-500 to-brand-500 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-lg">White Label Control Center 🏢</div>
            <div className="text-white/80 text-sm mt-1">إدارة جميع مستأجري White Label</div>
          </div>
          <a href="/admin/tenants" className="bg-white text-brand-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
            إدارة المستأجرين →
          </a>
        </div>
      </div>
          <div className="mt-4 bg-gradient-to-r from-purple-500 to-brand-500 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-lg">AI Consultant Dashboard 🤖</div>
            <div className="text-white/80 text-sm mt-1">إحصاءات المستشار الذكي</div>
          </div>
          <a href="/admin/ai-consultant" className="bg-white text-purple-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
            عرض الإحصاءات →
          </a>
        </div>
      </div>
    </DashboardLayout>
  );
}
