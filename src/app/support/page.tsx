'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import toast from 'react-hot-toast';
import type { SupportTicket } from '@/types/database';

const CHANNELS = [
  { id: 'web',      label: '💬 دردشة', desc: 'ردود خلال دقائق' },
  { id: 'callback', label: '📞 مكالمة هاتفية', desc: 'سيتصل بك مختص' },
  { id: 'email',    label: '📧 إيميل', desc: 'ردود خلال 24 ساعة' },
];

const CATEGORIES = [
  'استفسار عام', 'مشكلة تقنية', 'فوترة واشتراك',
  'ميزة جديدة', 'تقرير خطأ', 'طلب بيانات', 'أخرى',
];

const STATUS_CONF: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  open:        { label: 'مفتوحة',     variant: 'warning' },
  in_progress: { label: 'جارية',      variant: 'info' },
  waiting:     { label: 'انتظار',     variant: 'default' },
  resolved:    { label: 'محلولة',     variant: 'success' },
  closed:      { label: 'مغلقة',      variant: 'default' },
};

type SupportView = 'home' | 'new-ticket' | 'callback' | 'my-tickets';

export default function SupportPage() {
  const [view,        setView]        = useState<SupportView>('home');
  const [tickets,     setTickets]     = useState<SupportTicket[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [sending,     setSending]     = useState(false);
  const [agentsOnline,setAgentsOnline]= useState(0);
  const [form, setForm] = useState({
    subject: '', description: '', category: '', priority: 'medium', channel: 'web',
  });
  const [callForm, setCallForm] = useState({ phone: '', scheduled_at: '', notes: '' });
  const router = useRouter();
  const supabase = createClient();

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }
    setLoading(true);

    const [ticketsRes, agentsRes] = await Promise.all([
      fetch('/api/support/tickets'),
      fetch('/api/support/agents'),
    ]);
    if (ticketsRes.ok) {
      const d = await ticketsRes.json();
      setTickets(d.tickets ?? []);
    }
    if (agentsRes.ok) {
      const d = await agentsRes.json();
      setAgentsOnline(d.available ?? 0);
    }
    setLoading(false);
  }, [router, supabase.auth]);

  useEffect(() => { loadData(); }, [loadData]);

  const submitTicket = async () => {
    if (!form.subject.trim() || !form.description.trim()) {
      toast.error('يرجى ملء العنوان والوصف');
      return;
    }
    setSending(true);
    const res = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form }),
    });
    const d = await res.json();
    if (d.ticket) {
      toast.success(`تم إنشاء التذكرة ${(d.ticket as Record<string,unknown>).ticket_number as string}`);
      setView('my-tickets');
      await loadData();
    } else { toast.error(d.error ?? 'خطأ'); }
    setSending(false);
  };

  const requestCallback = async () => {
    if (!callForm.phone.trim()) { toast.error('رقم الهاتف مطلوب'); return; }
    setSending(true);
    const res = await fetch('/api/support/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caller_phone: callForm.phone,
        direction: 'callback',
        scheduled_at: callForm.scheduled_at || null,
      }),
    });
    const d = await res.json();
    if (d.call) {
      toast.success(d.message ?? 'تم طلب المكالمة!');
      setView('home');
    } else { toast.error(d.error ?? 'خطأ'); }
    setSending(false);
  };

  const openTickets = tickets.filter(t => !['resolved','closed'].includes(t.status)).length;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">مركز الدعم</h1>
            <p className="text-gray-500 mt-0.5 text-sm">
              {agentsOnline > 0
                ? <span className="text-green-600">● {agentsOnline} وكيل متاح الآن</span>
                : <span className="text-gray-400">● فريق الدعم غير متاح حالياً</span>
              }
            </p>
          </div>
          {view !== 'home' && (
            <button onClick={() => setView('home')} className="text-sm text-brand-600 hover:underline">
              ← الرجوع
            </button>
          )}
        </div>

        {/* HOME VIEW */}
        {view === 'home' && (
          <div className="space-y-6">
            {/* Quick stats */}
            {tickets.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'تذاكر مفتوحة', value: openTickets, color: 'text-amber-600' },
                  { label: 'محلولة',        value: resolvedTickets, color: 'text-green-600' },
                  { label: 'الإجمالي',      value: tickets.length,  color: 'text-brand-600' },
                ].map(s => (
                  <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
                    <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Support channels */}
            <div>
              <h2 className="font-bold text-gray-700 mb-3">كيف تريد التواصل معنا؟</h2>
              <div className="grid sm:grid-cols-3 gap-3">
                {CHANNELS.map(ch => (
                  <button key={ch.id}
                    onClick={() => setView(ch.id === 'callback' ? 'callback' : 'new-ticket')}
                    className="bg-white border-2 border-gray-200 hover:border-brand-400 rounded-2xl p-5 text-right transition-all hover:bg-brand-50 group">
                    <div className="text-2xl mb-2">{ch.label.split(' ')[0]}</div>
                    <div className="font-bold text-gray-900 text-sm">{ch.label.slice(2)}</div>
                    <div className="text-xs text-gray-400 mt-1">{ch.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* My tickets */}
            {tickets.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-gray-700">تذاكري</h2>
                  <button onClick={() => setView('my-tickets')} className="text-xs text-brand-600 hover:underline">
                    عرض الكل →
                  </button>
                </div>
                <div className="space-y-2">
                  {tickets.slice(0, 3).map(t => {
                    const conf = STATUS_CONF[t.status] ?? STATUS_CONF.open;
                    return (
                      <div key={t.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{t.subject}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{t.ticket_number}</div>
                        </div>
                        <Badge variant={conf.variant}>{conf.label}</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {tickets.length === 0 && (
              <EmptyState icon="🎧" title="لا توجد تذاكر دعم" description="أنت بخير! إذا احتجت مساعدة، نحن هنا." />
            )}
          </div>
        )}

        {/* NEW TICKET VIEW */}
        {view === 'new-ticket' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 space-y-5">
            <h2 className="text-lg font-bold text-gray-900">تذكرة دعم جديدة</h2>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">
                العنوان <span className="text-red-500">*</span>
              </label>
              <input value={form.subject}
                onChange={(e: { target: { value: string } }) => setForm(p => ({ ...p, subject: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
                placeholder="وصف مختصر للمشكلة" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">الفئة</label>
                <select value={form.category}
                  onChange={(e: { target: { value: string } }) => setForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none bg-white">
                  <option value="">اختر الفئة</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">الأولوية</label>
                <select value={form.priority}
                  onChange={(e: { target: { value: string } }) => setForm(p => ({ ...p, priority: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none bg-white">
                  <option value="low">منخفضة</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية</option>
                  <option value="urgent">عاجلة</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">
                التفاصيل <span className="text-red-500">*</span>
              </label>
              <textarea value={form.description} rows={5}
                onChange={(e: { target: { value: string } }) => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-brand-400 focus:outline-none"
                placeholder="اشرح المشكلة بالتفصيل..." />
            </div>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={submitTicket} loading={sending}>
                إرسال التذكرة
              </Button>
              <Button variant="outline" onClick={() => setView('home')}>إلغاء</Button>
            </div>
          </div>
        )}

        {/* CALLBACK VIEW */}
        {view === 'callback' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 space-y-5">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">📞</div>
              <h2 className="text-lg font-bold text-gray-900">طلب مكالمة</h2>
              <p className="text-sm text-gray-500">
                {agentsOnline > 0
                  ? `${agentsOnline} وكيل متاح — الانتظار المتوقع < 10 دقائق`
                  : 'سيتم التواصل معك خلال ساعات العمل'}
              </p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">
                رقم هاتفك <span className="text-red-500">*</span>
              </label>
              <input value={callForm.phone} type="tel"
                onChange={(e: { target: { value: string } }) => setCallForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
                placeholder="+966 5x xxx xxxx" dir="ltr" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">
                جدول لوقت محدد (اختياري)
              </label>
              <input type="datetime-local" value={callForm.scheduled_at}
                onChange={(e: { target: { value: string } }) => setCallForm(p => ({ ...p, scheduled_at: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none" />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              ⏰ ساعات الدعم الهاتفي: الأحد – الخميس، 9 ص – 6 م (بتوقيت الرياض)
            </div>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={requestCallback} loading={sending}>
                {callForm.scheduled_at ? 'جدولة المكالمة' : 'طلب مكالمة الآن'}
              </Button>
              <Button variant="outline" onClick={() => setView('home')}>إلغاء</Button>
            </div>
          </div>
        )}

        {/* MY TICKETS VIEW */}
        {view === 'my-tickets' && (
          <div>
            <div className="space-y-3">
              {loading ? <LoadingSpinner className="py-12" /> :
               tickets.length === 0 ? (
                <EmptyState icon="🎫" title="لا توجد تذاكر" description="جميع تذاكرك ستظهر هنا" />
              ) : tickets.map(t => {
                const conf = STATUS_CONF[t.status] ?? STATUS_CONF.open;
                return (
                  <div key={t.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-brand-300 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{t.subject}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{t.ticket_number} · {new Date(t.created_at).toLocaleDateString('ar-SA')}</div>
                      </div>
                      <Badge variant={conf.variant}>{conf.label}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{t.description}</p>
                    {t.satisfaction_score === null && t.status === 'resolved' && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500 mb-2">قيّم تجربتك:</div>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(n => (
                            <button key={n} onClick={async () => {
                              await fetch('/api/support/tickets', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ ticket_id: t.id, satisfaction_score: n }),
                              });
                              toast.success('شكراً على تقييمك!');
                              await loadData();
                            }}
                              className="text-xl hover:scale-110 transition-transform">⭐</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
