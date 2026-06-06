import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const url   = new URL(request.url);
    const type  = url.searchParams.get('type');
    const country = url.searchParams.get('country') ?? 'SA';

    let q = supabase.from('funding_programs').select('*').eq('is_active', true)
      .order('is_vision2030', { ascending: false }).order('max_funding_sar', { ascending: false });

    if (type && type !== 'all') q = q.eq('type', type);
    if (country !== 'ALL') q = q.eq('country', country);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ programs: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const { org_id }   = await request.json() as { org_id: string };

    const { data: org } = await supabase.from('organizations')
      .select('name, entity_type, primary_activity, employee_count, country, city')
      .eq('id', org_id).single();

    const orgData = org as Record<string,unknown>;
    const { data: allPrograms } = await supabase.from('funding_programs')
      .select('id, name_ar, type, max_funding_sar, equity_required').eq('is_active', true);

    const prompt = `أنت خبير تمويل. حلل هذه المنشأة وأوصِ بأفضل برامج التمويل المناسبة:

المنشأة: ${orgData?.name} | النشاط: ${orgData?.primary_activity} | الحجم: ${orgData?.employee_count}
الموقع: ${orgData?.city}, ${orgData?.country}

البرامج المتاحة:
${(allPrograms ?? []).map((p: Record<string,unknown>, i: number) => `${i+1}. ${p.name_ar} (${p.type}) - ${p.max_funding_sar ? Number(p.max_funding_sar).toLocaleString() + ' ريال' : 'غير محدد'}`).join('\n')}

أعد JSON فقط:
{
  "recommended": [
    {
      "program_name": "اسم البرنامج بالضبط",
      "match_score": 85,
      "reason": "سبب التوصية المفصل بناءً على خصائص المنشأة",
      "steps": ["خطوة تقديم 1", "خطوة 2", "خطوة 3"],
      "expected_amount_sar": 500000,
      "timeline_months": 3,
      "tips": "نصيحة خاصة لزيادة فرص القبول"
    }
  ],
  "readiness_score": 70,
  "readiness_notes": "ما يجب تحسينه لزيادة فرص الحصول على تمويل",
  "alternative_funding": "مصادر تمويل بديلة لم تُذكر في القائمة"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0]?.message?.content ?? '{}') as Record<string,unknown>;
    return NextResponse.json({ ...result, org_id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
