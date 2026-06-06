'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import HelpTooltip from '@/components/ui/HelpTooltip';
import type { HelpDefinition } from '@/types/database';
import toast from 'react-hot-toast';

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

export default function FinancialPage() {
  const [orgId,    setOrgId]    = useState<string | null>(null);
  const [helpData, setHelpData] = useState<Record<string, HelpDefinition>>({});
  const [records,  setRecords]  = useState<Record<string, unknown>[]>([]);
  const [saving,   setSaving]   = useState(false);
  const [aiResult, setAiResult] = useState<Record<string,unknown> | null>(null);
  const now = new Date();
  const [form, setForm] = useState({
    period_year: now.getFullYear(), period_month: now.getMonth() + 1,
    revenue_sales: 0, revenue_services: 0, revenue_other: 0,
    exp_salaries: 0, exp_rent: 0, exp_marketing: 0, exp_operations: 0, exp_technology: 0, exp_other: 0,
    cash_opening: 0, cash_closing: 0, receivables: 0, payables: 0, notes: '',
  });

  const load = useCallback(async () => {
    const [oRes, hRes] = await Promise.all([fetch('/api/organizations'), fetch('/api/bi/help')]);
    if (oRes.ok) {
      const d = await oRes.json(); const oid = d.organizations?.[0]?.id; setOrgId(oid);
      if (oid) { const r = await fetch(`/api/bi/financial?org_id=${oid}`); if (r.ok) { const rd = await r.json(); setRecords(rd.records ?? []); } }
    }
    if (hRes.ok) { const d = await hRes.json(); setHelpData(d.help ?? {}); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    const res = await fetch('/api/bi/financial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, org_id: orgId, analyze: true }),
    });
    const d = await res.json();
    if (d.record) { setAiResult(d.ai); toast.success('تم الحفظ والتحليل!'); await load(); }
    else toast.error(d.error ?? 'خطأ');
    setSaving(false);
  };

  const set = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: typeof v === 'string' ? Number(v) || 0 : v }));
  const F = ({ label, fk, helpKey }: { label: string; fk: string; helpKey?: string }) => (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <label className="text-xs font-semibold text-gray-700">{label}</label>
        {helpKey && <HelpTooltip fieldKey={helpKey} helpData={helpData} />}
      </div>
      <input type="number" min="0" value={(form as Record<string,unknown>)[fk] as number || ''}
        onChange={(e: { target: { value: string } }) => set(fk, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-right focus:ring-2 focus:ring-brand-400 focus:outline-none" placeholder="0" />
    </div>
  );

  const totalRev = form.revenue_sales + form.revenue_services + form.revenue_other;
  const totalExp = form.exp_salaries + form.exp_rent + form.exp_marketing + form.exp_operations + form.exp_technology + form.exp_other;
  const netProfit = totalRev - totalExp;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-0 sm:px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">الإدارة المالية 📈</h1>
          <p className="text-gray-500 mt-1">التدفق النقدي، الربح والخسارة، التوقعات المالية</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <select value={form.period_year} onChange={(e: { target: { value: string } }) => set('period_year', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white">
            {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={form.period_month} onChange={(e: { target: { value: string } }) => set('period_month', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white">
            {MONTHS_AR.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>

        {/* Live preview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <div className="text-xl font-black text-blue-700">{totalRev.toLocaleString()}</div>
            <div className="text-xs text-blue-600">إجمالي الإيرادات</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <div className="text-xl font-black text-amber-700">{totalExp.toLocaleString()}</div>
            <div className="text-xs text-amber-600">إجمالي المصروفات</div>
          </div>
          <div className={`border rounded-xl p-3 text-center ${netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className={`text-xl font-black ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{netProfit.toLocaleString()}</div>
            <div className={`text-xs ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{netProfit >= 0 ? 'صافي الربح' : 'صافي الخسارة'}</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card title="الإيرادات">
            <div className="space-y-3">
              <F label="إيرادات المبيعات" fk="revenue_sales"    helpKey="finance_revenue_sales" />
              <F label="إيرادات الخدمات"  fk="revenue_services" helpKey="finance_revenue_services" />
              <F label="إيرادات أخرى"     fk="revenue_other" />
            </div>
          </Card>
          <Card title="المصروفات">
            <div className="space-y-3">
              <F label="الرواتب" fk="exp_salaries" />
              <F label="الإيجار" fk="exp_rent" />
              <F label="التسويق" fk="exp_marketing" />
              <F label="التشغيل" fk="exp_operations" />
              <F label="التقنية" fk="exp_technology" />
              <F label="أخرى"   fk="exp_other" />
            </div>
          </Card>
          <Card title="التدفق النقدي">
            <div className="space-y-3">
              <F label="الرصيد الافتتاحي"  fk="cash_opening" helpKey="finance_cash_opening" />
              <F label="الرصيد الختامي"    fk="cash_closing" />
              <F label="الذمم المدينة"     fk="receivables"  helpKey="finance_receivables" />
              <F label="الذمم الدائنة"     fk="payables" />
            </div>
          </Card>
          <Card title="ملاحظات">
            <textarea value={form.notes} onChange={(e: { target: { value: string } }) => setForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-right resize-none focus:ring-2 focus:ring-brand-400 focus:outline-none"
              rows={6} placeholder="ملاحظات أو أحداث خاصة هذا الشهر..." />
          </Card>
        </div>

        <Button className="w-full" size="lg" onClick={handleSave} loading={saving}>
          💾 حفظ وتحليل بالذكاء الاصطناعي
        </Button>

        {aiResult && (
          <Card title="💡 التحليل المالي من AI" className="mt-6">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold mb-3 ${
              (aiResult.health as string) === 'good' ? 'bg-green-100 text-green-700' : (aiResult.health as string) === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
            }`}>
              {(aiResult.health as string) === 'good' ? '✅' : (aiResult.health as string) === 'warning' ? '⚠️' : '🚨'} {aiResult.summary_ar as string}
            </div>
            <div className="space-y-1.5">
              {((aiResult.recommendations as string[]) ?? []).map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-brand-500 font-bold">{i+1}.</span>
                  <span className="text-gray-700">{r}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {records.length > 0 && (
          <Card title="السجلات المالية السابقة" className="mt-6">
            <div className="divide-y divide-gray-100">
              {records.slice(0,6).map((r) => {
                const rec = r as Record<string,unknown>;
                const comp = rec.computed as Record<string,number>;
                return (
                  <div key={rec.id as string} className="flex items-center justify-between py-3">
                    <div className="font-medium text-gray-900">{MONTHS_AR[(rec.period_month as number)-1]} {rec.period_year as number}</div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-blue-600">{comp.total_revenue?.toLocaleString()} إيراد</span>
                      <span className={comp.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {comp.net_profit?.toLocaleString()} {comp.net_profit >= 0 ? 'ربح' : 'خسارة'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
