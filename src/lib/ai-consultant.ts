import OpenAI from 'openai';
import type { OrgContext, ConsultantTopicType } from '@/types/database';
import { createAdminSupabaseClient } from '@/lib/supabase-server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ----------------------------------------------------------------
// Load full org context from all data sources
// ----------------------------------------------------------------
export async function loadOrgContext(org_id: string): Promise<OrgContext> {
  const admin = await createAdminSupabaseClient();

  const [
    { data: org },
    { data: gens },
    { data: costModel },
    { data: lossAnalysis },
    { data: financials },
    { data: funding },
  ] = await Promise.all([
    admin.from('organizations').select('*').eq('id', org_id).single(),
    admin.from('ai_generations')
      .select('id, result_data, completed_at')
      .eq('org_id', org_id).eq('status', 'completed').eq('is_current', true)
      .limit(1).maybeSingle(),
    admin.from('cost_models').select('*').eq('org_id', org_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('loss_analyses').select('*').eq('org_id', org_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('financial_records').select('*').eq('org_id', org_id).order('period_year', { ascending: false }).order('period_month', { ascending: false }).limit(6),
    admin.from('funding_programs').select('name_ar, type, max_funding_sar, requirements_ar').eq('is_active', true).eq('is_vision2030', true).limit(10),
  ]);

  // Extract org chart nodes / JDs / policies / KPIs / hiring from latest generation
  let orgChart: Record<string, unknown>[] = [];
  let jds: Record<string, unknown>[] = [];
  let policies: Record<string, unknown>[] = [];
  let kpis: Record<string, unknown>[] = [];
  let hiring: Record<string, unknown>[] = [];

  const genId = (gens as Record<string, unknown> | null)?.id as string | null;
  if (genId) {
    const [{ data: nodes }, { data: jdsData }, { data: polData }, { data: kpiData }, { data: hirData }] = await Promise.all([
      admin.from('org_chart_nodes').select('title_ar, title_en, department_ar, level, head_count').eq('generation_id', genId).order('level'),
      admin.from('job_descriptions').select('title_ar, department_ar, salary_min, salary_max, currency, responsibilities, requirements').eq('generation_id', genId).limit(15),
      admin.from('policies').select('title_ar, category, content_ar').eq('generation_id', genId).limit(10),
      admin.from('kpis').select('name_ar, department_ar, target_value, unit, frequency, direction').eq('generation_id', genId).limit(20),
      admin.from('hiring_plan').select('role_ar, department_ar, priority, timeline, salary_min, salary_max, currency').eq('generation_id', genId),
    ]);
    orgChart = (nodes ?? []) as Record<string, unknown>[];
    jds      = (jdsData ?? []) as Record<string, unknown>[];
    policies = (polData ?? []) as Record<string, unknown>[];
    kpis     = (kpiData ?? []) as Record<string, unknown>[];
    hiring   = (hirData ?? []) as Record<string, unknown>[];
  }

  return {
    org:          (org ?? {}) as Record<string, unknown>,
    generation:   gens as Record<string, unknown> | null,
    orgChart,
    jds,
    policies,
    kpis,
    hiring,
    financials:   (financials ?? []) as Record<string, unknown>[],
    costModel:    costModel as Record<string, unknown> | null,
    lossAnalysis: lossAnalysis as Record<string, unknown> | null,
    funding:      (funding ?? []) as Record<string, unknown>[],
  };
}

// ----------------------------------------------------------------
// Build the system prompt with full org context
// ----------------------------------------------------------------
export function buildSystemPrompt(ctx: OrgContext): string {
  const org = ctx.org;
  const hasFinancials  = ctx.financials.length > 0;
  const hasCost        = !!ctx.costModel;
  const hasLoss        = !!ctx.lossAnalysis;
  const hasOrgChart    = ctx.orgChart.length > 0;
  const hasJDs         = ctx.jds.length > 0;
  const hasPolicies    = ctx.policies.length > 0;
  const hasKPIs        = ctx.kpis.length > 0;

  let dataSections = '';

  if (hasOrgChart) {
    dataSections += `\n\n## الهيكل التنظيمي الحالي (${ctx.orgChart.length} وحدة):\n`;
    dataSections += ctx.orgChart.slice(0, 20).map(n =>
      `- المستوى ${n.level}: ${n.title_ar} | قسم: ${n.department_ar ?? '—'} | عدد: ${n.head_count}`
    ).join('\n');
  }

  if (hasJDs) {
    dataSections += `\n\n## الأوصاف الوظيفية (${ctx.jds.length} منصب):\n`;
    dataSections += ctx.jds.slice(0, 10).map(j =>
      `- ${j.title_ar} (${j.department_ar ?? '—'}) | راتب: ${j.salary_min ?? '—'}–${j.salary_max ?? '—'} ${j.currency ?? 'SAR'}`
    ).join('\n');
  }

  if (hasPolicies) {
    dataSections += `\n\n## السياسات الحالية:\n`;
    dataSections += ctx.policies.map(p => `- ${p.title_ar} [${p.category}]`).join('\n');
  }

  if (hasKPIs) {
    dataSections += `\n\n## مؤشرات الأداء (${ctx.kpis.length} مؤشر):\n`;
    dataSections += ctx.kpis.slice(0, 15).map(k =>
      `- ${k.name_ar} | هدف: ${k.target_value} ${k.unit ?? ''} | قسم: ${k.department_ar ?? '—'}`
    ).join('\n');
  }

  if (hasFinancials) {
    const latest = ctx.financials[0] as Record<string, unknown>;
    const totalRev = Number(latest.revenue_sales ?? 0) + Number(latest.revenue_services ?? 0) + Number(latest.revenue_other ?? 0);
    const totalExp = Number(latest.exp_salaries ?? 0) + Number(latest.exp_rent ?? 0) + Number(latest.exp_marketing ?? 0) + Number(latest.exp_operations ?? 0) + Number(latest.exp_technology ?? 0) + Number(latest.exp_other ?? 0);
    dataSections += `\n\n## البيانات المالية (آخر ${ctx.financials.length} أشهر):\n`;
    dataSections += `- آخر شهر مسجل: ${latest.period_month}/${latest.period_year}\n`;
    dataSections += `- الإيرادات: ${totalRev.toLocaleString()} ريال\n`;
    dataSections += `- المصروفات: ${totalExp.toLocaleString()} ريال\n`;
    dataSections += `- الربح/الخسارة: ${(totalRev - totalExp).toLocaleString()} ريال\n`;
    dataSections += `- هامش الربح: ${totalRev > 0 ? ((totalRev - totalExp) / totalRev * 100).toFixed(1) : 0}%`;
  }

  if (hasCost) {
    const c = ctx.costModel as Record<string, unknown>;
    dataSections += `\n\n## تحليل التكاليف:\n`;
    dataSections += `- الرواتب: ${c.salaries_sar} ريال/شهر\n`;
    dataSections += `- الإيجار: ${c.rent_sar} ريال/شهر\n`;
    dataSections += `- سعر الوحدة: ${c.unit_price_sar} ريال\n`;
    dataSections += `- الوحدات/شهر: ${c.units_per_month}`;
  }

  if (hasLoss) {
    const l = ctx.lossAnalysis as Record<string, unknown>;
    dataSections += `\n\n## تحليل الخسائر:\n`;
    dataSections += `- الخسارة الإجمالية: ${l.total_loss_sar} ريال\n`;
    dataSections += `- مؤشر الصحة: ${l.health_score}/100 (${l.health_label})\n`;
    const causes = (l.loss_causes as Record<string,unknown>[] | null) ?? [];
    if (causes.length) dataSections += `- أبرز أسباب الخسارة: ${causes.slice(0,3).map((c: Record<string,unknown>) => c.cause).join('، ')}`;
  }

  if (ctx.funding.length > 0) {
    dataSections += `\n\n## برامج التمويل المتاحة:\n`;
    dataSections += ctx.funding.slice(0, 5).map(f =>
      `- ${f.name_ar} (${f.type}) | حتى ${f.max_funding_sar ? Number(f.max_funding_sar).toLocaleString() + ' ريال' : 'غير محدد'}`
    ).join('\n');
  }

  return `أنت مستشار أعمال ذكي متخصص في الشركات السعودية والخليجية. اسمك "مستشار منشأتي".

## معلومات المنشأة التي تستشيرها:
- الاسم: ${org.name ?? '—'}
- النوع: ${org.entity_type ?? '—'}
- النشاط: ${org.primary_activity ?? '—'}
- الحجم: ${org.employee_count ?? '—'} موظف
- الموقع: ${org.city ?? '—'}, ${org.country ?? '—'}
- باقة الاشتراك: ${org.subscription_plan ?? 'free_trial'}
${dataSections}

## قواعد عملك:
1. أجب دائماً بناءً على البيانات الفعلية أعلاه — لا تخمن.
2. إذا لم تكن هناك بيانات كافية، اطلب من المستخدم إدخالها أولاً.
3. لكل توصية، حدد: مستوى الثقة (0-100)، مستوى المخاطر، مستوى التأثير.
4. إذا كان السؤال يتجاوز قدرتك أو يحتاج خبرة بشرية، اقترح مستشاراً بشرياً مناسباً.
5. أضف إخلاء مسؤولية للموضوعات المالية والقانونية والاستثمارية.
6. ردودك باللغة العربية الفصيحة المبسطة.

## استجب دائماً بـ JSON بهذا الهيكل:
{
  "content": "الرد النصي المفصل للمستشار",
  "confidence_score": 85,
  "risk_level": "low|medium|high|critical",
  "impact_level": "low|medium|high|critical",
  "data_sources": ["org_chart","financials","kpis"],
  "recommendations": [
    { "title": "عنوان التوصية", "body": "التفاصيل", "priority": 1, "action": "الإجراء المقترح" }
  ],
  "escalation_suggested": false,
  "escalation_reason": null,
  "suggested_consultants": [],
  "requires_disclaimer": false,
  "disclaimer_topics": []
}`;
}

// ----------------------------------------------------------------
// Detect topic from user message
// ----------------------------------------------------------------
export function detectTopic(message: string): ConsultantTopicType {
  const lower = message.toLowerCase();
  if (/مال|ميزانية|إيراد|خسار|ربح|تكلف|تمويل|استثمار/.test(message)) return 'financial';
  if (/توظيف|موظف|راتب|إجازة|أداء|كفاءة|hr|موارد بشري/.test(message)) return 'hr';
  if (/هيكل|تنظيم|قسم|إدارة|صلاحية/.test(message)) return 'restructuring';
  if (/نمو|توسع|سوق|عملاء|مبيعات/.test(message)) return 'growth';
  if (/تشغيل|عملية|إجراء|workflow|sop/.test(message)) return 'operational';
  if (/استراتيج|خطة|رؤية|هدف/.test(message)) return 'strategic';
  if (/تمويل|قرض|منحة|مستثمر/.test(message)) return 'funding';
  return 'administrative';
}

// ----------------------------------------------------------------
// Requires disclaimer check
// ----------------------------------------------------------------
export function requiresDisclaimer(topic: ConsultantTopicType, content: string): boolean {
  const financialTopics: ConsultantTopicType[] = ['financial', 'funding'];
  const financialKeywords = /استثمار|قرض|ضمان|عقد|قانون|ضريبة|زكاة|تمويل|أسهم|ملكية|شراء|بيع/;
  return financialTopics.includes(topic) || financialKeywords.test(content);
}

// ----------------------------------------------------------------
// Main AI chat function
// ----------------------------------------------------------------
export async function runAIConsultant(params: {
  messages:       { role: 'user' | 'assistant'; content: string }[];
  systemPrompt:   string;
  topic:          ConsultantTopicType;
}): Promise<{
  content:              string;
  confidence_score:     number;
  risk_level:           string;
  impact_level:         string;
  data_sources:         string[];
  recommendations:      Record<string, unknown>[];
  escalation_suggested: boolean;
  escalation_reason:    string | null;
  suggested_consultants: Record<string, unknown>[];
  requires_disclaimer:  boolean;
  disclaimer_topics:    string[];
  input_tokens:         number;
  output_tokens:        number;
}> {
  const completion = await openai.chat.completions.create({
    model:    'gpt-4o',
    messages: [
      { role: 'system', content: params.systemPrompt },
      ...params.messages,
    ],
    response_format: { type: 'json_object' },
    max_tokens: 2000,
    temperature: 0.5,
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    parsed = { content: raw, confidence_score: 70, risk_level: 'medium', impact_level: 'medium', data_sources: [], recommendations: [], escalation_suggested: false, escalation_reason: null, suggested_consultants: [], requires_disclaimer: false, disclaimer_topics: [] };
  }

  return {
    content:              (parsed.content as string) ?? '',
    confidence_score:     Number(parsed.confidence_score ?? 70),
    risk_level:           (parsed.risk_level as string) ?? 'medium',
    impact_level:         (parsed.impact_level as string) ?? 'medium',
    data_sources:         (parsed.data_sources as string[]) ?? [],
    recommendations:      (parsed.recommendations as Record<string, unknown>[]) ?? [],
    escalation_suggested: Boolean(parsed.escalation_suggested),
    escalation_reason:    (parsed.escalation_reason as string | null) ?? null,
    suggested_consultants: (parsed.suggested_consultants as Record<string, unknown>[]) ?? [],
    requires_disclaimer:  Boolean(parsed.requires_disclaimer),
    disclaimer_topics:    (parsed.disclaimer_topics as string[]) ?? [],
    input_tokens:         completion.usage?.prompt_tokens ?? 0,
    output_tokens:        completion.usage?.completion_tokens ?? 0,
  };
}
