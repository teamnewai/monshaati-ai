import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const url = new URL(request.url);
    const specialization = url.searchParams.get('specialization');
    const country  = url.searchParams.get('country');
    const search   = url.searchParams.get('q');
    const featured = url.searchParams.get('featured') === 'true';
    const page     = Number(url.searchParams.get('page') ?? '1');
    const limit    = 12;

    let q = supabase.from('consultant_profiles')
      .select('*, profiles(full_name, email)', { count: 'exact' })
      .eq('status', 'active')
      .order('is_featured', { ascending: false })
      .order('avg_rating', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (specialization) q = q.contains('specializations', [specialization]);
    if (country)        q = q.eq('country', country);
    if (featured)       q = q.eq('is_featured', true);
    if (search)         q = q.ilike('display_name', `%${search}%`);

    const { data, error, count } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ consultants: data ?? [], total: count ?? 0, page, limit });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();
    const body = await request.json() as Record<string, unknown>;
    const { data, error } = await supabase.from('consultant_profiles').insert({
      ...body, user_id: user.id, status: 'pending',
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ consultant: data }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
