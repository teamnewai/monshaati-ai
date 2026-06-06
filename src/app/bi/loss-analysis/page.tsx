'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import HelpTooltip from '@/components/ui/HelpTooltip';
import type { LossAnalysis, HelpDefinition } from '@/types/database';
import toast from 'react-hot-toast';

const HEALTH_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  excellent: { color: 'text-green-700',  bg: 'bg-green-50',  icon: '💚', label: 'ممتاز' },
  good:      { color: 'text-green-600',  bg: 'bg-green-50',  icon: '✅', label: 'جيد' },
  fair:      { color: 'text-blue-600',   bg: 'bg-blue-50',   icon: '📊', label: 'مقبول' },
  warning:   { color: 'text-amber-600',  bg: 'bg-amber-50',  icon: '⚠️', label: 'تحذير' },
  critical:  { color: 'text-red-700',    bg: 'bg-red-50',    icon: '🚨', label: 'حرج' },
};

export default function LossAnalysisPage() {
  const [orgId,     setOrgId]     = useState<string | null>(null);
  const [helpData,  setHelpData]  = useState<Record<string, HelpDefinition>>({});
  const [analyses,  setAnalyses]  = useState<LossAnalysis[]>([]);
  const [current,   setCurrent]   = useState<LossAnalysis | null>(null);
  const [aiExt,     setAiExt]     = useState<Record<string,unknown> | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [running,   setRunning]   = useState(false);
  const [form, setForm] = useState({ total_loss_sar: '', loss_period_months: '3', context: '' });

  const load = useCallback(async () => {
    const [oRes, hRes] = await Promise.all([fetch('/api/organizations'), fetch('/api/bi/help')]);
    if (oRes.ok) {
      const d = await oRes.json();
      const oid = d.organizations?.[0]?.id;
      setOrgId(oid);
      if (oid) {
        const aRes = await fetch(`/api/bi/loss-analysis?org_id=${oid}`);
        if (aRes.ok) { const ad = await aRes.json(); setAnalyses(ad.analyses); if (ad.analyses?.[0]) setCurrent(ad.analyses[0]); }
      }
    }
    if (hRes.ok) { const d = await hRes.json(); setHelpData(d.help ?? {}); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAnalyze = async () => {
    if (!orgId || !form.total_loss_sar) { toast.error('أدخل قيمة الخسارة'); return; }
    setRunning(true);
    const res = await fetch('/api/bi/loss-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, ...form, total_loss_sar: Number(form.total_loss_sar), loss_period_months: Number(form.loss_period_months) }),
    });
    const d = await res.json();
    if (d.analysis) { setCurrent(d.analysis); setAiExt(d.ai_extended); toast.success('تم التحليل بنجاح!'); }
    else toast.error(d.error ?? 'خطأ في التحليل');
    setRunning(false);
  };

  if (loading) return <DashboardLayout><LoadingSpinner className="py-32" size="lg" /></DashboardLayout>;

  const health = current ? HEALTH_CONFIG[current.health_label ?? 'fair'] ?? HEALTH_CONFIG.fair : null;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-0 sm:px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">تحليل الخسائر والإنقاذ 🚨</h1>
          <p className="text-gray-500 mt-1">حلل أسباب الخسارة واحصل على خطة إنقاذ 30/90/180 يوم</p>
        </div>

        <Card title="بيانات الخسارة" className="mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="text-xs font-semibold text-gray-700">إجمالي الخسارة (ريال)</label>
                <HelpTooltip fieldKey="loss_total" helpData={helpData} />
              </div>
              <input type="number" value={form.total_loss_sar}
                onChange={(e: { target: { value: string } }) => setForm(p => ({ ...p, total_loss_sar: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-right focus:ring-2 focus:ring-brand-400 focus:outline-none"
                placeholder="مثال: 50000" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="text-xs font-semibold text-gray-700">فترة الخسارة (أشهر)</label>
                <HelpTooltip fieldKey="loss_period" helpData={helpData} />
              </div>
              <input type="number" value={form.loss_period_months}
                onChange={(e: { target: { value: string } }) => setForm(p => ({ ...p, loss_period_months: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-right focus:ring-2 focus:ring-brand-400 focus:outline-none"
                placeholder="3" min="1" max="36" />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-700 block mb-1">معلومات إضافية (اختياري)</label>
            <textarea value={form.context} onChange={(e: { target: { value: string } }) => setForm(p => ({ ...p, context: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-right resize-none focus:ring-2 focus:ring-brand-400 focus:outline-none"
              rows={3} placeholder="صف سبب الخسارة أو الظروف المحيطة... مثال: انخفاض المبيعات بسبب منافس جديد" />
          </div>
          <Button className="w-full" onClick={handleAnalyze} loading={running}>
            🤖 تحليل الخسائر بالذكاء الاصطناعي
          </Button>
        </Card>

        {current && health && (
          <div className="space-y-5">
            {/* Health Score */}
            <div className={`${health.bg} border rounded-2xl p-6`}>
              <div className="flex items-center gap-4">
                <div className="text-5xl">{health.icon}</div>
                <div className="flex-1">
                  <div className={`text-lg font-bold ${health.color}`}>مؤشر الصحة المالية: {health.label}</div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 h-4 bg-white/60 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${current.health_score! >= 70 ? 'bg-green-500' : current.health_score! >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${current.health_score}%` }} />
                    </div>
                    <span className={`text-2xl font-black ${health.color}`}>{current.health_score}/100</span>
                  </div>
                </div>
              </div>
              {aiExt?.survival_probability && (
                <div className={`mt-3 text-sm font-medium ${health.color}`}>
                  📊 احتمالية النجاة: {aiExt.survival_probability as string} | المؤشر الرئيسي: {aiExt.key_metric_to_watch as string}
                </div>
              )}
            </div>

            {/* Loss causes */}
            {current.loss_causes?.length > 0 && (
              <Card title="🔍 أسباب الخسارة (مرتبة بالأثر)">
                <div className="space-y-3">
                  {current.loss_causes.map((cause, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-8 h-8 bg-red-100 text-red-700 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0">{cause.rank}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-gray-900">{cause.cause}</span>
                          <span className="text-red-600 font-bold text-sm flex-shrink-0">{cause.impact_pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full mt-1 mb-1.5">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${cause.impact_pct}%` }} />
                        </div>
                        <p className="text-xs text-gray-600">{cause.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Recovery plans */}
            {[
              { title: '⚡ خطة الإنقاذ العاجلة — 30 يوم', plan: current.recovery_plan_30, color: 'border-red-300 bg-red-50' },
              { title: '📋 خطة التعافي — 90 يوم',         plan: current.recovery_plan_90, color: 'border-amber-300 bg-amber-50' },
              { title: '🎯 خطة الاستقرار — 180 يوم',      plan: current.recovery_plan_180, color: 'border-green-300 bg-green-50' },
            ].map(({ title, plan, color }) => plan?.length > 0 && (
              <div key={title} className={`border-2 rounded-2xl p-5 ${color}`}>
                <h3 className="font-bold text-gray-900 mb-3">{title}</h3>
                <div className="space-y-2">
                  {plan.map((action, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white/70 rounded-xl p-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${action.priority === 'high' ? 'bg-red-500 text-white' : action.priority === 'medium' ? 'bg-amber-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
                        {action.priority === 'high' ? '!' : action.priority === 'medium' ? '~' : '-'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{action.action}</div>
                        <div className="text-xs text-gray-500">{action.owner} | {action.expected_impact}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {aiExt?.immediate_actions && (
              <Card title="🔴 قرارات يجب اتخاذها اليوم">
                {(aiExt.immediate_actions as string[]).map((a, i) => (
                  <div key={i} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                    <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">{i+1}</span>
                    <span className="text-sm text-gray-900">{a}</span>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
