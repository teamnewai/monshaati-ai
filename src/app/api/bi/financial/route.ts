import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import OpenAI from 'openai';
import type { FinancialRecord } from '@/types/database';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const url      = new URL(request.url);
    const org_id   = url.searchParams.get('org_id');
    const year     = url.searchParams.get('year');
    if (!org_id) return NextResponse.json({ error: 'Missing org_id' }, { status: 400 });

    let q = supabase.from('financial_records').select('*').eq('org_id', org_id)
      .order('period_year', { ascending: false }).order('period_month', { ascending: false });
    if (year) q = q.eq('period_year', year);

    const { data, error } = await q.limit(24);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Compute totals for each record
    const enriched = (data ?? []).map((r: Record<string,unknown>) => {
      const totalRev  = Number(r.revenue_sales) + Number(r.revenue_services) + Number(r.revenue_other);
      const totalExp  = Number(r.exp_salaries) + Number(r.exp_rent) + Number(r.exp_marketing) +
                        Number(r.exp_operations) + Number(r.exp_technology) + Number(r.exp_other);
      return {
        ...r,
        computed: {
          total_revenue: totalRev,
          total_expenses: totalExp,
          net_profit:    totalRev - totalExp,
          cash_flow:     Number(r.cash_closing) - Number(r.cash_opening),
          profit_margin: totalRev > 0 ? ((totalRev - totalExp) / totalRev) * 100 : 0,
        }
      };
    });

    return NextResponse.json({ records: enriched });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const body     = await request.json() as Record<string, unknown>;
    const org_id   = body.org_id as string;
    const analyze  = body.analyze === true;

    const record: Partial<FinancialRecord> = {
      org_id,
      period_year:     Number(body.period_year),
      period_month:    Number(body.period_month),
      revenue_sales:   Number(body.revenue_sales ?? 0),
      revenue_services: Number(body.revenue_services ?? 0),
      revenue_other:   Number(body.revenue_other ?? 0),
      exp_salaries:    Number(body.exp_salaries ?? 0),
      exp_rent:        Number(body.exp_rent ?? 0),
      exp_marketing:   Number(body.exp_marketing ?? 0),
      exp_operations:  Number(body.exp_operations ?? 0),
      exp_technology:  Number(body.exp_technology ?? 0),
      exp_other:       Number(body.exp_other ?? 0),
      cash_opening:    Number(body.cash_opening ?? 0),
      cash_closing:    Number(body.cash_closing ?? 0),
      receivables:     Number(body.receivables ?? 0),
      payables:        Number(body.payables ?? 0),
      notes:           body.notes as string ?? null,
    };

    const totalRev = record.revenue_sales! + record.revenue_services! + record.revenue_other!;
    const totalExp = record.exp_salaries! + record.exp_rent! + record.exp_marketing! +
                     record.exp_operations! + record.exp_technology! + record.exp_other!;

    let aiAnalysis: Record<string,unknown> = {};

    if (analyze) {
      // Get last 3 months for trend
      const { data: history } = await supabase.from('financial_records')
        .select('period_year,period_month,revenue_sales,revenue_services,exp_salaries,exp_rent,exp_marketing,exp_operations,exp_other')
        .eq('org_id', org_id).order('period_year', { ascending: false }).order('period_month', { ascending: false }).limit(3);

      const prompt = `أنت محلل مالي خبير. حلل هذه البيانات المالية الشهرية:

الشهر: ${record.period_month}/${record.period_year}
الإيرادات: ${totalRev.toLocaleString()} ريال
المصروفات: ${totalExp.toLocaleString()} ريال
الربح الصافي: ${(totalRev - totalExp).toLocaleString()} ريال
هامش الربح: ${totalRev > 0 ? ((totalRev - totalExp) / totalRev * 100).toFixed(1) : 0}%
التدفق النقدي: ${(record.cash_closing! - record.cash_opening!).toLocaleString()} ريال
الذمم المدينة: ${record.receivables!.toLocaleString()} ريال

التوزيع:
- رواتب: ${((record.exp_salaries! / totalExp) * 100).toFixed(0)}%
- إيجار: ${((record.exp_rent! / totalExp) * 100).toFixed(0)}%
- تسويق: ${((record.exp_marketing! / totalExp) * 100).toFixed(0)}%

${history?.length ? `البيانات السابقة: ${JSON.stringify(history)}` : ''}

أعد JSON فقط:
{
  "health": "good|fair|warning|critical",
  "summary_ar": "ملخص الوضع المالي",
  "insights": ["ملاحظة 1", "ملاحظة 2", "ملاحظة 3"],
  "warnings": ["تحذير إن وجد"],
  "recommendations": ["توصية 1", "توصية 2"],
  "forecast_next_month": {
    "expected_revenue": 0,
    "expected_expenses": 0,
    "basis": "أساس التوقع"
  },
  "expense_analysis": {
    "highest_category": "الفئة الأعلى تكلفة",
    "optimization_potential": "فرص التحسين"
  }
}`;

      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o', max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        });
        aiAnalysis = JSON.parse(completion.choices[0]?.message?.content ?? '{}') as Record<string,unknown>;
      } catch { /* optional */ }
    }

    const { data, error } = await supabase.from('financial_records')
      .upsert({ ...record, ai_analysis: aiAnalysis }, { onConflict: 'org_id,period_year,period_month' })
      .select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      record: data,
      computed: {
        total_revenue:  totalRev,
        total_expenses: totalExp,
        net_profit:     totalRev - totalExp,
        cash_flow:      record.cash_closing! - record.cash_opening!,
        profit_margin:  totalRev > 0 ? ((totalRev - totalExp) / totalRev) * 100 : 0,
      },
      ai: aiAnalysis,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
