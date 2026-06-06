import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const url      = new URL(request.url);
    const org_id   = url.searchParams.get('org_id');
    const category = url.searchParams.get('category');
    if (!org_id) return NextResponse.json({ error: 'Missing org_id' }, { status: 400 });

    let q = supabase.from('ai_recommendations').select('*')
      .eq('org_id', org_id).eq('is_dismissed', false)
      .order('priority', { ascending: false }).order('created_at', { ascending: false });
    if (category) q = q.eq('category', category);

    const { data } = await q.limit(20);
    return NextResponse.json({ recommendations: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const { org_id, generation_id } = await request.json() as { org_id: string; generation_id?: string };

    // Gather org context
    const [{ data: org }, { data: gens }, { data: cost }, { data: fin }] = await Promise.all([
      supabase.from('organizations').select('*').eq('id', org_id).single(),
      supabase.from('ai_generations').select('result_data').eq('org_id', org_id)
        .eq('status', 'completed').order('created_at', { ascending: false }).limit(1),
      supabase.from('cost_models').select('*').eq('org_id', org_id).limit(1).maybeSingle(),
      supabase.from('financial_records').select('*').eq('org_id', org_id)
        .order('period_year', { ascending: false }).order('period_month', { ascending: false }).limit(3),
    ]);

    const orgData = org as Record<string, unknown>;

    const prompt = `أنت مستشار أعمال خبير. بناءً على بيانات هذه المنشأة، اقترح توصيات ذكية مع شرح سبب كل توصية:

المنشأة: ${orgData?.name} | ${orgData?.primary_activity} | ${orgData?.employee_count} موظف
الباقة: ${orgData?.subscription_plan}
لديها نظام تنظيمي AI: ${gens?.length ? 'نعم' : 'لا'}
لديها نموذج تكاليف: ${cost ? 'نعم' : 'لا'}
لديها سجلات مالية: ${(fin as unknown[])?.length ?? 0} شهر

أعد JSON فقط — 8 توصيات متنوعة:
{
  "recommendations": [
    {
      "category": "funding",
      "title_ar": "عنوان التوصية",
      "body_ar": "تفصيل التوصية وما يجب عمله",
      "reason_ar": "لماذا نوصي بهذا: السبب الحقيقي المبني على بيانات المنشأة",
      "evidence": [{"data_point": "الدليل على أهمية هذه التوصية"}],
      "priority": 9,
      "impact_label": "high",
      "effort_label": "low",
      "action_steps": ["خطوة 1", "خطوة 2", "خطوة 3"]
    }
  ]
}

الفئات المتاحة: funding, cost, financial, hr, strategy, technology, marketing, operations
الأولوية: 1-10 (10 = الأهم)
impact_label: low|medium|high|critical
effort_label: low|medium|high`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0]?.message?.content ?? '{"recommendations":[]}') as { recommendations: Record<string,unknown>[] };
    const recs   = result.recommendations ?? [];

    // Delete old non-dismissed recommendations first
    await supabase.from('ai_recommendations').delete()
      .eq('org_id', org_id).eq('is_dismissed', false);

    // Insert new ones
    if (recs.length) {
      await supabase.from('ai_recommendations').insert(
        recs.map((r: Record<string,unknown>) => ({
          org_id,
          generation_id: generation_id ?? null,
          category:     r.category,
          title_ar:     r.title_ar,
          body_ar:      r.body_ar,
          reason_ar:    r.reason_ar,
          evidence:     r.evidence ?? [],
          priority:     r.priority ?? 5,
          impact_label: r.impact_label ?? 'medium',
          effort_label: r.effort_label ?? 'medium',
          action_steps: r.action_steps ?? [],
        }))
      );
    }

    const { data: saved } = await supabase.from('ai_recommendations').select('*')
      .eq('org_id', org_id).eq('is_dismissed', false).order('priority', { ascending: false });

    return NextResponse.json({ recommendations: saved ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const { id, is_dismissed } = await request.json() as { id: string; is_dismissed: boolean };
    await supabase.from('ai_recommendations').update({ is_dismissed }).eq('id', id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
