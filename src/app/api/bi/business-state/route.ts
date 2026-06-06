import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DIMENSIONS = ['revenue','operations','team','technology','marketing','finance','compliance'] as const;

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const org_id = new URL(request.url).searchParams.get('org_id');
    if (!org_id) return NextResponse.json({ error: 'Missing org_id' }, { status: 400 });
    const { data } = await supabase.from('business_states').select('*')
      .eq('org_id', org_id).order('snapshot_date', { ascending: false }).limit(5);
    return NextResponse.json({ states: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const body   = await request.json() as Record<string, unknown>;
    const org_id = body.org_id as string;

    // Current scores (0-100) from user input
    const scores = {
      score_revenue:    Number(body.score_revenue    ?? 0),
      score_operations: Number(body.score_operations ?? 0),
      score_team:       Number(body.score_team       ?? 0),
      score_technology: Number(body.score_technology ?? 0),
      score_marketing:  Number(body.score_marketing  ?? 0),
      score_finance:    Number(body.score_finance     ?? 0),
      score_compliance: Number(body.score_compliance  ?? 0),
    };

    // Target scores (default 80)
    const targets = {
      target_revenue:    Number(body.target_revenue    ?? 80),
      target_operations: Number(body.target_operations ?? 80),
      target_team:       Number(body.target_team       ?? 80),
      target_technology: Number(body.target_technology ?? 80),
      target_marketing:  Number(body.target_marketing  ?? 80),
      target_finance:    Number(body.target_finance     ?? 80),
      target_compliance: Number(body.target_compliance  ?? 80),
    };

    const { data: org } = await supabase.from('organizations')
      .select('name, primary_activity, employee_count').eq('id', org_id).single();
    const orgData = org as Record<string,unknown>;

    const overallScore = Math.round(
      Object.values(scores).reduce((s, v) => s + v, 0) / DIMENSIONS.length
    );

    // Calculate gaps
    const gapItems = DIMENSIONS.map(dim => {
      const current = scores[`score_${dim}` as keyof typeof scores];
      const target  = targets[`target_${dim}` as keyof typeof targets];
      return { dimension: dim, current, target, gap: target - current, priority: target - current };
    }).sort((a, b) => b.gap - a.gap);

    const prompt = `أنت مستشار تطوير أعمال خبير. حلل الوضع الحالي لهذه المنشأة وضع خطة تطوير:

المنشأة: ${orgData?.name} | النشاط: ${orgData?.primary_activity} | الحجم: ${orgData?.employee_count}
الدرجة الإجمالية: ${overallScore}/100

الأبعاد الحالية vs المستهدفة:
${gapItems.map(g => `- ${g.dimension}: ${g.current}/100 (مستهدف: ${g.target}, فجوة: ${g.gap})`).join('\n')}

أعد JSON فقط:
{
  "current_desc_ar": "وصف دقيق للوضع الحالي بناءً على البيانات",
  "target_desc_ar": "وصف الوضع المستهدف بعد 12 شهر",
  "gap_analysis": [
    {
      "dimension": "revenue",
      "dimension_ar": "الإيرادات",
      "current": 40,
      "target": 80,
      "gap": 40,
      "priority": 1,
      "root_causes": ["سبب الفجوة الرئيسي"],
      "actions": ["إجراء مطلوب 1", "إجراء 2"]
    }
  ],
  "development_plan": [
    {
      "phase": "المرحلة الأولى",
      "duration": "0-3 أشهر",
      "focus": "البُعد الأكثر أثراً",
      "actions": ["خطوة تنفيذية 1", "خطوة 2", "خطوة 3"],
      "kpis": ["مؤشر قياس 1", "مؤشر 2"],
      "investment": "التكلفة التقريبية"
    },
    {
      "phase": "المرحلة الثانية",
      "duration": "3-6 أشهر",
      "focus": "البُعد الثاني",
      "actions": ["خطوة 1", "خطوة 2"],
      "kpis": ["مؤشر 1"],
      "investment": "التكلفة"
    },
    {
      "phase": "المرحلة الثالثة",
      "duration": "6-12 أشهر",
      "focus": "التوسع والنمو",
      "actions": ["خطوة 1", "خطوة 2"],
      "kpis": ["مؤشر 1"],
      "investment": "التكلفة"
    }
  ],
  "quick_wins": ["فرصة سريعة يمكن تحقيقها خلال شهر 1", "فرصة 2"],
  "strategic_advice": "نصيحة استراتيجية شاملة"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const aiResult = JSON.parse(completion.choices[0]?.message?.content ?? '{}') as Record<string,unknown>;

    const { data: state, error } = await supabase.from('business_states').insert({
      org_id,
      ...scores,
      ...targets,
      current_desc_ar:  aiResult.current_desc_ar,
      target_desc_ar:   aiResult.target_desc_ar,
      gap_analysis:     aiResult.gap_analysis,
      development_plan: aiResult.development_plan,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      state,
      overall_score: overallScore,
      ai_extended: {
        quick_wins:       aiResult.quick_wins,
        strategic_advice: aiResult.strategic_advice,
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI/Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
