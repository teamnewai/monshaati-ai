'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { FundingProgram } from '@/types/database';
import toast from 'react-hot-toast';

const TYPES = [
  { id: '',             label: 'الكل' },
  { id: 'government',  label: '🏛️ حكومي' },
  { id: 'accelerator', label: '🚀 مسرّع' },
  { id: 'incubator',   label: '🏠 حاضنة' },
  { id: 'vc',          label: '💼 رأس مال مخاطر' },
  { id: 'grant',       label: '🎁 منحة' },
  { id: 'loan',        label: '🏦 تمويل بنكي' },
];

interface AIRec { program_name: string; match_score: number; reason: string; steps: string[]; expected_amount_sar: number; timeline_months: number; tips: string }

export default function FundingPage() {
  const [programs,     setPrograms]     = useState<FundingProgram[]>([]);
  const [aiRecs,       setAiRecs]       = useState<AIRec[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [aiLoading,    setAiLoading]    = useState(false);
  const [type,         setType]         = useState('');
  const [orgId,        setOrgId]        = useState<string | null>(null);
  const [readiness,    setReadiness]    = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (type) p.set('type', type);
    const [pRes, oRes] = await Promise.all([
      fetch(`/api/bi/funding?${p}`),
      fetch('/api/organizations'),
    ]);
    if (pRes.ok) { const d = await pRes.json(); setPrograms(d.programs); }
    if (oRes.ok) { const d = await oRes.json(); setOrgId(d.organizations?.[0]?.id ?? null); }
    setLoading(false);
  }, [type]);

  useEffect(() => { load(); }, [load]);

  const getAiRecs = async () => {
    if (!orgId) return;
    setAiLoading(true);
    const res = await fetch('/api/bi/funding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId }),
    });
    const d = await res.json();
    if (d.recommended) { setAiRecs(d.recommended); setReadiness(d.readiness_score); }
    else toast.error(d.error ?? 'خطأ في التحليل');
    setAiLoading(false);
  };

  const TYPE_BADGE: Record<string, string> = {
    government: '🏛️', accelerator: '🚀', incubator: '🏠',
    vc: '💼', grant: '🎁', loan: '🏦', bank: '🏦',
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">التمويل والدعم 💰</h1>
          <p className="text-gray-500 mt-1">{programs.length} برنامج متاح</p>
        </div>
        {orgId && (
          <Button onClick={getAiRecs} loading={aiLoading}>
            🤖 توصيات AI لمنشأتي
          </Button>
        )}
      </div>

      {/* AI Recommendations */}
      {aiRecs.length > 0 && (
        <div className="mb-6">
          {readiness !== null && (
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-black text-brand-600">{readiness}%</div>
                <div>
                  <div className="font-semibold text-brand-800">جاهزية التمويل</div>
                  <div className="text-sm text-brand-600">مستوى جاهزية منشأتك للحصول على تمويل</div>
                </div>
              </div>
            </div>
          )}
          <h2 className="font-bold text-gray-900 mb-3">🤖 أفضل البرامج لمنشأتك</h2>
          <div className="space-y-3">
            {aiRecs.map((rec, i) => (
              <div key={i} className="bg-white border-2 border-brand-200 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-gray-900">{rec.program_name}</h3>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-black text-brand-600">{rec.match_score}%</div>
                    <div className="text-xs text-gray-400">توافق</div>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  <div className="text-xs font-bold text-amber-800 mb-1">💡 لماذا هذا البرنامج؟</div>
                  <p className="text-sm text-amber-700">{rec.reason}</p>
                </div>
                {rec.expected_amount_sar > 0 && (
                  <div className="text-sm text-gray-600 mb-2">
                    💵 المبلغ المتوقع: <span className="font-bold text-green-700">{rec.expected_amount_sar.toLocaleString()} ريال</span>
                    {' | '}⏱️ المدة التقريبية: {rec.timeline_months} أشهر
                  </div>
                )}
                <details className="text-sm text-gray-600">
                  <summary className="cursor-pointer font-medium text-brand-600 hover:underline">خطوات التقديم</summary>
                  <ol className="mt-2 space-y-1 pr-4">
                    {rec.steps.map((s, j) => <li key={j}>{j+1}. {s}</li>)}
                  </ol>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Type filter */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
        {TYPES.map(t => (
          <button key={t.id} onClick={() => setType(t.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              type === t.id ? 'bg-brand-500 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner className="py-16" size="lg" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {programs.map(p => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{TYPE_BADGE[p.type] ?? '📋'}</span>
                    <h3 className="font-bold text-gray-900 text-sm">{p.name_ar}</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{p.provider_ar}</p>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  {p.is_vision2030 && <Badge variant="success">رؤية 2030</Badge>}
                  {p.equity_required && <Badge variant="warning">حصة</Badge>}
                </div>
              </div>
              {p.description_ar && <p className="text-xs text-gray-600 line-clamp-2 mb-3">{p.description_ar}</p>}
              {p.max_funding_sar && (
                <div className="text-sm font-bold text-green-700 mb-2">
                  حتى {Number(p.max_funding_sar).toLocaleString()} ريال
                </div>
              )}
              {p.requirements_ar?.length > 0 && (
                <div className="text-xs text-gray-500 mb-2">
                  <span className="font-medium">الشروط: </span>
                  {p.requirements_ar.slice(0, 2).join(' | ')}
                </div>
              )}
              {p.website_url && (
                <a href={p.website_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-brand-600 hover:underline">الموقع الرسمي ↗</a>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
