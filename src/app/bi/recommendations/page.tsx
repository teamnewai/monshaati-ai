'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import WhyRecommendation from '@/components/ui/WhyRecommendation';
import type { AIRecommendation } from '@/types/database';
import toast from 'react-hot-toast';

const CATS = [
  { id: '',           label: 'الكل' },
  { id: 'funding',    label: '💰 تمويل' },
  { id: 'cost',       label: '📊 تكاليف' },
  { id: 'financial',  label: '📈 مالية' },
  { id: 'hr',         label: '👥 موارد بشرية' },
  { id: 'strategy',   label: '🎯 استراتيجية' },
  { id: 'marketing',  label: '📣 تسويق' },
  { id: 'technology', label: '💻 تقنية' },
  { id: 'operations', label: '⚙️ عمليات' },
];

export default function RecommendationsPage() {
  const [recs,    setRecs]    = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [gen,     setGen]     = useState(false);
  const [orgId,   setOrgId]   = useState<string | null>(null);
  const [cat,     setCat]     = useState('');

  const load = useCallback(async (orgId_: string | null = null, cat_: string = '') => {
    setLoading(true);
    const oid = orgId_ ?? orgId;
    if (!oid) { setLoading(false); return; }
    const p = new URLSearchParams({ org_id: oid });
    if (cat_) p.set('category', cat_);
    const res = await fetch(`/api/bi/recommendations?${p}`);
    if (res.ok) { const d = await res.json(); setRecs(d.recommendations ?? []); }
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    fetch('/api/organizations').then(r => r.json()).then(d => {
      const oid = d.organizations?.[0]?.id;
      setOrgId(oid);
      if (oid) load(oid, cat);
    });
  }, [load, cat]);

  const generate = async () => {
    if (!orgId) return;
    setGen(true);
    const res = await fetch('/api/bi/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId }),
    });
    const d = await res.json();
    if (d.recommendations) { setRecs(d.recommendations); toast.success(`تم توليد ${d.recommendations.length} توصية!`); }
    else toast.error(d.error ?? 'خطأ');
    setGen(false);
  };

  const dismiss = async (id: string) => {
    await fetch('/api/bi/recommendations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_dismissed: true }),
    });
    setRecs(p => p.filter(r => r.id !== id));
  };

  const filtered = cat ? recs.filter(r => r.category === cat) : recs;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">توصيات الذكاء الاصطناعي 🤖</h1>
            <p className="text-gray-500 mt-1">توصيات مخصصة لمنشأتك مع شرح السبب</p>
          </div>
          {orgId && <Button onClick={generate} loading={gen}>🔄 توليد توصيات جديدة</Button>}
        </div>

        <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
          {CATS.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                cat === c.id ? 'bg-brand-500 text-white' : 'bg-white border border-gray-200 text-gray-600'
              }`}>
              {c.label}
            </button>
          ))}
        </div>

        {loading ? <LoadingSpinner className="py-20" size="lg" /> :
         filtered.length === 0 ? (
          <EmptyState icon="🤖" title="لا توجد توصيات بعد"
            description="اضغط على 'توليد توصيات جديدة' للحصول على تحليل مخصص لمنشأتك"
            action={orgId ? { label: 'توليد التوصيات', onClick: generate } : undefined} />
        ) : (
          <div className="space-y-3">
            {filtered.map(rec => (
              <WhyRecommendation key={rec.id} recommendation={rec} onDismiss={dismiss} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
