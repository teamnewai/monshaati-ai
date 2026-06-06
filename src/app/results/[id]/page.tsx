'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import OrgChartView from '@/components/org-chart/OrgChartView';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { exportToPDF, exportToWord } from '@/lib/export';
import type {
  AIGeneration, OrgChartNode, JobDescription,
  Policy, KPI, HiringItem, ExportData,
} from '@/types/database';
import toast from 'react-hot-toast';

type Tab = 'org_chart' | 'job_desc' | 'policies' | 'kpis' | 'hiring';

interface ResultData {
  generation: AIGeneration;
  nodes:       OrgChartNode[];
  jds:         JobDescription[];
  policies:    Policy[];
  kpis:        KPI[];
  hiring:      HiringItem[];
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'org_chart',  label: 'الهيكل التنظيمي',  icon: '🏗️' },
  { id: 'job_desc',   label: 'الأوصاف الوظيفية', icon: '📋' },
  { id: 'policies',   label: 'السياسات',          icon: '📜' },
  { id: 'kpis',       label: 'مؤشرات الأداء',     icon: '📊' },
  { id: 'hiring',     label: 'خطة التوظيف',       icon: '👥' },
];

const PRIORITY_CLASSES: Record<string, string> = {
  high:   'bg-red-100 text-red-800 border border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  low:    'bg-green-100 text-green-800 border border-green-200',
};

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('org_chart');
  const [expandedJD, setExpandedJD] = useState<string | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingDoc, setExportingDoc] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    fetch(`/api/ai/result?id=${id}`)
      .then(r => {
        if (!r.ok) { router.push('/dashboard'); return null; }
        return r.json();
      })
      .then(json => {
        if (json) setData(json as ResultData);
        setLoading(false);
      })
      .catch(() => { setLoading(false); router.push('/dashboard'); });
  }, [id, router]);

  const buildExportData = (): ExportData => ({
    orgName:         data!.generation.input_data.org_name,
    primaryActivity: data!.generation.input_data.primary_activity,
    employeeCount:   data!.generation.input_data.employee_count,
    country:         data!.generation.input_data.country,
    city:            data!.generation.input_data.city,
    nodes:           data!.nodes,
    jds:             data!.jds,
    policies:        data!.policies,
    kpis:            data!.kpis,
    hiring:          data!.hiring,
  });

  const handleExportPDF = async () => {
    if (!data) return;
    setExportingPDF(true);
    try {
      await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generation_id: id, org_id: data.generation.org_id, format: 'pdf' }),
      });
      await exportToPDF(buildExportData());
      toast.success('تم تصدير PDF بنجاح');
    } catch {
      toast.error('فشل تصدير PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportWord = async () => {
    if (!data) return;
    setExportingDoc(true);
    try {
      await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generation_id: id, org_id: data.generation.org_id, format: 'docx' }),
      });
      exportToWord(buildExportData());
      toast.success('تم التصدير بنجاح');
    } catch {
      toast.error('فشل التصدير');
    } finally {
      setExportingDoc(false);
    }
  };

  if (loading) return <DashboardLayout><LoadingSpinner className="py-32" size="lg" /></DashboardLayout>;
  if (!data)   return null;

  const { generation, nodes, jds, policies, kpis, hiring } = data;
  const input = generation.input_data;

  // Group helpers
  const jdsByDept = jds.reduce<Record<string, JobDescription[]>>((acc, jd) => {
    const key = jd.department_ar || 'عام';
    if (!acc[key]) acc[key] = [];
    acc[key].push(jd);
    return acc;
  }, {});

  const policiesByCat = policies.reduce<Record<string, Policy[]>>((acc, p) => {
    const key = p.category || 'عام';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const kpisByDept = kpis.reduce<Record<string, KPI[]>>((acc, k) => {
    const key = k.department_ar || 'عام';
    if (!acc[key]) acc[key] = [];
    acc[key].push(k);
    return acc;
  }, {});

  const hiringByPhase = hiring
    .slice()
    .sort((a, b) => (a.phase_order || 1) - (b.phase_order || 1))
    .reduce<Record<string, HiringItem[]>>((acc, h) => {
      const key = h.phase || 'غير محدد';
      if (!acc[key]) acc[key] = [];
      acc[key].push(h);
      return acc;
    }, {});

  return (
    <DashboardLayout>
      {/* ── Header ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{input.org_name}</h1>
              <Badge variant="success">✅ مكتمل</Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
              <span>💼 {input.primary_activity}</span>
              <span>👥 {input.employee_count} موظف</span>
              <span>📍 {input.city}، {input.country}</span>
              {generation.total_tokens && (
                <span>🤖 {generation.total_tokens.toLocaleString()} token</span>
              )}
              {generation.generation_time_ms && (
                <span>⚡ {(generation.generation_time_ms / 1000).toFixed(1)}s</span>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleExportPDF} loading={exportingPDF}>
              📄 PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportWord} loading={exportingDoc}>
              📝 Word
            </Button>
            <Button variant="secondary" size="sm" onClick={() => router.push('/dashboard')}>
              ← الرئيسية
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5 pt-5 border-t border-gray-100">
          {[
            { v: nodes.length,    l: 'دور' },
            { v: jds.length,      l: 'وصف وظيفي' },
            { v: policies.length, l: 'سياسة' },
            { v: kpis.length,     l: 'مؤشر أداء' },
            { v: hiring.length,   l: 'موظف مطلوب' },
          ].map((s, i) => (
            <div key={i} className="text-center bg-gray-50 rounded-xl py-3">
              <div className="text-xl font-bold text-gray-900">{s.v}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────── */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {TABS.map(tab => {
            const count = tab.id === 'org_chart' ? nodes.length
              : tab.id === 'job_desc'  ? jds.length
              : tab.id === 'policies'  ? policies.length
              : tab.id === 'kpis'      ? kpis.length
              : hiring.length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2
                  ${activeTab === tab.id ? 'tab-active' : 'tab-inactive'}`}
              >
                <span>{tab.icon}</span>
                {tab.label}
                <span className="bg-gray-100 text-gray-600 rounded-full text-xs px-2 py-0.5">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────── */}
      <div className="animate-fade-in">

        {/* ORG CHART */}
        {activeTab === 'org_chart' && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">الهيكل التنظيمي</h2>
              <span className="text-sm text-gray-400">
                {nodes.length} دور | {new Set(nodes.map(n => n.level)).size} مستويات
              </span>
            </div>
            <OrgChartView nodes={nodes} />
          </div>
        )}

        {/* JOB DESCRIPTIONS */}
        {activeTab === 'job_desc' && (
          <div className="space-y-4">
            {Object.entries(jdsByDept).map(([dept, deptJds]) => (
              <div key={dept} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-700 text-sm">{dept}</h3>
                  <span className="text-xs text-gray-400">{deptJds.length} دور</span>
                </div>
                {deptJds.map(jd => (
                  <div key={jd.id}>
                    <button
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-right"
                      onClick={() => setExpandedJD(expandedJD === jd.id ? null : jd.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0">
                          {jd.title_ar?.[0] ?? '؟'}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">{jd.title_ar}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{jd.title_en}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {jd.salary_min && (
                          <span className="text-sm text-gray-500 hidden md:block">
                            {jd.salary_min.toLocaleString()}–{jd.salary_max?.toLocaleString()} {jd.currency}
                          </span>
                        )}
                        <span className="text-gray-400 text-lg">{expandedJD === jd.id ? '▲' : '▼'}</span>
                      </div>
                    </button>
                    {expandedJD === jd.id && (
                      <div className="px-6 pb-6 border-t border-gray-100">
                        {jd.summary_ar && (
                          <div className="mt-4 p-4 bg-brand-50 rounded-xl">
                            <p className="text-sm text-brand-800 leading-relaxed">{jd.summary_ar}</p>
                          </div>
                        )}
                        <div className="grid md:grid-cols-2 gap-6 mt-4">
                          {(
                            [
                              { title: 'المهام والمسؤوليات', items: jd.responsibilities },
                              { title: 'المتطلبات',           items: jd.requirements },
                              { title: 'الكفاءات',            items: jd.competencies },
                              { title: 'الصلاحيات',           items: jd.authorities },
                            ] as const
                          ).map(section =>
                            section.items?.length ? (
                              <div key={section.title}>
                                <h4 className="font-bold text-gray-700 mb-3 text-sm">{section.title}</h4>
                                <ul className="space-y-1.5">
                                  {section.items.map((item, i) => (
                                    <li key={i} className="text-sm text-gray-600 flex gap-2">
                                      <span className="text-brand-500 mt-0.5 flex-shrink-0">•</span>
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null
                          )}
                        </div>
                        <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500 flex-wrap">
                          {jd.experience_years && <span>🕒 {jd.experience_years}</span>}
                          {jd.education_level  && <span>🎓 {jd.education_level}</span>}
                          {jd.reports_to_ar    && <span>⬆️ يرفع لـ: {jd.reports_to_ar}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* POLICIES */}
        {activeTab === 'policies' && (
          <div className="space-y-4">
            {Object.entries(policiesByCat).map(([category, catPolicies]) => (
              <div key={category} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                  <h3 className="font-bold text-gray-700 text-sm">{category}</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {catPolicies.map(policy => (
                    <div key={policy.id} className="px-6 py-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{policy.title_ar}</h4>
                        {policy.title_en && (
                          <span className="text-xs text-gray-400 mr-2 flex-shrink-0">{policy.title_en}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                        {policy.content_ar}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* KPIs */}
        {activeTab === 'kpis' && (
          <div className="space-y-4">
            {Object.entries(kpisByDept).map(([dept, deptKpis]) => (
              <div key={dept} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-700 text-sm">{dept}</h3>
                  <span className="text-xs text-gray-400">{deptKpis.length} مؤشر</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {deptKpis.map(kpi => (
                    <div key={kpi.id} className="px-6 py-4 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm">{kpi.name_ar}</div>
                        {kpi.name_en && (
                          <div className="text-xs text-gray-400 mt-0.5">{kpi.name_en}</div>
                        )}
                        {kpi.description_ar && (
                          <div className="text-xs text-gray-500 mt-1">{kpi.description_ar}</div>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                          {kpi.frequency && <span>📅 {kpi.frequency}</span>}
                          {kpi.category  && <span>📁 {kpi.category}</span>}
                          {kpi.direction && (
                            <span>{kpi.direction === 'increase' ? '📈' : '📉'} {kpi.direction}</span>
                          )}
                        </div>
                      </div>
                      {kpi.target_value != null && (
                        <div className="text-center mr-4 flex-shrink-0">
                          <div className="text-lg font-bold text-brand-600">
                            {kpi.target_value.toLocaleString()}{kpi.unit ?? ''}
                          </div>
                          <div className="text-xs text-gray-400">الهدف</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HIRING PLAN */}
        {activeTab === 'hiring' && (
          <div className="space-y-6">
            {Object.entries(hiringByPhase).map(([phase, items]) => (
              <div key={phase} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-700">{phase}</h3>
                  <span className="text-xs text-gray-400">{items.length} دور</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {items.map(item => (
                    <div key={item.id} className="px-6 py-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-semibold text-gray-900">{item.role_ar}</div>
                          {item.role_en && (
                            <div className="text-xs text-gray-400">{item.role_en}</div>
                          )}
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0
                          ${PRIORITY_CLASSES[item.priority] ?? PRIORITY_CLASSES.medium}`}>
                          {item.priority === 'high' ? 'عاجل' : item.priority === 'low' ? 'منخفض' : 'متوسط'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                        {item.department_ar && <span>🏢 {item.department_ar}</span>}
                        {item.timeline      && <span>📅 {item.timeline}</span>}
                        {item.salary_min    && (
                          <span>💰 {item.salary_min.toLocaleString()}–{item.salary_max?.toLocaleString()} {item.currency}</span>
                        )}
                      </div>
                      {item.requirements.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.requirements.map((req, i) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-1">
                              {req}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
