import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import OpenAI from 'openai';
import type { CostModel, CostAnalysis } from '@/types/database';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function computeCostAnalysis(m: CostModel): CostAnalysis {
  const totalFixed    = m.rent_sar + m.salaries_sar + m.utilities_sar + m.insurance_sar + m.other_fixed_sar;
  const revenue       = m.unit_price_sar * m.units_per_month;
  const cogsAmount    = revenue * (m.cogs_pct / 100);
  const totalVariable = cogsAmount + m.marketing_sar + m.shipping_sar + m.other_var_sar;
  const totalCost     = totalFixed + totalVariable;
  const grossProfit   = revenue - cogsAmount;
  const netProfit     = revenue - totalCost;
  const profitMargin  = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const marginContrib = revenue > 0 ? (grossProfit / revenue) : 0;
  const breakevenSar  = marginContrib > 0 ? totalFixed / marginContrib : 0;
  const breakevenUnits = m.unit_price_sar > 0 ? Math.ceil(breakevenSar / m.unit_price_sar) : 0;
  const unitCost      = m.units_per_month > 0 ? totalCost / m.units_per_month : 0;
  const suggestedPrice = unitCost * 1.3; // 30% margin target

  return {
    total_fixed:    totalFixed,
    total_variable: totalVariable,
    total_cost:     totalCost,
    revenue,
    gross_profit:   grossProfit,
    net_profit:     netProfit,
    profit_margin:  profitMargin,
    breakeven_units: breakevenUnits,
    breakeven_sar:  breakevenSar,
    unit_cost:      unitCost,
    suggested_price: suggestedPrice,
    cogs_amount:    cogsAmount,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const org_id = new URL(request.url).searchParams.get('org_id');
    if (!org_id) return NextResponse.json({ error: 'Missing org_id' }, { status: 400 });

    const { data: models } = await supabase.from('cost_models').select('*')
      .eq('org_id', org_id).order('created_at', { ascending: false });

    const enriched = (models ?? []).map((m: Record<string,unknown>) => ({
      ...m,
      analysis: computeCostAnalysis(m as unknown as CostModel),
    }));

    return NextResponse.json({ models: enriched });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const body = await request.json() as Record<string, unknown>;
    const org_id = body.org_id as string;

    const { data: org } = await supabase.from('organizations')
      .select('name, primary_activity').eq('id', org_id).single();

    const modelData: Partial<CostModel> = {
      org_id,
      name:            (body.name as string) ?? 'النموذج الرئيسي',
      period:          (body.period as string) ?? 'monthly',
      rent_sar:        Number(body.rent_sar ?? 0),
      salaries_sar:    Number(body.salaries_sar ?? 0),
      utilities_sar:   Number(body.utilities_sar ?? 0),
      insurance_sar:   Number(body.insurance_sar ?? 0),
      other_fixed_sar: Number(body.other_fixed_sar ?? 0),
      cogs_pct:        Number(body.cogs_pct ?? 0),
      marketing_sar:   Number(body.marketing_sar ?? 0),
      shipping_sar:    Number(body.shipping_sar ?? 0),
      other_var_sar:   Number(body.other_var_sar ?? 0),
      unit_price_sar:  Number(body.unit_price_sar ?? 0),
      units_per_month: Number(body.units_per_month ?? 0),
    };

    const analysis = computeCostAnalysis(modelData as CostModel);

    // Get AI suggestions
    let aiSuggestions: Record<string,unknown> = {};
    try {
      const prompt = `أنت خبير تكاليف ومالية للمنشآت. حلل هذا النموذج المالي:

المنشأة: ${(org as Record<string,unknown>)?.name} | النشاط: ${(org as Record<string,unknown>)?.primary_activity}

التكاليف:
- إيجار: ${modelData.rent_sar} ريال
- رواتب: ${modelData.salaries_sar} ريال
- مرافق: ${modelData.utilities_sar} ريال
- تسويق: ${modelData.marketing_sar} ريال
- إجمالي التكاليف: ${analysis.total_cost.toFixed(0)} ريال
- الإيراد: ${analysis.revenue.toFixed(0)} ريال
- الربح الصافي: ${analysis.net_profit.toFixed(0)} ريال
- هامش الربح: ${analysis.profit_margin.toFixed(1)}%
- نقطة التعادل: ${analysis.breakeven_sar.toFixed(0)} ريال

أعد JSON فقط:
{
  "health": "good|fair|warning|critical",
  "suggestions": ["اقتراح لتخفيض التكاليف أو زيادة الربحية 1", "اقتراح 2", "اقتراح 3"],
  "pricing_advice": "نصيحة التسعير",
  "cost_reduction_tips": ["طريقة لتخفيض التكاليف 1", "طريقة 2"],
  "benchmarks": {
    "rent_pct_industry": "نسبة الإيجار المتوقعة في القطاع",
    "salary_pct_industry": "نسبة الرواتب المتوقعة"
  }
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o', max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });
      aiSuggestions = JSON.parse(completion.choices[0]?.message?.content ?? '{}') as Record<string,unknown>;
    } catch { /* AI is optional */ }

    const { data, error } = await supabase.from('cost_models')
      .upsert({ ...modelData, ai_suggestions: aiSuggestions })
      .select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      model:    data,
      analysis,
      ai:       aiSuggestions,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
