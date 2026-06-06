import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const org_id = new URL(request.url).searchParams.get('org_id');
    if (!org_id) return NextResponse.json({ error: 'Missing org_id' }, { status: 400 });
    const { data } = await supabase.from('loss_analyses').select('*')
      .eq('org_id', org_id).order('analysis_date', { ascending: false }).limit(10);
    return NextResponse.json({ analyses: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const body = await request.json() as Record<string, unknown>;
    const org_id           = body.org_id as string;
    const total_loss_sar   = Number(body.total_loss_sar ?? 0);
    const loss_period_months = Number(body.loss_period_months ?? 3);
    const context          = (body.context as string) ?? '';

    // Get org info + financial history
    const [{ data: org }, { data: finHistory }] = await Promise.all([
      supabase.from('organizations').select('name, primary_activity, employee_count, entity_type').eq('id', org_id).single(),
      supabase.from('financial_records').select('*').eq('org_id', org_id)
        .order('period_year', { ascending: false }).order('period_month', { ascending: false }).limit(6),
    ]);

    const orgData = org as Record<string,unknown>;

    const prompt = `أنت مستشار مالي خبير في إنقاذ الأعمال. حلل وضع هذه المنشأة بعمق:

المنشأة: ${orgData?.name} | النشاط: ${orgData?.primary_activity} | الحجم: ${orgData?.employee_count}
الخسارة الإجمالية: ${total_loss_sar.toLocaleString()} ريال على مدى ${loss_period_months} أشهر
متوسط الخسارة الشهرية: ${(total_loss_sar / loss_period_months).toLocaleString()} ريال

${context ? `معلومات إضافية من المالك: ${context}` : ''}
${finHistory?.length ? `البيانات المالية الأخيرة: ${JSON.stringify(finHistory)}` : ''}

أعد JSON فقط بهذا الهيكل الدقيق:
{
  "health_score": 35,
  "health_label": "critical",
  "loss_causes": [
    { "cause": "سبب الخسارة الرئيسي", "impact_pct": 40, "description": "تفسير مفصل", "rank": 1 },
    { "cause": "سبب ثانوي", "impact_pct": 30, "description": "تفسير", "rank": 2 },
    { "cause": "سبب ثالث", "impact_pct": 20, "description": "تفسير", "rank": 3 },
    { "cause": "سبب رابع", "impact_pct": 10, "description": "تفسير", "rank": 4 }
  ],
  "recovery_plan_30": [
    { "action": "إجراء عاجل خلال 30 يوم", "owner": "المدير التنفيذي", "priority": "high", "expected_impact": "تخفيض الخسارة 20%" },
    { "action": "إجراء ثاني", "owner": "مدير المالية", "priority": "high", "expected_impact": "تحسين التدفق النقدي" }
  ],
  "recovery_plan_90": [
    { "action": "إجراء متوسط المدى 90 يوم", "owner": "الفريق", "priority": "medium", "expected_impact": "الوصول للتعادل" }
  ],
  "recovery_plan_180": [
    { "action": "إجراء طويل المدى 180 يوم", "owner": "القيادة", "priority": "medium", "expected_impact": "تحقيق ربحية مستدامة" }
  ],
  "risk_factors": ["خطر رئيسي 1", "خطر 2", "خطر 3"],
  "recommendations": ["توصية استراتيجية 1", "توصية 2", "توصية 3"],
  "immediate_actions": ["قرار فوري يجب اتخاذه اليوم 1", "قرار فوري 2"],
  "survival_probability": "70%",
  "key_metric_to_watch": "المؤشر الرئيسي الذي يجب مراقبته"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0]?.message?.content ?? '{}') as Record<string,unknown>;

    const { data: analysis, error } = await supabase.from('loss_analyses').insert({
      org_id, total_loss_sar, loss_period_months,
      health_score:      result.health_score,
      health_label:      result.health_label,
      loss_causes:       result.loss_causes,
      recovery_plan_30:  result.recovery_plan_30,
      recovery_plan_90:  result.recovery_plan_90,
      recovery_plan_180: result.recovery_plan_180,
      risk_factors:      result.risk_factors,
      recommendations:   result.recommendations,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      analysis,
      ai_extended: {
        immediate_actions:    result.immediate_actions,
        survival_probability: result.survival_probability,
        key_metric_to_watch:  result.key_metric_to_watch,
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI/Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
