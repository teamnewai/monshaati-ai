'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import HelpTooltip from '@/components/ui/HelpTooltip';
import type { HelpDefinition, CostAnalysis } from '@/types/database';
import toast from 'react-hot-toast';

const numFmt = (n: number) => n.toLocaleString('ar-SA', { maximumFractionDigits: 0 });

function MetricCard({ label, value, color = 'gray', hint }: { label: string; value: string; color?: string; hint?: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 border-green-200 text-green-800',
    red:   'bg-red-50 border-red-200 text-red-800',
    blue:  'bg-blue-50 border-blue-200 text-blue-800',
    gray:  'bg-gray-50 border-gray-200 text-gray-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
  };
  return (
    <div className={`border rounded-xl p-4 text-center ${colors[color] ?? colors.gray}`}>
      <div className="text-2xl font-black mb-1">{value}</div>
      <div className="text-xs font-medium">{label}</div>
      {hint && <div className="text-xs opacity-70 mt-1">{hint}</div>}
    </div>
  );
}

export default function CostPage() {
  const [orgId,     setOrgId]     = useState<string | null>(null);
  const [helpData,  setHelpData]  = useState<Record<string, HelpDefinition>>({});
  const [saving,    setSaving]    = useState(false);
  const [analysis,  setAnalysis]  = useState<CostAnalysis | null>(null);
  const [aiSugg,    setAiSugg]    = useState<Record<string,unknown> | null>(null);

  const [form, setForm] = useState({
    rent_sar: 0, salaries_sar: 0, utilities_sar: 0, insurance_sar: 0, other_fixed_sar: 0,
    cogs_pct: 0, marketing_sar: 0, shipping_sar: 0, other_var_sar: 0,
    unit_price_sar: 0, units_per_month: 0,
  });

  const load = useCallback(async () => {
    const [orgRes, helpRes] = await Promise.all([fetch('/api/organizations'), fetch('/api/bi/help')]);
    if (orgRes.ok) { const d = await orgRes.json(); setOrgId(d.organizations?.[0]?.id ?? null); }
    if (helpRes.ok) { const d = await helpRes.json(); setHelpData(d.help ?? {}); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    const res = await fetch('/api/bi/cost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, org_id: orgId }),
    });
    const d = await res.json();
    if (d.analysis) { setAnalysis(d.analysis); setAiSugg(d.ai ?? null); toast.success('تم الحفظ والتحليل!'); }
    else toast.error(d.error ?? 'خطأ');
    setSaving(false);
  };

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: Number(v) || 0 }));
  const Field = ({ label, fk, suffix = 'ريال' }: { label: string; fk: keyof typeof form; suffix?: string }) => (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <label className="text-xs font-semibold text-gray-700">{label}</label>
        <HelpTooltip fieldKey={`cost_${fk.replace('_sar','').replace('_pct','')}`} helpData={helpData} />
      </div>
      <div className="flex">
        <input type="number" min="0" value={form[fk] || ''}
          onChange={(e: { target: { value: string } }) => set(fk, e.target.value)}
          className="flex-1 px-3 py-2 rounded-r-xl border border-gray-300 text-sm text-right focus:ring-2 focus:ring-brand-400 focus:outline-none"
          placeholder="0" />
        <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl text-xs text-gray-500">{suffix}</span>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-0 sm:px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">محاسبة التكاليف 📊</h1>
          <p className="text-gray-500 mt-1">احسب تكاليفك، نقطة التعادل، وهامش الربح</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card title="التكاليف الثابتة">
            <div className="space-y-3">
              <Field label="الإيجار الشهري" fk="rent_sar" />
              <Field label="الرواتب والأجور" fk="salaries_sar" />
              <Field label="المرافق والخدمات" fk="utilities_sar" />
              <Field label="التأمين" fk="insurance_sar" />
              <Field label="تكاليف ثابتة أخرى" fk="other_fixed_sar" />
            </div>
          </Card>

          <Card title="التكاليف المتغيرة">
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="text-xs font-semibold text-gray-700">نسبة تكلفة المنتج (COGS %)</label>
                  <HelpTooltip fieldKey="cost_cogs_pct" helpData={helpData} />
                </div>
                <div className="flex">
                  <input type="number" min="0" max="100" value={form.cogs_pct || ''}
                    onChange={(e: { target: { value: string } }) => set('cogs_pct', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-r-xl border border-gray-300 text-sm text-right focus:ring-2 focus:ring-brand-400 focus:outline-none"
                    placeholder="0" />
                  <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl text-xs text-gray-500">%</span>
                </div>
              </div>
              <Field label="التسويق" fk="marketing_sar" />
              <Field label="الشحن والتوصيل" fk="shipping_sar" />
              <Field label="تكاليف متغيرة أخرى" fk="other_var_sar" />
            </div>
          </Card>
        </div>

        <Card title="نموذج الإيراد" className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="text-xs font-semibold text-gray-700">سعر بيع الوحدة</label>
                <HelpTooltip fieldKey="cost_unit_price" helpData={helpData} />
              </div>
              <div className="flex">
                <input type="number" min="0" value={form.unit_price_sar || ''}
                  onChange={(e: { target: { value: string } }) => set('unit_price_sar', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-r-xl border border-gray-300 text-sm text-right focus:ring-2 focus:ring-brand-400 focus:outline-none" placeholder="0" />
                <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl text-xs text-gray-500">ريال</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="text-xs font-semibold text-gray-700">الوحدات المباعة/شهر</label>
                <HelpTooltip fieldKey="cost_units_month" helpData={helpData} />
              </div>
              <input type="number" min="0" value={form.units_per_month || ''}
                onChange={(e: { target: { value: string } }) => set('units_per_month', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm text-right focus:ring-2 focus:ring-brand-400 focus:outline-none" placeholder="0" />
            </div>
          </div>
          <Button className="mt-4 w-full" onClick={handleSave} loading={saving}>
            🧮 احسب التكاليف وتحليل AI
          </Button>
        </Card>

        {analysis && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MetricCard label="الإيراد الشهري"     value={`${numFmt(analysis.revenue)} ريال`}         color={analysis.revenue > 0 ? 'blue' : 'gray'} />
              <MetricCard label="إجمالي التكاليف"    value={`${numFmt(analysis.total_cost)} ريال`}      color="amber" />
              <MetricCard label="الربح الصافي"        value={`${numFmt(analysis.net_profit)} ريال`}      color={analysis.net_profit >= 0 ? 'green' : 'red'} />
              <MetricCard label="هامش الربح"          value={`${analysis.profit_margin.toFixed(1)}%`}    color={analysis.profit_margin >= 20 ? 'green' : analysis.profit_margin >= 0 ? 'amber' : 'red'} />
              <MetricCard label="نقطة التعادل"        value={`${numFmt(analysis.breakeven_sar)} ريال`}   color="blue" hint={`${analysis.breakeven_units} وحدة`} />
              <MetricCard label="تكلفة الوحدة"        value={`${numFmt(analysis.unit_cost)} ريال`}       color="gray" />
              <MetricCard label="السعر المقترح (+30%)" value={`${numFmt(analysis.suggested_price)} ريال`} color="green" />
              <MetricCard label="تكلفة COGS"           value={`${numFmt(analysis.cogs_amount)} ريال`}    color="amber" />
            </div>

            {aiSugg && (
              <Card title="💡 توصيات الذكاء الاصطناعي">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold mb-3 ${
                  (aiSugg.health as string) === 'good' ? 'bg-green-100 text-green-700' :
                  (aiSugg.health as string) === 'fair' ? 'bg-blue-100 text-blue-700' :
                  (aiSugg.health as string) === 'warning' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {(aiSugg.health as string) === 'good' ? '✅ وضع مالي جيد' :
                   (aiSugg.health as string) === 'fair' ? '📊 وضع مقبول' :
                   (aiSugg.health as string) === 'warning' ? '⚠️ يحتاج تحسين' : '🚨 وضع حرج'}
                </div>
                <div className="text-sm text-gray-700 mb-3">{aiSugg.pricing_advice as string}</div>
                <div className="space-y-1.5">
                  {((aiSugg.suggestions as string[]) ?? []).map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-brand-500 font-bold flex-shrink-0">{i+1}.</span>
                      <span className="text-gray-700">{s}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
