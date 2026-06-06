'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, StatCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

const STATUS_CONF: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  open:        { label: 'مفتوحة',     variant: 'warning' },
  in_progress: { label: 'جارية',      variant: 'info' },
  waiting:     { label: 'انتظار',     variant: 'default' },
  resolved:    { label: 'محلولة',     variant: 'success' },
  closed:      { label: 'مغلقة',      variant: 'default' },
};

const CALL_STATUS_CONF: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  requested:   { label: 'مطلوب',      variant: 'warning' },
  queued:      { label: 'قيد الانتظار',variant: 'info' },
  in_progress: { label: 'جارية',      variant: 'info' },
  completed:   { label: 'منتهية',     variant: 'success' },
  missed:      { label: 'فائتة',      variant: 'error' },
  failed:      { label: 'فشلت',       variant: 'error' },
};

export default function AdminSupportPage() {
  const [tickets,   setTickets]   = useState<Record<string,unknown>[]>([]);
  const [calls,     setCalls]     = useState<Record<string,unknown>[]>([]);
  const [agents,    setAgents]    = useState<Record<string,unknown>[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<'tickets' | 'calls' | 'agents'>('tickets');
  const [filterStatus, setFilterStatus] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }
    setLoading(true);

    const [tRes, cRes, aRes] = await Promise.all([
      fetch('/api/support/tickets'),
      fetch('/api/support/calls'),
      fetch('/api/support/agents'),
    ]);
    if (tRes.ok) { const d = await tRes.json(); setTickets(d.tickets ?? []); }
    if (cRes.ok) { const d = await cRes.json(); setCalls(d.calls ?? []); }
    if (aRes.ok) { const d = await aRes.json(); setAgents(d.agents ?? []); }
    setLoading(false);
  }, [router, supabase.auth]);

  useEffect(() => { load(); }, [load]);

  const initiateCall = async (callId: string, phone: string) => {
    const provider = 'twilio'; // or read from env
    const res = await fetch(`/api/support/voice/${provider}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ call_id: callId, to_phone: phone }),
    });
    const d = await res.json();
    if (d.call_sid || d.uuid) toast.success('تم بدء المكالمة');
    else toast.error(d.error ?? 'خطأ في بدء المكالمة');
    await load();
  };

  const openTickets    = tickets.filter(t => t.status === 'open').length;
  const pendingCalls   = calls.filter(c => c.status === 'requested').length;
  const availableAgents = agents.filter(a => a.status === 'available').length;
  const filtered = filterStatus
    ? tickets.filter(t => t.status === filterStatus)
    : tickets;

  if (loading) return <DashboardLayout><LoadingSpinner className="py-32" size="lg" /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">لوحة تحكم الدعم</h1>
        <p className="text-gray-500 mt-1">إدارة التذاكر والمكالمات والوكلاء</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard value={String(openTickets)}       label="تذاكر مفتوحة"    icon="🎫" color="orange" />
        <StatCard value={String(pendingCalls)}      label="مكالمات معلقة"   icon="📞" color="brand" />
        <StatCard value={String(availableAgents)}   label="وكلاء متاحون"   icon="👤" color="green" />
        <StatCard value={String(tickets.length)}    label="إجمالي التذاكر" icon="📊" color="blue" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        {(['tickets','calls','agents'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            {tab === 'tickets' ? `🎫 التذاكر (${tickets.length})` :
             tab === 'calls'   ? `📞 المكالمات (${calls.length})` :
                                 `👤 الوكلاء (${agents.length})`}
          </button>
        ))}
      </div>

      {/* TICKETS */}
      {activeTab === 'tickets' && (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {['','open','in_progress','waiting','resolved','closed'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${filterStatus === s ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-gray-300 text-gray-600'}`}>
                {s === '' ? 'الكل' : STATUS_CONF[s]?.label ?? s}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">لا توجد تذاكر</div>
            ) : filtered.map(t => {
              const conf = STATUS_CONF[t.status as string] ?? STATUS_CONF.open;
              return (
                <div key={t.id as string} className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 text-sm truncate">{t.subject as string}</span>
                      <Badge variant={conf.variant}>{conf.label}</Badge>
                    </div>
                    <div className="text-xs text-gray-400">{t.ticket_number as string} · {new Date(t.created_at as string).toLocaleDateString('ar-SA')}</div>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{t.description as string}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CALLS */}
      {activeTab === 'calls' && (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {calls.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">لا توجد مكالمات</div>
          ) : calls.map(c => {
            const conf = CALL_STATUS_CONF[c.status as string] ?? CALL_STATUS_CONF.requested;
            return (
              <div key={c.id as string} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={conf.variant}>{conf.label}</Badge>
                    <span className="text-xs text-gray-500">{(c.direction as string) === 'callback' ? 'طلب رد' : 'واردة'}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {c.caller_phone as string ?? 'لا يوجد هاتف'} ·
                    {c.duration_secs ? ` ${c.duration_secs}ث ·` : ''} {new Date(c.created_at as string).toLocaleDateString('ar-SA')}
                  </div>
                  {c.notes && <div className="text-xs text-gray-600 mt-1">{c.notes as string}</div>}
                </div>
                {c.status === 'requested' && c.caller_phone && (
                  <Button size="sm" onClick={() => initiateCall(c.id as string, c.caller_phone as string)}>
                    📞 اتصل
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* AGENTS */}
      {activeTab === 'agents' && (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {agents.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">لا يوجد وكلاء</div>
          ) : agents.map(a => (
            <div key={a.id as string} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900 text-sm">{a.name_ar as string}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  ⭐ {Number(a.avg_rating ?? 0).toFixed(1)} · {a.specializations ? (a.specializations as string[]).join('، ') : '—'}
                </div>
              </div>
              <Badge variant={a.status === 'available' ? 'success' : a.status === 'busy' ? 'warning' : 'default'}>
                {a.status === 'available' ? 'متاح' : a.status === 'busy' ? 'مشغول' : 'غير متاح'}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
