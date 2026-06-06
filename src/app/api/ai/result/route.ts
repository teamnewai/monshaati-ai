import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const [
      { data: generation, error: genErr },
      { data: nodes },
      { data: jds },
      { data: policies },
      { data: kpis },
      { data: hiring },
    ] = await Promise.all([
      supabase.from('ai_generations').select('*').eq('id', id).single(),
      supabase.from('org_chart_nodes').select('*').eq('generation_id', id)
        .order('level').order('position_order'),
      supabase.from('job_descriptions').select('*').eq('generation_id', id)
        .order('department_ar').order('title_ar'),
      supabase.from('policies').select('*').eq('generation_id', id).order('category'),
      supabase.from('kpis').select('*').eq('generation_id', id).order('department_ar'),
      supabase.from('hiring_plan').select('*').eq('generation_id', id)
        .order('phase_order').order('priority'),
    ]);

    if (genErr || !generation) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    return NextResponse.json({ generation, nodes, jds, policies, kpis, hiring });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
