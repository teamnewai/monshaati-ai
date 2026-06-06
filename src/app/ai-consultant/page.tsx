'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import DisclaimerModal from '@/components/ui/DisclaimerModal';
import ConfidenceBar from '@/components/ui/ConfidenceBar';
import type { ConsultantConversation } from '@/types/database';
import toast from 'react-hot-toast';

const DISCLAIMER_TEXT = 'تم إنشاء هذه التوصيات والتحليلات بواسطة الذكاء الاصطناعي لأغراض استرشادية فقط، ولا تعتبر استشارة قانونية أو مالية أو استثمارية أو مهنية ملزمة. يتحمل المستخدم مسؤولية التحقق من المعلومات واتخاذ القرار المناسب.';

const TOPIC_LABELS: Record<string, { label: string; icon: string; desc: string }> = {
  administrative: { label: 'إدارية',    icon: '🏛️', desc: 'الحوكمة والهيكل والقرارات' },
  operational:    { label: 'تشغيلية',   icon: '⚙️', desc: 'العمليات والإجراءات والكفاءة' },
  hr:             { label: 'موارد بشرية',icon: '👥', desc: 'التوظيف والأداء والرواتب' },
  financial:      { label: 'مالية',     icon: '💰', desc: 'التدفق النقدي والربحية' },
  growth:         { label: 'نمو',        icon: '📈', desc: 'التوسع والأسواق الجديدة' },
  funding:        { label: 'تمويل',     icon: '🏦', desc: 'التمويل والاستثمار والمنح' },
  restructuring:  { label: 'هيكلة',     icon: '🔧', desc: 'إعادة الهيكلة التنظيمية' },
  strategic:      { label: 'استراتيجية',icon: '🎯', desc: 'الرؤية والتخطيط والأهداف' },
};

const DATA_SOURCE_LABELS: Record<string, string> = {
  org_chart:    '🏗️ الهيكل التنظيمي',
  jds:          '💼 الأوصاف الوظيفية',
  policies:     '📜 السياسات',
  kpis:         '📊 مؤشرات الأداء',
  hiring:       '👤 خطة التوظيف',
  financials:   '💰 البيانات المالية',
  costModel:    '📊 التكاليف',
  lossAnalysis: '⚠️ تحليل الخسائر',
  funding:      '🏦 التمويل',
};

interface ChatMessage {
  id:        string;
  role:      'user' | 'assistant';
  content:   string;
  topic?:    string;
  confidence_score?:    number;
  risk_level?:          string;
  impact_level?:        string;
  recommendations?:     Record<string, unknown>[];
  data_sources?:        string[];
  escalation_suggested?: boolean;
  escalation_reason?:   string | null;
  suggested_consultants?: Record<string, unknown>[];
  requires_disclaimer?:  boolean;
  created_at: string;
}

export default function AIConsultantPage() {
  const [orgId,          setOrgId]          = useState<string | null>(null);
  const [conversations,  setConversations]  = useState<ConsultantConversation[]>([]);
  const [activeConvId,   setActiveConvId]   = useState<string | null>(null);
  const [messages,       setMessages]       = useState<ChatMessage[]>([]);
  const [input,          setInput]          = useState('');
  const [sending,        setSending]        = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [globalDiscAccepted, setGlobalDiscAccepted] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  const [selectedTopic,  setSelectedTopic]  = useState('');
  const [showTopics,     setShowTopics]     = useState(false);
  const [orgName,        setOrgName]        = useState('');
  const [hasOrgData,     setHasOrgData]     = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router    = useRouter();
  const supabase  = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }

    const orgsRes = await fetch('/api/organizations');
    if (!orgsRes.ok) { setLoading(false); return; }
    const { organizations } = await orgsRes.json();
    const org = organizations?.[0];
    if (!org) { router.push('/onboarding'); return; }

    setOrgId(org.id);
    setOrgName(org.name_ar ?? org.name ?? '');
    setHasOrgData(org.ai_generations?.some((g: Record<string, unknown>) => g.status === 'completed') ?? false);

    const convRes = await fetch(`/api/ai-consultant/conversations?org_id=${org.id}`);
    if (convRes.ok) {
      const { conversations: convs } = await convRes.json();
      setConversations(convs ?? []);
    }
    setLoading(false);
  }, [router, supabase.auth]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const startNewConversation = async (topic?: string) => {
    if (!orgId) return;
    if (!globalDiscAccepted) {
      setShowDisclaimer(true);
      setPendingMessage(input);
      return;
    }

    const res = await fetch('/api/ai-consultant/conversations', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, topic, disclaimer_accepted: true }),
    });
    const d = await res.json();
    if (d.conversation) {
      setActiveConvId(d.conversation.id);
      setMessages([]);
      await load();
      return d.conversation.id;
    }
    return null;
  };

  const acceptDisclaimer = async () => {
    setShowDisclaimer(false);
    setGlobalDiscAccepted(true);
    const convId = await startNewConversation(selectedTopic || undefined);
    if (convId && pendingMessage) {
      await sendMessage(pendingMessage, convId);
      setPendingMessage('');
    }
  };

  const sendMessage = async (text: string, convId?: string) => {
    const cid = convId ?? activeConvId;
    if (!cid || !orgId || !text.trim()) return;
    setSending(true);

    const userMsg: ChatMessage = {
      id: Date.now().toString(), role: 'user', content: text, created_at: new Date().toISOString(),
    };
    setMessages(p => [...p, userMsg]);
    setInput('');

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai-consultant/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: cid, org_id: orgId, message: text, history }),
      });
      const d = await res.json();

      if (d.error === 'disclaimer_required') {
        setShowDisclaimer(true);
        setPendingMessage(text);
        setMessages(p => p.filter(m => m.id !== userMsg.id));
        setSending(false);
        return;
      }

      if (!d.response) { toast.error(d.error ?? 'خطأ في الاتصال'); setSending(false); return; }

      const r = d.response;
      const aiMsg: ChatMessage = {
        id:                   d.message?.id ?? Date.now().toString() + 'ai',
        role:                 'assistant',
        content:              r.content,
        topic:                r.topic,
        confidence_score:     r.confidence_score,
        risk_level:           r.risk_level,
        impact_level:         r.impact_level,
        recommendations:      r.recommendations,
        data_sources:         r.data_sources,
        escalation_suggested: r.escalation_suggested,
        suggested_consultants: r.suggested_consultants,
        created_at:           new Date().toISOString(),
      };
      setMessages(p => [...p, aiMsg]);
    } catch { toast.error('حدث خطأ. حاول مرة أخرى.'); } finally { setSending(false); }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    if (!activeConvId) {
      if (!globalDiscAccepted) { setShowDisclaimer(true); setPendingMessage(input); return; }
      const cid = await startNewConversation(selectedTopic || undefined);
      if (cid) await sendMessage(input, cid);
    } else {
      await sendMessage(input);
    }
  };

  const SUGGESTED_QUESTIONS: Record<string, string[]> = {
    '': ['كيف يمكنني تحسين الهيكل التنظيمي؟', 'ما هي نقاط القوة في منشأتي؟', 'كيف أرفع كفاءة فريقي؟', 'ما البرامج التمويلية المناسبة لي؟'],
    financial:  ['حلل الوضع المالي الحالي', 'كيف أحسن التدفق النقدي؟', 'ما هو هامش الربح المتوقع؟'],
    hr:         ['كيف أحسن منظومة الأداء؟', 'ما الأدوار الناقصة في منشأتي؟', 'كيف أقلل معدل دوران الموظفين؟'],
    growth:     ['كيف أوسع نطاق عملي؟', 'ما الأسواق الواعدة لنشاطي؟', 'كيف أبني قاعدة عملاء أكبر؟'],
    funding:    ['ما البرامج التمويلية المناسبة؟', 'كيف أحضّر للحصول على قرض؟', 'ما متطلبات مسرع Flat6Labs؟'],
  };

  if (loading) return <DashboardLayout><LoadingSpinner className="py-32" size="lg" /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-120px)] gap-3" dir="rtl">

        {/* Sidebar */}
        <div className="hidden md:flex w-72 flex-shrink-0 flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center text-white font-black">🤖</div>
              <div>
                <div className="font-bold text-gray-900 text-sm">مستشار منشأتي</div>
                <div className="text-xs text-green-500 font-medium">● متصل الآن</div>
              </div>
            </div>
            <Button size="sm" className="w-full" onClick={() => { setActiveConvId(null); setMessages([]); setShowTopics(true); }}>
              + محادثة جديدة
            </Button>
          </div>

          {/* Data status */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-500 mb-2">بيانات المنشأة</div>
            <div className="flex flex-wrap gap-1">
              {[
                { label: 'هيكل', key: 'orgChart', has: hasOrgData },
                { label: 'مالية', key: 'fin', has: hasOrgData },
                { label: 'KPIs', key: 'kpi', has: hasOrgData },
                { label: 'تكاليف', key: 'cost', has: hasOrgData },
              ].map(item => (
                <span key={item.key} className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.has ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                  {item.has ? '✓' : '—'} {item.label}
                </span>
              ))}
            </div>
            {!hasOrgData && (
              <Link href="/onboarding" className="text-xs text-brand-600 hover:underline mt-1 block">
                أنشئ هيكلاً تنظيمياً أولاً ←
              </Link>
            )}
          </div>

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">لا توجد محادثات بعد</div>
            ) : conversations.map(conv => {
              const convR = conv as unknown as Record<string, unknown>;
              const topicInfo = TOPIC_LABELS[(convR.topic as string) ?? ''];
              return (
                <button key={conv.id}
                  onClick={async () => {
                    setActiveConvId(conv.id);
                    // Load messages for this conversation
                    const { data: msgs } = await supabase
                      .from('consultant_messages')
                      .select('*')
                      .eq('conversation_id', conv.id)
                      .order('created_at')
                      .limit(50);
                    setMessages((msgs ?? []) as unknown as ChatMessage[]);
                  }}
                  className={`w-full text-right p-3 rounded-xl text-xs transition-colors ${activeConvId === conv.id ? 'bg-brand-50 border border-brand-200' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {topicInfo && <span>{topicInfo.icon}</span>}
                    <span className={`font-medium truncate ${activeConvId === conv.id ? 'text-brand-700' : 'text-gray-900'}`}>
                      {(convR.title as string) ?? 'محادثة جديدة'}
                    </span>
                  </div>
                  <div className="text-gray-400 flex items-center justify-between">
                    <span>{convR.messages_count as number ?? 0} رسالة</span>
                    {(convR.status as string) === 'escalated' && <span className="text-amber-500 font-medium">تصعيد</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden">

          {/* Chat Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-brand-50 to-white">
            <div>
              <h1 className="font-bold text-gray-900">AI Business Consultant</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {activeConvId ? `يستند إلى بيانات: ${orgName}` : 'اختر موضوعاً أو ابدأ بسؤالك مباشرةً'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {Object.entries(TOPIC_LABELS).slice(0, 4).map(([key, t]) => (
                <button key={key} onClick={() => setSelectedTopic(key === selectedTopic ? '' : key)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${selectedTopic === key ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">🤖</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">مرحباً! أنا مستشار منشأتي</h2>
                <p className="text-gray-500 text-sm mb-2">لديّ وصول كامل لبيانات منشأتك</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mb-6">{DISCLAIMER_TEXT}</p>
                <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto">
                  {(SUGGESTED_QUESTIONS[selectedTopic] ?? SUGGESTED_QUESTIONS['']).map((q, i) => (
                    <button key={i} onClick={() => { setInput(q); }}
                      className="text-right text-xs bg-gray-50 hover:bg-brand-50 border border-gray-200 hover:border-brand-300 rounded-xl p-3 text-gray-700 transition-all">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : 'order-2'}`}>
                  {msg.role === 'user' ? (
                    <div className="bg-brand-500 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-sm px-5 py-4 text-sm leading-loose text-gray-900 whitespace-pre-wrap">
                        {msg.content}
                      </div>

                      {/* Confidence bar */}
                      {msg.confidence_score !== undefined && (
                        <ConfidenceBar
                          confidence={msg.confidence_score}
                          riskLevel={msg.risk_level}
                          impactLevel={msg.impact_level}
                        />
                      )}

                      {/* Data sources */}
                      {(msg.data_sources ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(msg.data_sources ?? []).map((src: string) => (
                            <span key={src} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                              {DATA_SOURCE_LABELS[src] ?? src}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Recommendations */}
                      {(msg.recommendations ?? []).length > 0 && (
                        <div className="border border-brand-200 rounded-xl p-3 bg-brand-50 space-y-2">
                          <div className="text-xs font-bold text-brand-800">💡 التوصيات</div>
                          {(msg.recommendations ?? []).map((rec, i) => {
                            const r = rec as Record<string, unknown>;
                            return (
                              <div key={i} className="bg-white rounded-lg p-3 border border-brand-100">
                                <div className="font-semibold text-gray-900 text-xs mb-1">{r.title as string}</div>
                                <div className="text-xs text-gray-600">{r.body as string}</div>
                                {r.action && <div className="text-xs text-brand-600 font-medium mt-1">← {r.action as string}</div>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Human consultant escalation */}
                      {msg.escalation_suggested && (msg.suggested_consultants ?? []).length > 0 && (
                        <div className="border-2 border-amber-300 rounded-xl p-4 bg-amber-50">
                          <div className="font-bold text-amber-800 text-sm mb-2">👨‍💼 يُنصح بمستشار بشري</div>
                          <p className="text-xs text-amber-700 mb-3">{msg.escalation_reason ?? ''}</p>
                          <div className="space-y-2">
                            {(msg.suggested_consultants ?? []).map((sc, i) => {
                              const s = sc as Record<string, unknown>;
                              return (
                                <Link key={i} href={`/consultants/${s.id}`}
                                  className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-200 hover:border-amber-400 transition-colors">
                                  <div>
                                    <div className="font-semibold text-gray-900 text-xs">{s.name as string}</div>
                                    <div className="text-xs text-gray-500">{s.specialization as string}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">{s.reason as string}</div>
                                  </div>
                                  <div className="text-right flex-shrink-0 mr-2">
                                    <div className="text-sm font-bold text-brand-600">{Number(s.price_60min_sar).toFixed(0)} ريال</div>
                                    <div className="text-xs text-gray-400">60 دقيقة</div>
                                    {Number(s.rating) > 0 && <div className="text-xs text-amber-500">⭐ {Number(s.rating).toFixed(1)}</div>}
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-1 px-1">
                    {new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4">
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs">مستشار منشأتي يفكر...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-4">
            {!globalDiscAccepted && (
              <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                ⚠️ ستظهر موافقة على إخلاء المسؤولية قبل بدء أول استشارة
              </div>
            )}
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(e: { target: { value: string } }) => setInput(e.target.value)}
                onKeyDown={(e: { key: string; shiftKey: boolean; preventDefault(): void }) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="اسألني عن منشأتك... (Enter للإرسال، Shift+Enter لسطر جديد)"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-brand-400 focus:outline-none leading-relaxed"
                rows={2}
                disabled={sending}
              />
              <Button onClick={handleSend} loading={sending} disabled={!input.trim()} className="self-end px-6">
                إرسال
              </Button>
            </div>
          </div>
        </div>
      </div>

      <DisclaimerModal
        open={showDisclaimer}
        onAccept={acceptDisclaimer}
        onClose={() => { setShowDisclaimer(false); setPendingMessage(''); }}
        topics={selectedTopic ? [selectedTopic] : []}
      />
    </DashboardLayout>
  );
}
