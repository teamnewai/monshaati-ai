'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import HelpTooltip from '@/components/ui/HelpTooltip';
import type { HelpDefinition, BusinessState } from '@/types/database';
import toast from 'react-hot-toast';

const DIMENSIONS = [
  { key: 'revenue',    label: 'الإيرادات',    icon: '💰', helpKey: 'state_score_revenue' },
  { key: 'operations', label: 'العمليات',     icon: '⚙️', helpKey: null },
  { key: 'team',       label: 'الفريق',       icon: '👥', helpKey: 'state_score_team' },
  { key: 'technology', label: 'التقنية',      icon: '💻', helpKey: null },
  { key: 'marketing',  label: 'التسويق',      icon: '📣', helpKey: 'state_score_marketing' },
  { key: 'finance',    label: 'المالية',      icon: '📊', helpKey: null },
  { key: 'compliance', label: 'الامتثال',     icon: '⚖️', helpKey: null },
];

export default function BusinessStatePage() {
  const [orgId,    setOrgId]    = useState<string | null>(null);
  const [helpData, setHelpData] = useState<Record<string, HelpDefinition>>({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [result,   setResult]   = useState<{ state: BusinessState; overall_score: number; ai_extended: Record<string,unknown> } | null>(null);
  const [scores,   setScores]   = useState<Record<string, number>>({
    revenue: 40, operations: 50, team: 45, technology: 35, marketing: 30, finance: 40, compliance: 60,
  });

  const load = useCallback(async () => {
    const [oRes, hRes] = await Promise.all([fetch('/api/organizations'), fetch('/api/bi/help')]);
    if (oRes.ok) { const d = await oRes.json(); setOrgId(d.organizations?.[0]?.id ?? null); }
    if (hRes.ok) { const d = await hRes.json(); setHelpData(d.help ?? {}); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAnalyze = async () => {
    if (!orgId) return;
    setSaving(true);
    const payload: Record<string, unknown> = { org_id: orgId };
    DIMENSIONS.forEach(d => { payload[`score_${d.key}`] = scores[d.key] ?? 50; payload[`target_${d.key}`] = 80; });
    const res = await fetch('/api/bi/business-state', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.state) { setResult(data); toast.success('تم التحليل بنجاح!'); }
    else toast.error(data.error ?? 'خطأ');
    setSaving(false);
  };

  const overallScore = Math.round(Object.values(scores).reduce((s, v) => s + v, 0) / DIMENSIONS.length);

  if (loading) return <DashboardLayout><LoadingSpinner className="py-32" size="lg" /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-0 sm:px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">تحليل الوضع الحالي 🎯</h1>
          <p className="text-gray-500 mt-1">قيّم وضعك الحالي، حدد الفجوات، واحصل على خطة تطوير</p>
        </div>

        <Card title="التقييم الذاتي للمنشأة" className="mb-6">
          <div className="mb-4 text-center">
            <div className="text-4xl font-black text-brand-600">{overallScore}</div>
            <div className="text-sm text-gray-500">الدرجة الإجمالية / 100</div>
            <div className="mt-2 max-w-sm mx-auto h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${overallScore >= 70 ? 'bg-green-500' : overallScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${overallScore}%` }} />
            </div>
          </div>

          <div className="space-y-4">
            {DIMENSIONS.map(dim => (
              <div key={dim.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span>{dim.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{dim.label}</span>
                    {dim.helpKey && <HelpTooltip fieldKey={dim.helpKey} helpData={helpData} />}
                  </div>
                  <span className="text-sm font-bold text-gray-900 w-10 text-left">{scores[dim.key]}</span>
                </div>
                <input type="range" min="0" max="100" value={scores[dim.key] ?? 50}
                  onChange={(e: { target: { value: string } }) => setScores(p => ({ ...p, [dim.key]: Number(e.target.value) }))}
                  className="w-full accent-brand-500" />
                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                  <span>ضعيف (0)</span><span>متوسط (50)</span><span>ممتاز (100)</span>
                </div>
              </div>
            ))}
          </div>

          <Button className="w-full mt-6" size="lg" onClick={handleAnalyze} loading={saving}>
            🤖 تحليل الفجوات ووضع خطة التطوير
          </Button>
        </Card>

        {result && (
          <>
            {result.state.current_desc_ar && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                  <div className="text-sm font-bold text-gray-700 mb-2">📍 الوضع الحالي</div>
                  <p className="text-sm text-gray-700">{result.state.current_desc_ar}</p>
                </div>
                <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5">
                  <div className="text-sm font-bold text-brand-700 mb-2">🎯 الوضع المستهدف</div>
                  <p className="text-sm text-brand-700">{result.state.target_desc_ar}</p>
                </div>
              </div>
            )}

            {result.state.gap_analysis?.length > 0 && (
              <Card title="📊 تحليل الفجوة" className="mb-6">
                <div className="space-y-3">
                  {result.state.gap_analysis.slice(0, 5).map((g, i) => (
                    <div key={i} className={`p-4 rounded-xl ${g.gap > 40 ? 'bg-red-50 border border-red-200' : g.gap > 20 ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">{g.dimension_ar ?? g.dimension}</span>
                        <span className={`text-sm font-bold ${g.gap > 40 ? 'text-red-600' : g.gap > 20 ? 'text-amber-600' : 'text-gray-600'}`}>
                          {g.current} → {g.target} (فجوة {g.gap})
                        </span>
                      </div>
                      {g.actions?.length > 0 && (
                        <div className="text-xs text-gray-600 space-y-0.5">
                          {g.actions.map((a: string, j: number) => <div key={j}>• {a}</div>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {result.state.development_plan?.length > 0 && (
              <Card title="🗺️ خطة التطوير">
                <div className="space-y-4">
                  {result.state.development_plan.map((phase, i) => (
                    <div key={i} className="border-r-4 border-brand-400 pr-4">
                      <div className="font-bold text-gray-900">{phase.phase} ({phase.duration})</div>
                      <div className="text-sm text-brand-600 mb-2">التركيز: {phase.focus}</div>
                      <div className="text-xs text-gray-600 space-y-0.5">
                        {phase.actions?.map((a: string, j: number) => <div key={j}>✓ {a}</div>)}
                      </div>
                      {phase.investment && (
                        <div className="text-xs text-gray-400 mt-1">💰 التكلفة: {phase.investment}</div>
                      )}
                    </div>
                  ))}
                </div>
                {Array.isArray(result.ai_extended?.quick_wins) && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="font-semibold text-gray-900 text-sm mb-2">⚡ فرص سريعة (خلال شهر)</div>
                    {(result.ai_extended?.quick_wins as string[]).map((w: string, i: number) => (
                      <div key={i} className="text-sm text-green-700">✅ {w}</div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
